import { describe, expect, it } from "vitest";
import {
  COLUMN_CSS_PX,
  ENCODINGS,
  fitWithin,
  halve,
  LOGO_ACCEPT,
  LOGO_MAX_EDGE,
  LOGO_MESSAGES,
  longestEdge,
  looksLikeMarkup,
  MAX_MARKUP_BYTES,
  MAX_SOURCE_BYTES,
  MIN_LOGO_EDGE,
  shrinkToward,
  SOFT_RESULT_MESSAGE,
} from "./policy.js";

describe("the constants §6.5 and §6.8 fix", () => {
  it("sizes the raster at 3× the 400 px column", () => {
    expect(COLUMN_CSS_PX).toBe(400);
    expect(LOGO_MAX_EDGE).toBe(1200);
  });

  it("offers exactly PNG and JPEG, and never WebP or AVIF", () => {
    // Safari cannot encode WebP on any platform and the canvas fallback is silent (§6.5).
    // AVIF has no cross-browser canvas encode at all.
    expect([...ENCODINGS]).toEqual(["image/png", "image/jpeg"]);
  });

  it("accepts an explicit list rather than image/*", () => {
    expect(LOGO_ACCEPT).not.toContain("image/*");
    for (const type of ["image/png", "image/jpeg", "image/svg+xml"]) {
      expect(LOGO_ACCEPT).toContain(type);
    }
    expect(LOGO_ACCEPT).not.toMatch(/webp|avif|heic|heif/i);
    // No file extensions: on iOS an accept list carrying them has been reported to disable
    // the Photo Library option, which on a phone-first product is the picker (§11 item 1).
    expect(LOGO_ACCEPT).not.toMatch(/\.(png|jpe?g|svg)/i);
  });

  it("holds a markup source to a much tighter limit than a photograph", () => {
    expect(MAX_MARKUP_BYTES).toBeLessThan(MAX_SOURCE_BYTES);
  });
});

describe("what the owner is shown", () => {
  const everything = [SOFT_RESULT_MESSAGE, ...Object.values(LOGO_MESSAGES)];

  it("never mentions compression, kilobytes or a percentage", () => {
    for (const message of everything) {
      expect(message).not.toMatch(/compress/i);
      expect(message).not.toMatch(/\bkb\b|kilobyte|megabyte|\bmb\b/i);
      expect(message).not.toMatch(/%|percent/i);
      expect(message).not.toMatch(/\d/);
    }
  });

  it("frames a soft result as a photo, not as a setting", () => {
    expect(SOFT_RESULT_MESSAGE).toContain("Photos don't shrink as well as logos do");
    expect(SOFT_RESULT_MESSAGE).not.toMatch(/quality|resolution|pixel|format|jpeg|png/i);
  });

  it("tells someone whose file we cannot read what to ask for", () => {
    expect(LOGO_MESSAGES.undecodable).toContain("PNG, JPG or SVG");
    expect(LOGO_MESSAGES.undecodable).toContain("designer or sign-maker");
  });
});

describe("fitWithin", () => {
  it("bounds the longest edge and keeps the aspect ratio", () => {
    expect(fitWithin({ width: 4000, height: 1000 }, 1200)).toEqual({ width: 1200, height: 300 });
    expect(fitWithin({ width: 1000, height: 4000 }, 1200)).toEqual({ width: 300, height: 1200 });
  });

  it("leaves a source that already fits alone", () => {
    expect(fitWithin({ width: 240, height: 80 }, 1200)).toEqual({ width: 240, height: 80 });
  });

  it("enlarges only when asked — which is only ever for a vector source", () => {
    expect(fitWithin({ width: 300, height: 150 }, 1200, true)).toEqual({
      width: 1200,
      height: 600,
    });
  });

  it("never rounds an edge away to nothing", () => {
    expect(fitWithin({ width: 5000, height: 2 }, 1200)).toEqual({ width: 1200, height: 1 });
  });

  it("has an answer for a size that is not one", () => {
    expect(fitWithin({ width: 0, height: 0 }, 1200)).toEqual({ width: 0, height: 0 });
  });
});

describe("the budget loop's arithmetic", () => {
  it("aims at the budget in one step rather than walking down", () => {
    // Bytes track pixel count, so a 4× overshoot wants roughly half the edge.
    const next = shrinkToward({ width: 1200, height: 1200 }, 100, 400);
    expect(longestEdge(next)).toBe(600);
  });

  it("always makes progress, however small the overshoot", () => {
    const next = shrinkToward({ width: 1200, height: 600 }, 100, 101);
    expect(longestEdge(next)).toBeLessThan(1200);
    expect(next.height / next.width).toBeCloseTo(0.5, 5);
  });

  it("never collapses the image in one step, however large the overshoot", () => {
    expect(longestEdge(shrinkToward({ width: 1200, height: 1200 }, 1, 10_000_000))).toBe(600);
  });

  it("stops at one raster pixel per CSS pixel across the column", () => {
    expect(MIN_LOGO_EDGE).toBe(COLUMN_CSS_PX);
    expect(longestEdge(shrinkToward({ width: 420, height: 420 }, 1, 1e9))).toBe(MIN_LOGO_EDGE);
    expect(longestEdge(halve({ width: 500, height: 500 }))).toBe(MIN_LOGO_EDGE);
  });
});

describe("looksLikeMarkup", () => {
  it("recognises the ways an SVG file starts", () => {
    for (const head of [
      '<svg xmlns="http://www.w3.org/2000/svg">',
      '<?xml version="1.0"?><svg>',
      "\n  <SVG>",
      "﻿<?xml version='1.0'?>",
      "<!-- Generator: Adobe Illustrator --><svg>",
      "<!DOCTYPE svg PUBLIC>",
    ]) {
      expect(looksLikeMarkup(head)).toBe(true);
    }
  });

  it("does not see markup in binary image data", () => {
    expect(looksLikeMarkup("\x89PNG\r\n\x1a\n")).toBe(false);
    expect(looksLikeMarkup("\xff\xd8\xff\xe0\x00\x10JFIF")).toBe(false);
    expect(looksLikeMarkup("")).toBe(false);
  });
});
