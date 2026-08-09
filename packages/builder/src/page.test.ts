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
describe("the single rendering path", () => {
  const sources = import.meta.glob("./**/*.{ts,tsx}", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;

  /**
   * Comments in this repo say `render(project)` constantly — describing the guarantee is half
   * of what the doc comments are for — so only code counts.
   */
  const code = (text: string): string =>
    text.replaceAll(/\/\*[\s\S]*?\*\//g, "").replaceAll(/(^|[^:])\/\/.*$/gm, "$1");

  it("has one file in the builder that calls the renderer", () => {
    const callers = Object.entries(sources)
      .filter(([path]) => !path.endsWith(".test.ts") && !path.endsWith(".test.tsx"))
      // A bare `render(` — `createRoot(root).render(` in `main.tsx` is a method on a React
      // root, not the renderer, and is what the lookbehind is there to let through.
      .filter(([, text]) => /(?<![.\w$])render\s*\(/.test(code(text)))
      .map(([path]) => path)
      .sort();

    expect(callers).toEqual(["./page.ts"]);
  });

  it("found the sources it claims to be scanning", () => {
    // A glob that silently matched nothing would make the assertion above vacuous.
    expect(Object.keys(sources)).toContain("./preview/Preview.tsx");
  });
});
