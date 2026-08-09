import { describe, expect, it } from "vitest";
import type { Raster } from "./analyse.js";
import { applyIntake, clearLogo } from "./apply.js";
import { importLogo, type DecodedImage, type ImageCodec, type RenderedImage } from "./intake.js";
import {
  LOGO_MAX_EDGE,
  LOGO_MESSAGES,
  MIN_LOGO_EDGE,
  SOFT_RESULT_MESSAGE,
  type Encoding,
  type Size,
} from "./policy.js";
import { createProjectStore, emptyDraft, type Draft, type StorageLike } from "../project/index.js";

// ---------------------------------------------------------------------------
// A browser that does what the test says
// ---------------------------------------------------------------------------

type Pixel = [r: number, g: number, b: number, a: number];
type Painter = (x: number, y: number, width: number, height: number) => Pixel;

/** Flat art: a handful of inks and the greys an antialiaser leaves between them. */
const wordmark: Painter = (x, y) => {
  const edge = (x * 7 + y * 3) % 29;
  if (edge === 0) return [128, 128, 128, 255];
  return x % 5 < 2 ? [17, 17, 17, 255] : [255, 255, 255, 255];
};

/** The same, drawn on transparency the way a logo file arrives. */
const wordmarkOnTransparency: Painter = (x, y, w, h) => {
  if (y < h / 4 || y > (h * 3) / 4) return [0, 0, 0, 0];
  return wordmark(x, y, w, h);
};

/** Photographic content: every pixel its own colour. */
const photograph: Painter = (x, y) => {
  const n = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, 255];
};

/** A photograph behind a soft-edged mask — photographic content that must not lose its alpha. */
const photographWithAlpha: Painter = (x, y, w, h) => {
  const [r, g, b] = photograph(x, y, w, h);
  return [r, g, b, x < w / 8 ? 40 : 255];
};

interface FakeOptions {
  width: number;
  height: number;
  paint?: Painter;
  /** The length of the `data:` URI a render of this many pixels encodes to. */
  bytes?: (pixels: number) => number;
  /** Longest edge above which the canvas comes back empty — the iOS ceiling (§11 item 5). */
  blankAbove?: number;
  /** Encodings this browser can actually write. Asking for another one throws, as the adapter does. */
  writable?: Encoding[];
  decodeDelayMs?: number;
  failDecode?: boolean;
}

interface Fake {
  codec: ImageCodec;
  decodes: number;
  renders: Size[];
  encodes: Encoding[];
  released: number;
}

function fake(options: FakeOptions): Fake {
  const paint = options.paint ?? wordmark;
  const bytes = options.bytes ?? ((pixels) => 40 + Math.round(pixels / 20));
  const writable = options.writable ?? ["image/png", "image/jpeg"];
  const record: Fake = { codec: { decode }, decodes: 0, renders: [], encodes: [], released: 0 };

  function pixels(size: Size, blank: boolean): Raster {
    const data = new Uint8ClampedArray(size.width * size.height * 4);
    if (!blank) {
      for (let y = 0; y < size.height; y += 1) {
        for (let x = 0; x < size.width; x += 1) {
          const [r, g, b, a] = paint(x, y, size.width, size.height);
          const at = (y * size.width + x) * 4;
          data[at] = r;
          data[at + 1] = g;
          data[at + 2] = b;
          data[at + 3] = a;
        }
      }
    }
    return { width: size.width, height: size.height, data };
  }

  function decode(): Promise<DecodedImage> {
    record.decodes += 1;
    const image: DecodedImage = {
      width: options.width,
      height: options.height,
      render(size) {
        record.renders.push(size);
        const blank =
          options.blankAbove !== undefined &&
          Math.max(size.width, size.height) > options.blankAbove;
        const rendered: RenderedImage = {
          width: size.width,
          height: size.height,
          pixels: () => pixels(size, blank),
          encode(type) {
            record.encodes.push(type);
            if (!writable.includes(type)) {
              // Exactly what `browser.ts` does when `blob.type` comes back as something
              // other than what was asked for.
              return Promise.reject(new Error(`asked for ${type}, got image/png`));
            }
            const length = bytes(size.width * size.height);
            return Promise.resolve(`data:${type};base64,${"A".repeat(Math.max(1, length))}`);
          },
          release: () => void (record.released += 1),
        };
        return Promise.resolve(rendered);
      },
      release: () => void (record.released += 1),
    };
    if (options.failDecode) return Promise.reject(new Error("no"));
    if (options.decodeDelayMs === undefined) return Promise.resolve(image);
    return new Promise((resolve) => setTimeout(() => resolve(image), options.decodeDelayMs));
  }

  return record;
}

