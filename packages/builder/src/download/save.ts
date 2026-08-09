/**
 * Handing a file to the browser. `SPEC.md` §7.7, §6.1.
 *
 * **This is the only place in the builder that writes to disk**, and it is deliberately the
 * dullest module here: a name, some text, and the anchor dance every browser understands.
 * Nothing in it knows what a project or a page is, which is what lets both sections of the
 * Download sheet — and #36's project file, whose filename rule is not this issue's — use the
 * same twelve lines rather than growing a second one.
 *
 * **There is no download state anywhere** (§7.7). The tool does not record that a file was
 * written, does not compare it against later edits, and has nothing to hang a "changed since
 * you downloaded" badge on. `save` returns `void` because there is nothing worth knowing
 * afterwards: the browser owns what happens next, and **the tool knows nothing about your host
 * and will not imply it does.**
 */

/**
 * A file the Download sheet offers: the name it lands under, and the press that writes it.
 *
 * The name is here because it is copy as much as it is a filename — §7.7's sentences say it out
 * loud (`index.html`, `adas-bakery.linkpage.json`) so that a downloads folder full of anonymous
 * files is still legible a month later. The name and the write travel together for the same
 * reason: whoever decides what a file is called is the one who knows how to produce it.
 */
export interface FileDownload {
  readonly filename: string;
  /** Build the bytes and hand them to the browser. Called on the press, not before. */
  readonly save: () => void;
}

/** `text/html`, with the encoding the renderer actually emits. */
export const HTML_TYPE = "text/html;charset=utf-8";

/**
 * Write `text` to the owner's disk under `filename`.
 *
 * An object URL rather than a `data:` URI: the exported page carries its logo inline and runs
 * to tens of kilobytes (§6.4), which is exactly the size at which `data:` URIs start meeting
 * per-browser limits. The anchor is attached to the document before the click because Firefox
 * ignores a click on an element that is not in a tree.
 */
export function saveTextFile(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // Revoked on the next turn rather than immediately: several browsers read the object URL
  // after `click()` has returned, and revoking underneath them cancels the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
