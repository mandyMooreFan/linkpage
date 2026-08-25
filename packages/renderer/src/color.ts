/**
 * Colour primitives for the derivation in `palette.ts`. See `SPEC.md` §3.2 and §3.3.
 *
 * Dependency-free by necessity — this package declares no dependencies (§5.1) — and pure by
 * requirement, since `render(project)` must be byte-deterministic (§6.7).
 *
 * **Why OKLab rather than HSL.** The derivation's central move is "make this colour darker
 * or lighter until it carries enough contrast, without changing what colour it is". HSL is
 * the obvious tool and the wrong one: its `L` is not perceptual, so darkening a yellow and
 * darkening a blue by the same amount produce wildly different perceived steps, and
 * saturated hues shift character as they move. OKLab's lightness is perceptually uniform
 * and its hue stays put, which is exactly the property this file needs. The conversions are
 * about sixty lines of arithmetic and no dependency.
 */

export interface Rgb {
  /** 0..255 */
  r: number;
  /** 0..255 */
  g: number;
  /** 0..255 */
  b: number;
}

export interface Oklch {
  /** Perceptual lightness, 0..1 */
  l: number;
  /** Chroma, 0..~0.4 */
  c: number;
  /** Hue in degrees, 0..360 */
  h: number;
}

const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

// ---------------------------------------------------------------------------
// Hex
// ---------------------------------------------------------------------------

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Parse `#rgb` or `#rrggbb`, with or without the hash.
 *
 * Returns `null` rather than throwing on anything else: the renderer is total (§4.7), and a
 * hand-edited `project.json` can put any string in `style.brand`.
 */
export function parseHex(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const match = HEX.exec(value.trim());
  if (!match) return null;

  const digits = match[1] as string;
  const full =
    digits.length === 3
      ? digits
          .split("")
          .map((d) => d + d)
          .join("")
      : digits;

  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const byteToHex = (value: number): string =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");

export function toHex({ r, g, b }: Rgb): string {
  return `#${byteToHex(r)}${byteToHex(g)}${byteToHex(b)}`;
}

// ---------------------------------------------------------------------------
// WCAG contrast
// ---------------------------------------------------------------------------

/** sRGB 0..255 to linear-light 0..1, per the sRGB transfer function. */
const toLinear = (channel: number): number => {
  const v = clamp(channel, 0, 255) / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};

const fromLinear = (channel: number): number => {
  const v = clamp(channel, 0, 1);
  return 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);
};

/** WCAG 2.2 relative luminance. */
export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** WCAG 2.2 contrast ratio, 1..21. Order-independent. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// OKLab / OKLCh — Björn Ottosson's transform
// ---------------------------------------------------------------------------

export function rgbToOklch(rgb: Rgb): Oklch {
  const lr = toLinear(rgb.r);
  const lg = toLinear(rgb.g);
  const lb = toLinear(rgb.b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  const okL = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const okA = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const okB = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  const c = Math.sqrt(okA * okA + okB * okB);
  const h = c < 1e-7 ? 0 : ((Math.atan2(okB, okA) * 180) / Math.PI + 360) % 360;

  return { l: okL, c, h };
}

/**
 * Round to the 8-bit channels the page will actually carry.
 *
 * Every colour this module produces ends up as a `#rrggbb` in the export, so the whole
 * derivation works in that space. Measuring contrast on un-rounded channels and only
 * rounding at the end is how a contrast-seeking search lands at 2.998:1 while believing it
 * hit 3 — the rounding happens after the check, and it happens in the wrong direction about
 * half the time.
 */
const quantize = ({ r, g, b }: Rgb): Rgb => ({
  r: Math.round(clamp(r, 0, 255)),
  g: Math.round(clamp(g, 0, 255)),
  b: Math.round(clamp(b, 0, 255)),
});

interface Linear {
  r: number;
  g: number;
  b: number;
}

/** OKLCh to linear-light sRGB. Channels may fall outside 0..1 — see `oklchToRgb`. */
function oklchToLinear(l: number, c: number, h: number): Linear {
  const rad = (h * Math.PI) / 180;
  const okA = c * Math.cos(rad);
  const okB = c * Math.sin(rad);

  const lc = l + 0.3963377774 * okA + 0.2158037573 * okB;
  const mc = l - 0.1055613458 * okA - 0.0638541728 * okB;
  const sc = l - 0.0894841775 * okA - 1.291485548 * okB;

  const l3 = lc * lc * lc;
  const m3 = mc * mc * mc;
  const s3 = sc * sc * sc;

  return {
    r: 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    g: -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    b: -0.0041960863 * l3 - 0.7034186147 * m3 + 1.707614701 * s3,
  };
}

const EPSILON = 1e-6;
const inGamut = ({ r, g, b }: Linear): boolean =>
  r >= -EPSILON &&
  r <= 1 + EPSILON &&
  g >= -EPSILON &&
  g <= 1 + EPSILON &&
  b >= -EPSILON &&
  b <= 1 + EPSILON;

/**
 * OKLCh to sRGB, **gamut-mapped by reducing chroma**.
 *
 * Most of OKLCh is not representable in sRGB: pure yellow sits at a chroma no darker
 * lightness can hold. Letting the channels clip is the obvious thing and it silently defeats
 * the reason for using OKLab at all — clipping moves the colour sideways, so darkening
 * `#ffff00` by clipping shifts its hue by about 5°, which is visible and is exactly the
 * failure HSL was rejected for.
 *
 * So chroma is reduced — binary search for the most colourful in-gamut version at the
 * requested lightness — which is the approach CSS Color 4 specifies. Lightness and hue are
 * held exactly; only saturation gives way, which is both the least noticeable change and the
 * one a viewer would expect.
 */
export function oklchToRgb({ l, c, h }: Oklch): Rgb {
  let linear = oklchToLinear(l, c, h);

  if (!inGamut(linear)) {
    let lo = 0;
    let hi = c;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(oklchToLinear(l, mid, h))) lo = mid;
      else hi = mid;
    }
    linear = oklchToLinear(l, lo, h);
  }

  return quantize({
    r: fromLinear(linear.r),
    g: fromLinear(linear.g),
    b: fromLinear(linear.b),
  });
}