const png = (size = 64) => new Blob([new Uint8Array(size)], { type: "image/png" });
const svg = (padding = 0) =>
  new Blob([`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2 1"/>${" ".repeat(padding)}`], {
    type: "image/svg+xml",
  });

function longest(logo: { width: number; height: number }): number {
  return Math.max(logo.width, logo.height);
}

// ---------------------------------------------------------------------------

describe("choosing the encoding from the content", () => {
  it("sends flat art to PNG", async () => {
    const codec = fake({ width: 2000, height: 500, paint: wordmark });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.encoding).toBe("image/png");
  });

  it("sends a photograph to JPEG", async () => {
    const codec = fake({ width: 2000, height: 1500, paint: photograph });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.encoding).toBe("image/jpeg");
  });

  it("keeps a transparent logo on PNG", async () => {
    const codec = fake({ width: 1600, height: 400, paint: wordmarkOnTransparency });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.encoding).toBe("image/png");
  });

  it("never sacrifices alpha, even for photographic content", async () => {
    // JPEG has no alpha and there is no background to composite onto: the page has a light
    // and a dark mode, so whichever were baked in would be wrong half the time (§6.5).
    const codec = fake({ width: 2000, height: 1500, paint: photographWithAlpha });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.encoding).toBe("image/png");
  });

  it("asks for nothing but PNG and JPEG, whatever it is handed", async () => {
    for (const paint of [wordmark, photograph, wordmarkOnTransparency, photographWithAlpha]) {
      const codec = fake({ width: 1800, height: 900, paint, bytes: (p) => p });
      await importLogo(png(), codec.codec);
      expect(codec.encodes.every((type) => type === "image/png" || type === "image/jpeg")).toBe(
        true,
      );
    }
  });

  it("decides on content and not on what the file claims to be", async () => {
    const codec = fake({ width: 2000, height: 1500, paint: photograph });
    const lying = new Blob([new Uint8Array(64)], { type: "application/octet-stream" });
    const result = await importLogo(lying, codec.codec);
    expect(result.ok && result.encoding).toBe("image/jpeg");
  });
});

