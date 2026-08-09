import { describe, expect, it } from "vitest";
import { asArray, asEnum, asPositiveInt, asRecord, asText } from "./values.js";

/**
 * These five functions are the whole of the renderer's runtime tolerance (SPEC.md §4.7), so
 * they are tested against the values a hand-edited `project.json` can actually hold: anything
 * `JSON.parse` produces, plus `undefined`.
 */

/** An object with a throwing `toString`: the canary for accidental coercion. */
const hostile = {
  toString() {
    throw new Error("hostile toString");
  },
};

describe("asRecord", () => {
  it("accepts a plain object, including a null-prototype one", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    const bare = Object.assign(Object.create(null) as object, { a: 1 });
    expect(asRecord(bare)).toBe(bare);
  });

  it("rejects everything that is not one", () => {
    for (const value of [undefined, null, [], "x", 0, true, Number.NaN]) {
      expect(asRecord(value)).toBeUndefined();
    }
  });
});

describe("asArray", () => {
  it("passes an array through and turns everything else into nothing to render", () => {
    expect(asArray([1, 2])).toEqual([1, 2]);
    for (const value of [undefined, null, {}, "abc", 3]) expect(asArray(value)).toEqual([]);
  });
});

describe("asText", () => {
  it("trims, because a field holding only spaces is a field left blank", () => {
    expect(asText("  Ada's Bakery  ")).toBe("Ada's Bakery");
    expect(asText("   ")).toBeUndefined();
    expect(asText("")).toBeUndefined();
  });

  it("never coerces a non-string", () => {
    for (const value of [undefined, null, 42, true, [], {}, hostile]) {
      expect(asText(value)).toBeUndefined();
    }
  });
});

describe("asEnum", () => {
  it("falls back for an unrecognised preference (§4.4)", () => {
    expect(asEnum("dark", ["light", "dark"] as const, "light")).toBe("dark");
    expect(asEnum("brutalist", ["light", "dark"] as const, "light")).toBe("light");
    expect(asEnum(undefined, ["light", "dark"] as const, "light")).toBe("light");
    expect(asEnum(1, ["light", "dark"] as const, "light")).toBe("light");
  });
});

describe("asPositiveInt", () => {
  it("accepts a usable dimension and nothing else", () => {
    expect(asPositiveInt(1200)).toBe(1200);
    expect(asPositiveInt(399.6)).toBe(400);
    for (const value of [0, -1, Number.NaN, Number.POSITIVE_INFINITY, "1200", null, undefined]) {
      expect(asPositiveInt(value)).toBeUndefined();
    }
  });
});
