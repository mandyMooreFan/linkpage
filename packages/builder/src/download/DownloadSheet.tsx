import { useEffect, useId, useRef, type JSX } from "react";
import { EXPORT_FILENAME, pageHtml } from "../page.js";
import type { Draft } from "../project/index.js";
import "./download.css";
import { Hosting } from "./Hosting.js";
import { HTML_TYPE, saveTextFile, type FileDownload } from "./save.js";

/**
 * Download: one sheet, two sections. `SPEC.md` §7.7, §8, §6.1.
 *
 * > **Your page is for the internet, and your project file is for you.**
 *
 * That sentence is the whole design, and the order of the two sections is it made visible.
 * **The page comes first because it is what they pressed the button for** — leading with the
 * backup answers a question nobody asked. The project file comes second because it is the thing
 * they will need next, and because second is still *here*.
 *
 * **Why the project file shares this sheet rather than sitting in a menu.** The risk worth
 * designing against is not two confusing downloads: it is that **the owner never downloads
 * `project.json` at all.** localStorage is not durable — cleared caches, a new phone, a browser
 * reinstall — so if the project file is tucked away, most owners never meet it and *you own
 * your file* quietly becomes false. The Download sheet is the one place they reliably go.
 * Two adjacent buttons on the list was rejected as the worst version of this: the whole
 * distinction would rest on two short labels read at a glance, with no room for the sentence
 * that actually does the work. **That sentence — _if you lose it, you'd have to build your page
 * again from scratch_ — is what carries section two**, and it is why the section is prose with
 * a button in it rather than a button with a caption.
 *
 * **The sheet holds no state about downloads** (§7.7). It does not track "downloaded" versus
 * "changed since", here or on the list behind it: with no backend the file goes stale the
 * moment the owner edits again, and a badge would catch that — but it is a nagging state on a
 * screen this design keeps calm, and it is wrong for every owner who exports, decides they hate
 * it, and never uploads. **Download is a button you press when you want a file.**
 *
 * **Section one's guidance is a placeholder on purpose** — see `Hosting.tsx` and §8, which
 * declares its own incompleteness in its first line. The structure ships; the steps wait to be
 * walked.
 */

/**
 * §7.7's own fallback, used here as the name shown before #36 supplies the real one.
 *
 * The spec's rule is `⟨business-name⟩.linkpage.json`, slugified, **falling back to
 * `linkpage.json` when there is no name yet** — so this is the one project filename this issue
 * can state without owning the rule that produces the other one.
 */
export const PROJECT_FILENAME_FALLBACK = "linkpage.json";

export interface DownloadSheetProps {
  /** The project as the builder holds it. The page is built from it on the press. */
  readonly draft: Draft;
  /** Leave the sheet. Escape, the Close button and the scrim all mean this. */
  readonly onClose: () => void;
  /**
   * The project file, wired by #36 (§7.8's mechanics, and §7.7's slug rule).
   *
   * **The whole of `project.json` belongs to one owner**: what it is called and how it is
   * written are the same decision, so they arrive here together or not at all. Absent, section
   * two still reads in full — the consequence sentence is the point of it and does not depend
   * on a working button — and the button is unavailable rather than inert, which is the
   * convention the review list already set for a control whose issue has not landed.
   */
  readonly projectDownload?: FileDownload;
}

export function DownloadSheet({
  draft,
  onClose,
  projectDownload,
}: DownloadSheetProps): JSX.Element {
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();

  /**
   * The page, built on the press rather than on every render.
   *
   * `pageHtml` is the builder's one call into the renderer (§5.2), so what lands on disk is
   * character for character what the drawer behind this sheet is showing — not a second
   * rendering with the same inputs.
   */
  const page: FileDownload = {
    filename: EXPORT_FILENAME,
    save: () => saveTextFile(EXPORT_FILENAME, pageHtml(draft), HTML_TYPE),
  };

  // Escape leaves, from anywhere in the sheet, at both sizes — the same key the preview drawer
  // answers to, so stepping out of a layer is one gesture across the whole builder.
  useEffect(() => {
    const close = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  // The sheet covers the list, so the keyboard has to come with it.
  useEffect(() => {
    panel.current?.focus();
  }, []);

  return (
    <div className="sheet">
      {/* Tapping beside the sheet leaves it. The Close button is the keyboard's route out. */}
      <div className="sheet__scrim" onClick={onClose} />

      <div
        className="sheet__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panel}
      >
        <div className="sheet__bar">
          <h2 className="sheet__title" id={titleId}>
            Download
          </h2>
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {/*
         * Section one. First, because it is what the button was pressed for — and because the
         * order of these two sections is the order they happen in.
         */}
        <section className="sheet__section" data-section="page">
          <h3 className="sheet__heading">Put your page online</h3>
          <p className="sheet__lede">
            This is your web page — <code>{EXPORT_FILENAME}</code>. Put it online and anyone can
            visit it.
          </p>
          {/*
           * Above the guidance, because you need the file before any of it applies. The label
           * names the file rather than the act: `index.html` is anonymous in a downloads folder
           * and this is the last chance to say which one it is.
           */}
          <SaveButton file={page} />
          <Hosting />
        </section>

        {/* Section two. Not in a menu — see the note on this component. */}
        <section className="sheet__section" data-section="project">
          <h3 className="sheet__heading">Keep a copy of your work</h3>
          <p className="sheet__lede">
            This is your saved work —{" "}
            <code>{projectDownload?.filename ?? PROJECT_FILENAME_FALLBACK}</code>. It’s how you make
            changes later.
          </p>
          <p className="sheet__consequence">
            Keep it somewhere safe:{" "}
            <strong>if you lose it, you’d have to build your page again from scratch.</strong>
          </p>
          <SaveButton file={projectDownload} fallbackName={PROJECT_FILENAME_FALLBACK} />
        </section>
      </div>
    </div>
  );
}

/**
 * The press that writes a file.
 *
 * Both sections use it, so the two downloads are the same control twice and cannot drift into
 * looking like different kinds of thing. It says the filename because §7.7's sentences do: what
 * the owner has to recognise later is a name in a folder, not a verb.
 */
function SaveButton({
  file,
  fallbackName,
}: {
  readonly file?: FileDownload;
  readonly fallbackName?: string;
}): JSX.Element {
  return (
    <button
      type="button"
      className="sheet__save"
      disabled={file === undefined}
      onClick={file?.save}
    >
      Download {file?.filename ?? fallbackName}
    </button>
  );
}
