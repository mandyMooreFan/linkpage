import { describe, expect, it } from "vitest";
import { portFor } from "./port.mjs";

/**
 * The labels the map is actually being walked with. A collision between any two of these is
 * the bug this function exists to prevent, so they are the corpus rather than an invention.
 */
const LABELS = [
  "main",
  "HEAD",
  "build-184-palette-worst-case",
  "build-185-colour-tokens",
  "build-186-drawer-download",
  "build-187-field-ladder",
  "build-188-focus",
  "build-189-escape-weight",
  "build-190-one-primary",
  "build-191-review-list",
  "build-192-picked-state",
  "build-193-native-controls",
  "build-194-page-hover",
  "build-195-page-spacing",
  "build-196-narrow-container",
  "build-197-https-prefix",
  "build-198-type-consistency",
  "build-199-stray-sweep",
  "build-200-replace-confirm",
  "build-208-private-port",
  "build-209-ritual-coverage",
];

describe("the run's port", () => {
  it("gives concurrent runs different ports", () => {
    // The whole point. Two runs sharing a port do not fail — one of them photographs the
    // other's branch and reports success, which is why this is asserted rather than trusted.
    const ports = LABELS.map(portFor);
    expect(new Set(ports).size).toBe(LABELS.length);
  });

  it("stays inside a range that leaves 4173 to the e2e", () => {
    for (const label of LABELS) {
      expect(portFor(label), label).toBeGreaterThanOrEqual(4400);
      expect(portFor(label), label).toBeLessThan(4800);
    }
  });

  it("gives the same label the same port every time", () => {
    // A before/after pair is two runs of the same label, and the second must be able to
    // reach the first's port to find it occupied rather than silently pick a fresh one.
    for (const label of LABELS) {
      expect(portFor(label)).toBe(portFor(label));
    }
  });

  it("separates labels that differ by one character", () => {
    // Branch names on this map differ only in their ticket number, which is the hardest
    // case for a weak hash and the one that would actually bite.
    expect(portFor("build-191-x")).not.toBe(portFor("build-192-x"));
    expect(portFor("a")).not.toBe(portFor("b"));
  });

  it("survives a label that is empty or odd rather than throwing", () => {
    // `--label ""` and a detached checkout both reach here; the script is a convenience and
    // should not die on one.
    for (const odd of ["", "-", "…", "a".repeat(500)]) {
      const port = portFor(odd);
      expect(Number.isInteger(port)).toBe(true);
      expect(port).toBeGreaterThanOrEqual(4400);
      expect(port).toBeLessThan(4800);
    }
  });
});
