import { describe, expect, it } from "vitest";
import { escapeHtml, render } from "./render.js";
import { SCHEMA_VERSION, type Project } from "./project.js";

// Per-section snapshot tests belong here once the sections land (#26). For now this only
// pins the two things the scaffold actually promises.

/**
 * A minimal well-formed v1 project: the two required inputs (brand colour and business
 * name) plus the fields the schema does not make optional. This is exactly what a first run
 * produces before the owner answers anything else — see SPEC.md §7.2.
 */
const sample: Project = {
  version: SCHEMA_VERSION,
  lang: "en",
  style: {
    brand: "#c2185b",
    shape: "centred",
    type: "classic",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: false, colors: {} },
  },
  header: { name: "Ada's Bakery", logo: null },
  links: [],
};

describe("render", () => {
  it("returns a complete HTML document", () => {
    const html = render(sample);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it("escapes project text rather than trusting it", () => {
    const html = render({
      ...sample,
      header: { ...sample.header, name: '<img src=x onerror="alert(1)">' },
    });
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;img");
  });
});

describe("escapeHtml", () => {
  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
