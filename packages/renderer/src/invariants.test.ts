import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { render } from "./render.js";
import type { Project } from "./project.js";

/**
 * The three guards that encode the decisions in issue #4. They are the reason this
 * package exists as a package rather than a folder. Do not weaken them to make a feature
 * fit — if a feature needs a script tag or a network fetch, the feature is wrong for this
 * project.
 */

const sample: Project = { title: "Ada's Bakery" };

/** Every project fixture the invariants are checked against. Grow this as blocks land. */
const fixtures: Project[] = [sample];

describe("invariant 1: the export ships zero JavaScript", () => {
  it.each(fixtures)("contains no <script> tag (%o)", (project) => {
    const html = render(project);
    expect(html).not.toMatch(/<script/i);
  });

  it.each(fixtures)("contains no inline event handlers (%o)", (project) => {
    const html = render(project);
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
  });

  it.each(fixtures)("contains no javascript: URLs (%o)", (project) => {
    const html = render(project);
    expect(html).not.toMatch(/javascript:/i);
  });
});

describe("invariant 2: the export references nothing outside itself", () => {
  // Note the distinction: *navigation* to another site is the entire point of a link page,
  // so `<a href="https://...">` is fine. What is forbidden is a **subresource** — anything
  // the browser must fetch to render the page. Those must be inlined (data: URIs), because
  // the file has to work opened from a desktop with no network.
  it.each(fixtures)("loads no external or relative subresources (%o)", (project) => {
    const html = render(project);
    for (const [, value] of html.matchAll(/\bsrc\s*=\s*"([^"]*)"/gi)) {
      expect(value, `src="${value}" must be a data: URI`).toMatch(/^data:/);
    }
    for (const [, value] of html.matchAll(/<link\b[^>]*\bhref\s*=\s*"([^"]*)"/gi)) {
      expect(value, `<link href="${value}"> must be a data: URI`).toMatch(/^data:/);
    }
  });

  it.each(fixtures)("pulls in no stylesheets or fonts via CSS (%o)", (project) => {
    const html = render(project);
    expect(html).not.toMatch(/@import/i);
    for (const [, value] of html.matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/gi)) {
      expect(value, `url(${value}) must be a data: URI`).toMatch(/^data:/);
    }
  });
});

describe("invariant 3: the renderer declares no dependencies", () => {
  it("has an empty dependencies block in package.json", () => {
    const manifestPath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      dependencies?: Record<string, string>;
    };
    expect(Object.keys(manifest.dependencies ?? {})).toEqual([]);
  });
});
