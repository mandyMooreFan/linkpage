import { describe, expect, it } from "vitest";
import {
  analyse,
  countDistinctColours,
  hasMeaningfulAlpha,
  isBlank,
  PHOTOGRAPHIC_COLOURS,
  SAMPLE_EDGE,
  type Raster,
} from "./analyse.js";

type Pixel = [r: number, g: number, b: number, a: number];
type Painter = (x: number, y: number, width: number, height: number) => Pixel;

function raster(width: number, height: number, paint: Painter): Raster {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = paint(x, y, width, height);
      const at = (y * width + x) * 4;
      data[at] = r;
      data[at + 1] = g;
      data[at + 2] = b;
      data[at + 3] = a;
    }
  }
  return { width, height, data };
}

/** A wordmark's worth of colour: ink, paper, and the greys the antialiaser leaves between. */
const wordmark: Painter = (x, y) => {
  const edge = (x * 7 + y * 3) % 29;
  if (edge === 0) return [128, 128, 128, 255];
  if (edge === 1) return [64, 64, 64, 255];
  return x % 5 < 2 ? [17, 17, 17, 255] : [255, 255, 255, 255];
};

/**
 * Photographic content: a deterministic hash, which is the hardest possible case for a
 * histogram and therefore the right shape for the far end of the scale.
 */
const noise: Painter = (x, y) => {
  const h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  return [(h >>> 24) & 255, (h >>> 16) & 255, (h >>> 8) & 255, 255];
};

describe("isBlank", () => {
  it("is true for a canvas nothing was drawn into", () => {
    expect(isBlank(raster(16, 16, () => [0, 0, 0, 0]))).toBe(true);
  });

  it("is true for a raster with no pixels", () => {
    expect(isBlank({ width: 0, height: 0, data: new Uint8ClampedArray(0) })).toBe(true);
  });

  it("is false as soon as one pixel is visible", () => {
    const almostEmpty = raster(16, 16, (x, y) =>
      x === 9 && y === 4 ? [0, 0, 0, 255] : [0, 0, 0, 0],
    );
    expect(isBlank(almostEmpty)).toBe(false);
  });

  it("does not mistake black for absent", () => {
    expect(isBlank(raster(8, 8, () => [0, 0, 0, 255]))).toBe(false);
  });
});

describe("hasMeaningfulAlpha", () => {
  it("is false for a fully opaque image", () => {
    expect(hasMeaningfulAlpha(raster(32, 32, noise))).toBe(false);
  });

  it("is true for a single soft pixel, because the mistakes are not symmetrical", () => {
    const oneSoftPixel = raster(32, 32, (x, y) =>
      x === 0 && y === 0 ? [10, 10, 10, 200] : [10, 10, 10, 255],
    );
    expect(hasMeaningfulAlpha(oneSoftPixel)).toBe(true);
  });

  it("tolerates a resampler landing just short of 255", () => {
    expect(hasMeaningfulAlpha(raster(32, 32, () => [10, 10, 10, 253]))).toBe(false);
  });

  it("sees the transparent ground a logo is drawn on", () => {
    const onTransparency = raster(32, 32, (x, y, w, h) =>
      x > w / 4 && x < (w * 3) / 4 && y > h / 4 && y < (h * 3) / 4
        ? [0, 90, 200, 255]
        : [0, 0, 0, 0],
    );
    expect(hasMeaningfulAlpha(onTransparency)).toBe(true);
  });
});

describe("countDistinctColours", () => {
  it("counts a flat two-colour image as two", () => {
    expect(
      countDistinctColours(raster(32, 32, (x) => (x < 16 ? [0, 0, 0, 255] : [255, 255, 255, 255]))),
    ).toBe(2);
  });

  it("does not quantise: a channel drifting by one is a colour", () => {
    // Counter-intuitive and measured — quantising separates the two classes worse, not
    // better (§11 item 2). What keeps a drifting flat colour from reading as a photograph is
    // the size of the margin, not a bucket.
    const drifting = raster(32, 32, (x, y) => [200 + ((x + y) % 3), 100, 50, 255]);
    expect(countDistinctColours(drifting)).toBe(3);
  });

  it("ignores what is behind a transparent pixel", () => {
    // A canvas leaves arbitrary colour under alpha 0; counting it would add one to every
    // image with a transparent margin.
    const margin = raster(32, 32, (x, y, w) => (x < w / 2 ? [255, 0, 0, 0] : [0, 0, 255, 255]));
    expect(countDistinctColours(margin)).toBe(1);
  });

  it("finds thousands in a photograph and tens in a wordmark", () => {
    expect(countDistinctColours(raster(SAMPLE_EDGE, SAMPLE_EDGE, noise))).toBeGreaterThan(3000);
    expect(countDistinctColours(raster(SAMPLE_EDGE, SAMPLE_EDGE, wordmark))).toBeLessThan(20);
  });
});

describe("analyse", () => {
  it("calls a wordmark flat", () => {
    const result = analyse(raster(SAMPLE_EDGE, SAMPLE_EDGE, wordmark));
    expect(result).toMatchObject({ blank: false, alpha: false, content: "flat" });
  });

  it("calls a photograph photographic", () => {
    const result = analyse(raster(SAMPLE_EDGE, SAMPLE_EDGE, noise));
    expect(result).toMatchObject({ blank: false, alpha: false, content: "photographic" });
  });

  it("asks nothing else of a blank raster", () => {
    expect(analyse(raster(SAMPLE_EDGE, SAMPLE_EDGE, () => [0, 0, 0, 0]))).toEqual({
      blank: true,
      alpha: false,
      colours: 0,
      content: "flat",
    });
  });

  it("keeps a logo with a gradient in it on the flat side of the line", () => {
    // There is no gap between the two classes to put a threshold in the middle of (§11 item
    // 2) — what there is, is a wide margin on the case that matters. This is that margin.
    const gradient = raster(SAMPLE_EDGE, SAMPLE_EDGE, (x, y, w, h) =>
      y > h / 2 ? [17, 17, 17, 255] : [Math.round((x / w) * 255), 64, 200, 255],
    );
    expect(countDistinctColours(gradient)).toBeLessThan(PHOTOGRAPHIC_COLOURS);
    expect(analyse(gradient).content).toBe("flat");
  });
});
