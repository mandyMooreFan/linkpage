import type { Project } from "./project.js";

/**
 * Render a project to the complete text of a self-contained `index.html`.
 *
 * This function *is* the export format. Everything the visitor receives — markup, CSS,
 * images — is in the string it returns, and the builder previews by putting that same
 * string into a `srcdoc` iframe, so the preview is the export rather than a simulation
 * of it.
 *
 * Two rules are enforced by tests in `invariants.test.ts` and are not negotiable:
 *
 * 1. the output contains no `<script>` tag;
 * 2. the output references nothing outside itself — no external URLs, no relative paths.
 *
 * The body below is still a placeholder: it renders the business name and nothing else.
 * The six sections, the styling model and the export's structural guarantees are specified
 * in `SPEC.md` §2, §3 and §6, and are built in #26, #27 and #28.
 */
export function render(project: Project): string {
  // Read defensively. `project` is typed, but types are a compile-time promise and this
  // function has to survive a hand-edited `project.json` at runtime — see SPEC.md §4.7.
  const name = (project as Partial<Project> | null | undefined)?.header?.name;
  const title = escapeHtml(name as string);

  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${title}</title>`,
    "<style>body{font-family:system-ui,sans-serif;margin:0;padding:2rem;}</style>",
    "</head>",
    "<body>",
    `<h1>${title}</h1>`,
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Escape text for interpolation into HTML element content or a double-quoted attribute.
 *
 * The parameter is typed `string` because that is the contract callers should write to.
 * The runtime guard exists anyway: the renderer is **total** (SPEC.md §4.7) and must not
 * throw on a wrong-typed value, because a data problem that throws would blank the
 * builder's `srcdoc` preview rather than degrading the page. A non-string reads as absent.
 */
export function escapeHtml(value: string): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
