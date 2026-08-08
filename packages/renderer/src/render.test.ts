import { describe, expect, it } from "vitest";
import { escapeHtml, render } from "./render.js";

// Per-block snapshot tests belong here once the block set lands (issue #3). For now this
// only pins the two things the scaffold actually promises.

describe("render", () => {
  it("returns a complete HTML document", () => {
    const html = render({ title: "Ada's Bakery" });
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html.trimEnd().endsWith("</html>")).toBe(true);
  });

  it("escapes project text rather than trusting it", () => {
    const html = render({ title: '<img src=x onerror="alert(1)">' });
    expect(html).not.toMatch(/<img/i);
    expect(html).toContain("&lt;img");
  });
});

describe("escapeHtml", () => {
  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