describe("dimension", () => {
  it("bounds the longest edge at 3× the column and keeps the shape", async () => {
    const codec = fake({ width: 4000, height: 1000 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.logo).toMatchObject({ width: LOGO_MAX_EDGE, height: 300 });
  });

  it("does not enlarge a small raster", async () => {
    const codec = fake({ width: 240, height: 80 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.logo).toMatchObject({ width: 240, height: 80 });
  });

  it("rasterises a vector source at the constant, however small the engine sized it", async () => {
    // An SVG with no width or height is assigned an arbitrary intrinsic size; storing the
    // logo at that size would throw away the one advantage the format has.
    const codec = fake({ width: 300, height: 150 });
    const result = await importLogo(svg(), codec.codec);
    expect(result.ok && result.logo).toMatchObject({ width: LOGO_MAX_EDGE, height: 600 });
  });

  it("stores the dimensions it drew, so the export can emit width and height", async () => {
    const codec = fake({ width: 900, height: 600 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.logo).toMatchObject({ width: 900, height: 600 });
    expect(result.ok && result.logo.src.startsWith("data:image/png;base64,")).toBe(true);
  });
});

describe("the budget, enforced by dimension", () => {
  it("says nothing when the result fits, which is the common case", async () => {
    const codec = fake({ width: 3000, height: 3000 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.notice).toBeNull();
    expect(result.ok && longest(result.logo)).toBe(LOGO_MAX_EDGE);
  });

  it("shrinks rather than dropping quality or changing format", async () => {
    const codec = fake({ width: 4000, height: 3000, paint: photograph, bytes: (p) => p * 2 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.encoding).toBe("image/jpeg");
    expect(longest(result.logo)).toBeLessThan(LOGO_MAX_EDGE);
    expect(longest(result.logo)).toBeGreaterThanOrEqual(MIN_LOGO_EDGE);
    expect(result.logo.width / result.logo.height).toBeCloseTo(4 / 3, 2);
  });

  it("speaks only then, and in the photo-not-a-logo framing", async () => {
    const codec = fake({ width: 4000, height: 3000, paint: photograph, bytes: (p) => p * 2 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok && result.notice).toBe(SOFT_RESULT_MESSAGE);
  });

  it("is a budget and not a gate: an image that will not fit still ships", async () => {
    // Refusing would strand an owner from their own page (§6.4).
    // An encoder whose output never gets smaller — the loop must stop, not spin.
    const codec = fake({ width: 4000, height: 3000, bytes: () => 200_000 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok).toBe(true);
    expect(result.ok && longest(result.logo)).toBe(MIN_LOGO_EDGE);
  });
});

describe("guards on what arrives", () => {
  it("refuses a source too large to hand to the browser, without handing it over", async () => {
    const codec = fake({ width: 100, height: 100 });
    const result = await importLogo(png(4096), codec.codec, { maxSourceBytes: 1024 });
    expect(result).toMatchObject({
      ok: false,
      reason: "too-large",
      message: LOGO_MESSAGES["too-large"],
    });
    expect(codec.decodes).toBe(0);
  });

  it("holds a markup source to its own, much tighter limit", async () => {
    // Secure static mode stops scripts; it does not stop a deeply nested document from
    // hanging the tab, and bytes understate that cost badly for markup (§6.5).
    const codec = fake({ width: 300, height: 150 });
    const big = svg(4096);
    expect(await importLogo(big, codec.codec, { maxMarkupBytes: 512 })).toMatchObject({
      ok: false,
      reason: "too-large",
    });
    expect(codec.decodes).toBe(0);
    expect((await importLogo(big, codec.codec)).ok).toBe(true);
  });

  it("fails a file the decoder will not read, in §6.5's words", async () => {
    const codec = fake({ width: 10, height: 10, failDecode: true });
    expect(await importLogo(png(), codec.codec)).toEqual({
      ok: false,
      reason: "undecodable",
      message: LOGO_MESSAGES.undecodable,
    });
  });

  it("fails a decode that never finishes, rather than spinning", async () => {
    const codec = fake({ width: 10, height: 10, decodeDelayMs: 200 });
    const result = await importLogo(png(), codec.codec, { decodeTimeoutMs: 5 });
    expect(result).toMatchObject({ ok: false, reason: "undecodable" });
  });

  it("fails an encoder that will not write what it was asked for", async () => {
    // The silent fallback: a browser that cannot write the type hands back a PNG and says
    // nothing. Storing that would ship a file mislabelled in the data URI itself (§6.5).
    const codec = fake({ width: 2000, height: 1500, paint: photograph, writable: ["image/png"] });
    expect(await importLogo(png(), codec.codec)).toMatchObject({
      ok: false,
      reason: "undecodable",
    });
  });
});

describe("a decode that fails without saying so", () => {
  it("does not store a blank logo", async () => {
    const codec = fake({ width: 2000, height: 2000, blankAbove: 0 });
    expect(await importLogo(png(), codec.codec)).toMatchObject({
      ok: false,
      reason: "undecodable",
    });
  });

  it("shrinks past a canvas-area ceiling rather than giving up", async () => {
    // iOS returns a fully transparent canvas and no error once an image is too large to
    // draw (§11 item 5). The sample is tiny and survives; the full-size draw does not.
    const codec = fake({ width: 4000, height: 1000, blankAbove: 700 });
    const result = await importLogo(png(), codec.codec);
    expect(result.ok).toBe(true);
    expect(result.ok && longest(result.logo)).toBe(600);
    expect(result.ok && result.notice).toBe(SOFT_RESULT_MESSAGE);
  });

  it("gives up if nothing can be drawn at any size", async () => {
    const codec = fake({ width: 4000, height: 1000, blankAbove: 100 });
    expect(await importLogo(png(), codec.codec)).toMatchObject({
      ok: false,
      reason: "undecodable",
    });
  });
});

describe("the seam with the store", () => {
  const existing = { src: "data:image/png;base64,AAAA", width: 800, height: 200 };

  function draftWithLogo(): Draft {
    const draft = emptyDraft("en");
    return { ...draft, header: { ...draft.header, name: "Ada's Bakery", logo: existing } };
  }

  it("replaces the logo when the upload worked", async () => {
    const codec = fake({ width: 1200, height: 400 });
    const result = await importLogo(png(), codec.codec);
    expect(applyIntake(draftWithLogo(), result).header.logo).toMatchObject({ width: 1200 });
  });

  it("a failed input never damages what is already there", async () => {
    const entries = new Map<string, string>();
    const storage: StorageLike = {
      getItem: (key) => entries.get(key) ?? null,
      setItem: (key, value) => void entries.set(key, value),
      removeItem: (key) => void entries.delete(key),
    };
    const store = createProjectStore({ storage, key: "logo-test" });
    const withLogo = draftWithLogo();
    store.update(withLogo);

    const codec = fake({ width: 10, height: 10, failDecode: true });
    const result = await importLogo(png(), codec.codec);
    store.update(applyIntake(store.snapshot().draft ?? withLogo, result));

    expect(store.snapshot().draft?.header.logo).toEqual(existing);
    expect(JSON.parse(store.text() ?? "{}").header.logo).toEqual(existing);
  });

  it("removing a logo is a different intention from a failed upload", () => {
    expect(clearLogo(draftWithLogo()).header.logo).toBeNull();
  });
});
