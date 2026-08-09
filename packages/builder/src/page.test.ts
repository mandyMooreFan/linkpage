import { render } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import { EXPORT_FILENAME, pageHtml } from "./page.js";
import { POPULATED } from "./fixtures.js";
import { emptyDraft } from "./project/index.js";

describe("the exported page", () => {
  it("is the renderer's output, unaltered", () => {
    expect(pageHtml(POPULATED)).toBe(render(POPULATED));
  });

  it("is written to the one filename hosts serve at a directory root", () => {
    expect(EXPORT_FILENAME).toBe("index.html");
  });

  it("renders a draft the flow has not finished, rather than refusing it", () => {
    // No business name, no brand colour — the state §7.1 shows the page in. `render` is total
    // (§4.7), so this is a thin page and not a thrown error or a blank preview.
    const html = pageHtml(emptyDraft("en"));
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("</html>");
  });
});

/**
 * The guarantee §5.2 is actually made of.
 *
 * "The preview is the export" survives exactly as long as one string reaches both, so the thing
 * worth asserting is not that `pageHtml` calls `render` — it is that **nothing else does**. A
 * second call site is how a second rendering path starts: not as a decision anyone announces,
 * but as one more component that needed the HTML and had the renderer to hand.
 *
 * If this fails, the fix is to import `pageHtml` rather than to add a name to the list.
 */
/**
 * Comments in this repo say `render(project)` constantly — describing the guarantee is half of
 * what the doc comments are for — so only code counts.
 */
const code = (text: string): string =>
  text.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Does this source reach the renderer's `render` as a value?
 *
 * **Keyed on the import, not on the token `render(`.** The first version of this guard grepped
 * for a bare call and was fooled the moment #31 landed a rasterise step whose method happened to
 * be called `render` — it reported two rendering paths that did not exist, and turned a
 * green-plus-green merge red (#55). A method name is not evidence of anything; importing
 * `render` from `@linkpage/renderer` is exactly the thing §5.2 cares about, and nothing else can
 * spell it.
 *
 * Type-only imports do not count: a file naming `Project` has not acquired a second way to
 * produce HTML.
 */
export function importsRenderer(text: string): boolean {
  const source = code(text);

  // `await import("@linkpage/renderer")` — a value import by another spelling.
  if (/\bimport\s*\(\s*["']@linkpage\/renderer["']\s*\)/.test(source)) return true;

  for (const match of source.matchAll(
    /import\s+([\s\S]*?)\s+from\s*["']@linkpage\/renderer["']/g,
  )) {
    const clause = (match[1] ?? "").trim();
    if (clause.startsWith("type")) continue; // `import type { … }` — no values at all
    if (/\*\s+as\s+\w+/.test(clause)) return true; // namespace import reaches everything
    const braces = /\{([\s\S]*)\}/.exec(clause);
    if (!braces) continue;
    for (const binding of (braces[1] ?? "").split(",")) {
      const name = binding.trim();
      if (name.startsWith("type ")) continue; // inline `type Project`
      if (/^render(\s+as\s+\w+)?$/.test(name)) return true;
    }
  }
  return false;
}

describe("the single rendering path", () => {
  const sources = import.meta.glob("./**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  it("has one file in the builder that reaches the renderer", () => {
    const callers = Object.entries(sources)
      .filter(([path]) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      .filter(([, text]) => importsRenderer(text))
      .map(([path]) => path)
      .sort();

    expect(callers).toEqual(["./page.ts"]);
  });

  it("found the sources it claims to be scanning", () => {
    // A glob that silently matched nothing would make the assertion above vacuous.
    expect(Object.keys(sources)).toContain("./preview/Preview.tsx");
  });
});

describe("the guard itself", () => {
  it("counts a direct value import", () => {
    expect(importsRenderer(`import { render } from "@linkpage/renderer";`)).toBe(true);
    expect(importsRenderer(`import { render as r } from "@linkpage/renderer";`)).toBe(true);
    expect(importsRenderer(`import { SCHEMA_VERSION, render } from "@linkpage/renderer";`)).toBe(
      true,
    );
    expect(importsRenderer(`import * as renderer from "@linkpage/renderer";`)).toBe(true);
    expect(importsRenderer(`const m = await import("@linkpage/renderer");`)).toBe(true);
  });

  it("does not count a type-only import", () => {
    expect(importsRenderer(`import type { Project } from "@linkpage/renderer";`)).toBe(false);
    expect(importsRenderer(`import { type Project } from "@linkpage/renderer";`)).toBe(false);
    expect(importsRenderer(`import { SCHEMA_VERSION } from "@linkpage/renderer";`)).toBe(false);
  });

  it("does not count a method that merely shares the name — the #55 regression", () => {
    // Both shapes are real, from packages/builder/src/logo/. Neither is a second rendering path.
    expect(
      importsRenderer(`async render(size: Size, smooth: boolean): Promise<RenderedImage> {}`),
    ).toBe(false);
    expect(importsRenderer(`render(size: Size, smooth: boolean): Promise<RenderedImage>;`)).toBe(
      false,
    );
    expect(importsRenderer(`const out = await decoded.render(size, true);`)).toBe(false);
    expect(importsRenderer(`createRoot(root).render(<App />);`)).toBe(false);
  });

  it("does not count prose about the guarantee", () => {
    expect(importsRenderer(`// the preview is render(project) in an iframe`)).toBe(false);
    expect(
      importsRenderer(`/* import { render } from "@linkpage/renderer" — what page.ts does */`),
    ).toBe(false);
  });
});
