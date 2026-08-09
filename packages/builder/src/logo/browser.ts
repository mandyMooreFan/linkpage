import type { DecodedImage, ImageCodec, RenderedImage } from "./intake.js";
import type { Encoding, Size } from "./policy.js";
import type { Raster } from "./analyse.js";

/**
 * The browser half of the pipeline: `<img>`, `<canvas>`, and nothing else.
 *
 * **Deliberately the thinnest module in the package, because it is the only one a headless
 * test cannot reach.** Every decision lives above it in `intake.ts` and `policy.ts`; what is
 * here is four DOM calls and the two checks that DOM call cannot be trusted without.
 *
 * **Why `<img>` and not `createImageBitmap`.** An `<img>` fed an SVG places it in the
 * browser's **secure static mode**, where script and external references are forbidden by the
 * spec and enforced by the engine rather than by a sanitiser of ours (§6.5). That is the
 * property the whole rasterise-don't-embed decision rests on, and it is a property of this
 * element. `createImageBitmap` is also not universally available for SVG sources.
 *
 * **Why `blob.type` is checked.** Canvas encoding fails *silently*: `toBlob` with a type the
 * browser cannot write invokes the callback with a **PNG**, no error raised. Safari cannot
 * write WebP on any platform, so a pipeline that trusted the request would produce files
 * mislabelled on exactly the devices this product is built around. Nothing here asks for
 * WebP — but the check is what makes that a fact about the code rather than a claim about it.
 */

/** A `Blob` as a `data:` URI. */
function toDataUri(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("logo: could not read the encoded image"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("logo: could not read the encoded"));
    reader.readAsDataURL(blob);
  });
}

/** `canvas.toBlob`, promised. Resolves `null` the way the callback does. */
function toBlob(canvas: HTMLCanvasElement, type: Encoding, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

class CanvasImage implements RenderedImage {
  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly context: CanvasRenderingContext2D,
  ) {}

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  pixels(): Raster {
    return this.context.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  async encode(type: Encoding, quality: number): Promise<string> {
    const blob = await toBlob(this.canvas, type, quality);
    if (blob === null) throw new Error("logo: the canvas produced nothing");
    // The silent fallback. A browser that cannot write `type` hands back a PNG and says
    // nothing, so the only evidence is what it labelled the result.
    if (blob.type !== type) {
      throw new Error(`logo: asked for ${type} and the browser wrote ${blob.type || "nothing"}`);
    }
    const uri = await toDataUri(blob);
    if (!uri.startsWith(`data:${type};base64,`)) {
      throw new Error(`logo: encoded as ${uri.slice(0, 32)}`);
    }
    return uri;
  }

  release(): void {
    // Free the backing store on the engines that keep it alive with the element.
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
}

class ElementImage implements DecodedImage {
  constructor(
    private readonly image: HTMLImageElement,
    private readonly objectUrl: string,
  ) {}

  get width(): number {
    return this.image.naturalWidth;
  }

  get height(): number {
    return this.image.naturalHeight;
  }

  async render(size: Size, smooth: boolean): Promise<RenderedImage> {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    // `willReadFrequently` because every render is read back once for the blank check, and
    // without it the engines that keep the canvas on the GPU pay a full readback stall.
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (context === null) throw new Error("logo: no 2d context");
    context.imageSmoothingEnabled = smooth;
    if (smooth) context.imageSmoothingQuality = "high";
    // Never throws for an oversized source: iOS leaves the canvas transparent and returns
    // normally, which is why `intake.ts` looks at the pixels rather than trusting this call.
    context.drawImage(this.image, 0, 0, size.width, size.height);
    return new CanvasImage(canvas, context);
  }

  release(): void {
    this.image.removeAttribute("src");
    URL.revokeObjectURL(this.objectUrl);
  }
}

/**
 * The real codec.
 *
 * `decode` rejects on anything the engine will not read — which is the only test of "can we
 * read this file" that does not depend on a media type or an extension telling the truth.
 */
export function browserImageCodec(): ImageCodec {
  return {
    decode(source: Blob): Promise<DecodedImage> {
      const objectUrl = URL.createObjectURL(source);
      const image = new Image();
      return new Promise<DecodedImage>((resolve, reject) => {
        image.onload = () => {
          if (image.naturalWidth < 1 || image.naturalHeight < 1) {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("logo: decoded to nothing"));
            return;
          }
          resolve(new ElementImage(image, objectUrl));
        };
        image.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          reject(new Error("logo: the browser could not decode this file"));
        };
        // A blob: URL is same-origin, so the canvas is never tainted and `toBlob` never
        // throws a security error. `crossOrigin` would be meaningless here.
        image.src = objectUrl;
      });
    },
  };
}