/**
 * The same colour at a different perceptual lightness.
 *
 * Hue is preserved exactly. Chroma is preserved where sRGB can hold it and reduced where it
 * cannot — see `oklchToRgb`.
 */
export function withLightness(rgb: Rgb, lightness: number): Rgb {
  const { c, h } = rgbToOklch(rgb);
  return oklchToRgb({ l: clamp(lightness, 0, 1), c, h });
}

/** The same colour with its chroma scaled — used to tint neutrals toward the brand hue. */
export function withChroma(rgb: Rgb, chroma: number): Rgb {
  const { l, h } = rgbToOklch(rgb);
  return oklchToRgb({ l, c: Math.max(0, chroma), h });
}

// ---------------------------------------------------------------------------
// Contrast-seeking
// ---------------------------------------------------------------------------

/**
 * The nearest version of `color` — same hue, same chroma — that reaches `target` contrast
 * against **every** backdrop in `against`, moving only in `direction`.
 *
 * Binary search on perceptual lightness rather than a formula, because contrast is not
 * monotonic in anything convenient and forty iterations of bisection is both exact enough
 * and trivially correct. If the target is unreachable in that direction (a dark colour
 * asked to go darker against black), the endpoint is returned — the caller decides what to
 * do about it, since silently flipping direction would change the design rather than
 * satisfy it.
 *
 * **`against` is a list because a colour is rarely drawn on exactly one thing**, and the
 * single-backdrop version of this function was how a live WCAG failure shipped: the page's
 * roles were pushed until they cleared the ground, then drawn on a panel half a step lighter
 * with nothing left over, because the search stops the instant it clears. The type now makes
 * the caller say which backdrops it means. An empty list constrains nothing and returns
 * `color` untouched, which is the honest answer to "clear this against no backdrops".
 */
export function toContrast(
  color: Rgb,
  against: readonly Rgb[],
  target: number,
  direction: "darker" | "lighter",
): Rgb {
  const { c, h } = rgbToOklch(color);
  const start = rgbToOklch(color).l;
  const end = direction === "darker" ? 0 : 1;

  const at = (l: number): Rgb => oklchToRgb({ l, c, h });
  const clears = (candidate: Rgb): boolean =>
    against.every((backdrop) => contrastRatio(candidate, backdrop) >= target);

  if (clears(color)) return color;
  if (!clears(at(end))) return at(end);

  let lo = start;
  let hi = end;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (clears(at(mid))) hi = mid;
    else lo = mid;
  }
  return at(hi);
}

/**
 * The furthest version of `color` — same hue, same chroma — within `distance` of it in the
 * direction of `toward`, that still satisfies `holds`.
 *
 * **`toContrast`'s opposite number.** That one seeks a minimum and stops the instant it clears
 * it; this one wants to *move* a colour a set distance and asks how much of that distance is
 * available. Which is the shape of a hover state: a ramp step is a look rather than a
 * threshold, and the thresholds are what it must not spend.
 *
 * `toward` names the **direction only, not the destination** — a step of `distance` can land
 * past it, and for a fill already sitting almost on the ink that is the point: stopping at the
 * ink would make the step vanish exactly where the two colours are hardest to tell apart.
 *
 * `holds` must be **monotone along the segment** — true up to some point and false after it —
 * which is what makes the bisection below meaningful. Every predicate this file's callers pass
 * is a contrast floor against a colour on one side or the other, and contrast is monotone in
 * lightness, so a run of them is an interval. `holds(color)` itself is the caller's promise: if
 * it is false, nothing in the direction of travel can fix it and `color` comes back unmoved.
 */
export function stepToward(
  color: Rgb,
  toward: Rgb,
  distance: number,
  holds: (candidate: Rgb) => boolean,
): Rgb {
  const from = rgbToOklch(color).l;
  const direction = rgbToOklch(toward).l >= from ? 1 : -1;
  const at = (step: number): Rgb => withLightness(color, from + direction * step);

  if (holds(at(distance))) return at(distance);

  let lo = 0;
  let hi = distance;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (holds(at(mid))) lo = mid;
    else hi = mid;
  }
  return at(lo);
}

/**
 * The first candidate that clears `min` contrast against `on`, preferring earlier entries;
 * failing that, whichever of black or white does best.
 *
 * The fallback always succeeds. For any colour, the better of black and white is at least
 * 4.58:1 — the worst case is a mid-tone where the two are equal — so AA for normal text is
 * reachable on any fill the owner can choose. That fact is why the readability guarantee
 * (§3.3) can be about *identifiability* rather than about text legibility.
 */
export function pickInk(on: Rgb, candidates: Rgb[], min: number): Rgb {
  for (const candidate of candidates) {
    if (contrastRatio(candidate, on) >= min) return candidate;
  }
  const black: Rgb = { r: 0, g: 0, b: 0 };
  const white: Rgb = { r: 255, g: 255, b: 255 };
  return contrastRatio(white, on) >= contrastRatio(black, on) ? white : black;
}
