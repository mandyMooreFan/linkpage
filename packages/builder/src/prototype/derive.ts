/**
 * PROTOTYPE — throwaway. Issue #5.
 *
 * A rough stand-in for the palette derivation settled in issue #2: everything on the page is
 * computed from the owner's one or two brand colours. Good enough to make the preview honest
 * and to give the advanced panel a real contrast number to report. Not the derivation the
 * renderer will ship.
 */

import type { Project } from "./model.js";

export interface Palette {
  ground: string;
  surface: string;
  text: string;
  muted: string;
  rule: string;
  brand: string;
  buttonFill: string;
  buttonText: string;
  accent: string;
  /** False when the typed brand colour is too weak to carry buttons and has stepped back. */
  brandCarries: boolean;
}

function clamp(n: number, lo = 0, hi = 255): number {
  return Math.min(hi, Math.max(lo, n));
}

export function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1]!;
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex([r, g, b]: [number, number, number]): string {
  return "#" + [r, g, b].map((v) => clamp(Math.round(v)).toString(16).padStart(2, "0")).join("");
}

function luminance(rgb: [number, number, number]): number {
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
}

/** WCAG 2.x contrast ratio, 1–21. Returns 1 for anything unparseable. */
export function contrast(a: string, b: string): number {
  const ra = parseHex(a);
  const rb = parseHex(b);
  if (!ra || !rb) return 1;
  const la = luminance(ra);
  const lb = luminance(rb);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

function mix(a: string, b: string, t: number): string {
  const ra = parseHex(a) ?? [0, 0, 0];
  const rb = parseHex(b) ?? [255, 255, 255];
  return toHex([
    ra[0] + (rb[0] - ra[0]) * t,
    ra[1] + (rb[1] - ra[1]) * t,
    ra[2] + (rb[2] - ra[2]) * t,
  ]);
}

/** Push a colour toward black or white until it clears `target` against `against`. */
function nudgeUntilLegible(colour: string, against: string, target: number): string {
  const towards = luminance(parseHex(against) ?? [255, 255, 255]) > 0.4 ? "#000000" : "#ffffff";
  let out = colour;
  for (let i = 0; i < 24 && contrast(out, against) < target; i++) out = mix(out, towards, 0.06);
  return out;
}

export function derive(style: Project["style"]): Palette {
  const brand = parseHex(style.brand) ? style.brand : "#8a8a8a";
  const dark = style.mode === "dark";

  const ground = dark ? mix("#111214", brand, 0.06) : mix("#ffffff", brand, 0.03);
  const surface = dark ? mix(ground, "#ffffff", 0.06) : mix(ground, "#000000", 0.04);
  const text = dark ? mix("#ffffff", brand, 0.08) : mix("#141414", brand, 0.08);
  const muted = mix(text, ground, 0.4);
  const rule = mix(text, ground, 0.82);

  // Mechanism 2 from #2: a hand-typed colour is honoured exactly, but if it cannot carry a
  // button it steps back into the marks and the buttons take a derived neutral instead.
  const brandCarries = contrast(brand, ground) >= 2.6;
  const buttonFill = brandCarries ? brand : mix(text, ground, 0.12);
  const buttonText =
    contrast("#ffffff", buttonFill) >= contrast("#111111", buttonFill) ? "#ffffff" : "#111111";

  const accentRaw = style.accent && parseHex(style.accent) ? style.accent : mix(brand, text, 0.45);
  const accent = nudgeUntilLegible(accentRaw, ground, 4.5);

  const base: Palette = {
    ground,
    surface,
    text,
    muted,
    rule,
    brand,
    buttonFill,
    buttonText,
    accent,
    brandCarries,
  };

  if (!style.advanced.enabled) return base;
  const o = style.advanced.colors;
  return {
    ...base,
    ground: o.ground ?? base.ground,
    surface: o.surface ?? base.surface,
    text: o.text ?? base.text,
    buttonText: o.buttonText ?? base.buttonText,
    muted: o.text ? mix(o.text, o.ground ?? base.ground, 0.4) : base.muted,
    rule: o.text ? mix(o.text, o.ground ?? base.ground, 0.82) : base.rule,
  };
}

/** The readout the advanced panel states and then does nothing about. */
export function contrastReport(p: Palette): { label: string; ratio: number; ok: boolean }[] {
  return [
    {
      label: "Body text on the page",
      ratio: contrast(p.text, p.ground),
      ok: contrast(p.text, p.ground) >= 4.5,
    },
    {
      label: "Button text on buttons",
      ratio: contrast(p.buttonText, p.buttonFill),
      ok: contrast(p.buttonText, p.buttonFill) >= 4.5,
    },
    {
      label: "Headings on the page",
      ratio: contrast(p.accent, p.ground),
      ok: contrast(p.accent, p.ground) >= 4.5,
    },
  ];
}
