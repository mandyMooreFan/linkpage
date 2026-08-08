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
 * The body below is a placeholder. What actually goes in it is decided in issue #6
 * (export spec) and issue #3 (block set).
 */
export function render(project: Project): string {
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${escapeHtml(project.title)}</title>`,
    "<style>body{font-family:system-ui,sans-serif;margin:0;padding:2rem;}</style>",
    "</head>",
    "<body>",
    `<h1>${escapeHtml(project.title)}</h1>`,
    "</body>",
    "</html>",
  ].join("\n");
}

/** Escape text for interpolation into HTML element content or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
