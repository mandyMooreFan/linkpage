import { useEffect, useId, useRef, type JSX } from "react";
import { EXPORT_FILENAME, pageHtml } from "../page.js";
import type { Draft } from "../project/index.js";
import { sheetWarnings } from "../project/unusable.js";
import { Hosting } from "./Hosting.js";
import { HTML_TYPE, saveTextFile, type FileDownload } from "./save.js";
import { Button, type ButtonWeight } from "../ui/Button.js";
import { HEADING, TYPE } from "../ui/type.js";

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
 * §7.7's own fallback: the name a project file lands under when there is no business name to
 * slug, and the label this sheet shows when it has not been handed a `projectDownload` at all.
 *
 * The spec's rule is `⟨business-name⟩.linkpage.json`, slugified, **falling back to
 * `linkpage.json` when there is no name yet**. The rule itself lives with the write, in
 * `src/open/projectFile.ts`, which reads this constant rather than re-stating it.
 */
export const PROJECT_FILENAME_FALLBACK = "linkpage.json";

/**
 * What Tab can land on inside the sheet.
 *
 * Deliberately a small, literal list rather than a general-purpose one: this sheet contains
 * buttons and nothing else today, and the only variation it has is a Save button that can be
 * `disabled`. A borrowed focus-trap utility would bring `contenteditable`, `<audio controls>`,
 * `iframe`, positive `tabindex` ordering and visibility checks to serve a surface that has none
 * of them — and the renderer's no-dependencies rule (§5.1) does not bind the builder, so this is
 * a judgement about weight rather than a constraint.
 *
 * The panel is `tabIndex={-1}` and so is excluded by the last clause: it is where focus starts,
 * never somewhere Tab stops.
 */
const FOCUS_STOPS = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/** The sheet's tab stops, in document order. */
function focusStops(surface: HTMLElement): HTMLElement[] {
  return [...surface.querySelectorAll<HTMLElement>(FOCUS_STOPS)];
}

/**
 * The sheet's own surface — one of the tool's two overlays, the other being the list's menu
 * panel. Exported so `controls.test.ts` can hold the two of them to one radius and to one
 * written measure, rather than re-spelling either.
 *
 * **`max-w-lg`, which is the list's own measure** (B-39). This was `max-w-[34rem]`, 544px — a
 * hand-written near-twin of the 512px the flow and the list are already set at, so the sheet
 * that opens *over* the list was 32px wider than it for no stated reason. It is the same drift
 * `theme.css` names when it made `--breakpoint-wide` one token: two hands agreeing by hand.
 *
 * **`rounded-t-sm` / `wide:rounded-sm`, which is every other radius in the builder** (B-38). It
 * was `rounded-t-2xl` / `wide:rounded-2xl` — 16px, **8× everything it sits above**, and the only
 * radius step in the tool that is neither `rounded-sm` nor a circle. §6 asks one radius per
 * component class and calls mixed siblings a failure; two overlays that disagree by a factor of
 * eight are the loudest possible version of that. The step kept is the shared one, because the
 * alternative was to move one object and leave nine.
 *
 * **The two `dvh` numbers are different on purpose, and this is the reason they were missing.**
 * Narrow, the sheet is anchored to the bottom edge with no padding around it, so `92dvh` is what
 * leaves a strip of veiled list visible above it — the strip is what says *this is over your
 * page* rather than *this is your page*, and it is the same strip B-69 read the scrim's
 * temperature off. Wide, the wrapper adds `wide:p-8` all round, which spends 64px of the
 * viewport before the sheet is measured at all, so the sheet is given `88dvh` and the padding
 * makes up the difference. Collapsing them to one value was the other option B-39 offered and it
 * would have to be the smaller one, costing the narrow layout 4dvh of the sheet it is short of.
 */
export const SHEET_SURFACE =
  "relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-sm bg-ground p-5 text-ink " +
  "wide:max-h-[88dvh] wide:rounded-sm wide:p-8";

export interface DownloadSheetProps {
  /** The project as the builder holds it. The page is built from it on the press. */
  readonly draft: Draft;
  /** Leave the sheet. Escape, the Close button and the scrim all mean this. */
  readonly onClose: () => void;
  /**
   * The project file, wired from `src/open/` (§7.7's slug rule, and §7.8's mechanics).
   *
   * **The whole of `project.json` belongs to one owner**: what it is called and how it is
   * written are the same decision, so they arrive here together or not at all. Absent, section
   * two still reads in full — the consequence sentence is the point of it and does not depend
   * on a working button — and the button is unavailable rather than inert. In the shipped
   * builder it is absent only when there is no project at all, which is a state this sheet
   * cannot be reached from; it stays optional so that the sheet can be read on its own.
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

  // At most two, and never a list (§7.7). Derived from the same place §7.4's row marks come from,
  // so the two surfaces cannot disagree about the same string.
  const warnings = sheetWarnings(draft);

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

  /**
   * The two keys this layer owns.
   *
   * **Escape leaves**, from anywhere in the sheet, at both sizes — the same key the preview
   * drawer answers to, so stepping out of a layer is one gesture across the whole builder.
   *
   * **Tab stays.** `aria-modal` below is a promise to assistive technology that the rest of the
   * page is not there, and until now the Tab key did not keep it: three stops into the sheet and
   * the fourth landed on the review list behind, which the owner cannot see and did not ask for.
   * A dialog that says it is modal and then hands the keyboard to the page underneath is worse
   * than one that never claimed it, because a screen-reader user is told the background is inert
   * by the same document that lets them tab into it.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const surface = panel.current;
      if (surface === null) return;

      const stops = focusStops(surface);
      const active = document.activeElement;

      // Nothing to land on — the project button can be unavailable (see `projectDownload`), and
      // in principle every stop could be. Hold the keyboard on the panel rather than let it out.
      if (stops.length === 0) {
        event.preventDefault();
        surface.focus();
        return;
      }

      const first = stops[0]!;
      const last = stops[stops.length - 1]!;

      // The panel itself is `tabIndex={-1}`, so it is where focus starts and never a stop:
      // shift-tabbing from it means going to the end, exactly as if it were before the first.
      if (!surface.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === surface)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  /**
   * The sheet covers the list, so the keyboard comes with it — and goes back where it came from.
   *
   * Restoring to whatever was focused when the sheet opened, rather than naming the Download
   * button, because the sheet does not know who opened it and should not have to: the list's
   * button today, plausibly a menu item or a keyboard shortcut later. It also makes the three
   * ways out — Escape, Close, the scrim — land in the same place without each having to
   * remember to.
   */
  useEffect(() => {
    const opener = document.activeElement;
    panel.current?.focus();
    return () => {
      // `isConnected` because the list behind can re-render while the sheet is open; focusing a
      // detached node silently sends focus to `<body>`, which is the bug this exists to avoid.
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center font-sans wide:items-center wide:p-8">
      {/*
       * Tapping beside the sheet leaves it. The Close button is the keyboard's route out.
       *
       * **`bg-ink/40`, not `bg-black/40`** (B-27, B-69). Pure black was the one colour in the
       * whole tool that is not a `--color-*` token, and it did not merely fail a rule on paper:
       * the veil always appears immediately beside an unveiled warm surface — the strip of list
       * above the sheet — so a neutral-grey scrim against `#faf7f2` breaks temperature at the one
       * seam where the two are touching. `--color-ink` is the warm `#1f1b16` the rest of the tool
       * is drawn in, so the veiled strip now reads as the same paper, dimmed.
       */}
      <div className="absolute inset-0 bg-ink/40" data-scrim onClick={onClose} />

      <div
        className={SHEET_SURFACE}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        ref={panel}
      >
        <div className="flex items-center justify-between gap-4">
          <h2 className={HEADING.screen.className} id={titleId}>
            Download
          </h2>
          <Button type="button" weight="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        {/*
         * Section one. First, because it is what the button was pressed for — and because the
         * order of these two sections is the order they happen in.
         */}
        <section
          className="mt-8 border-t border-rule pt-8 first-of-type:mt-6 first-of-type:border-0 first-of-type:pt-0"
          data-section="page"
        >
          <h3 className={HEADING.section.className}>Put your page online</h3>
          <p className="mt-2 [&_code]:[overflow-wrap:anywhere]">
            This is your web page — <code>{EXPORT_FILENAME}</code>. Put it online and anyone can
            visit it.
          </p>
          {/*
           * §7.7: under this section's own sentence and above §8's guidance, because it is about
           * the page and because the last moment before publishing is when it is worth
           * mentioning.
           *
           * **When nothing is wrong this renders nothing at all** — not an empty element, not a
           * reserved space. The sheet is then byte for byte the calm screen §7.7 designed, which
           * is the constraint on having it here at all.
           *
           * The objection was weighed rather than waved past: the *changed since you downloaded*
           * badge this section rejects below fired **for everyone, always**, about a state that is
           * normal and unfixable. This fires rarely, only when something is genuinely broken, and
           * is actionable.
           */}
          {warnings.length > 0 && (
            <div className="mt-3 flex flex-col gap-1" data-warnings>
              {warnings.map((line) => (
                <p key={line} className={TYPE.notice.className} data-warning>
                  {line}
                </p>
              ))}
            </div>
          )}
          {/*
           * Above the guidance, because you need the file before any of it applies. The label
           * names the file rather than the act: `index.html` is anonymous in a downloads folder
           * and this is the last chance to say which one it is.
           */}
          {/* The sheet’s one fill: it is what the button on the list was pressed for (§4). */}
          <SaveButton file={page} weight="primary" />
          <Hosting />
        </section>

        {/* Section two. Not in a menu — see the note on this component. */}
        <section
          className="mt-8 border-t border-rule pt-8 first-of-type:mt-6 first-of-type:border-0 first-of-type:pt-0"
          data-section="project"
        >
          <h3 className={HEADING.section.className}>Keep a copy of your work</h3>
          <p className="mt-2 [&_code]:[overflow-wrap:anywhere]">
            This is your saved work —{" "}
            <code>{projectDownload?.filename ?? PROJECT_FILENAME_FALLBACK}</code>. It’s how you make
            changes later.
          </p>
          <p className="mt-2">
            Keep it somewhere safe:{" "}
            <strong>if you lose it, you’d have to build your page again from scratch.</strong>
          </p>
          <SaveButton
            file={projectDownload}
            fallbackName={PROJECT_FILENAME_FALLBACK}
            // The sentence above has already done the persuading (§4, design change 3).
            weight="secondary"
          />
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
 *
 * **The weight is the caller's, and only one of the two is filled** (§4, §6; design change 3,
 * B-19). The sheet used to render both solid, so a screen whose entire design is *first this,
 * then that* said the two were equal and left the order to carry the distinction on its own. The
 * page keeps the fill: it is what the button on the list was pressed for, and §4 gives the one
 * filled object on a screen to the one action. **Section two's prose already does the persuading**
 * — *if you lose it, you'd have to build your page again from scratch* is the one sentence on this
 * sheet set in bold, and it is what carries the section, which is why the section is prose with a
 * button in it rather than a button with a caption.
 *
 * Stepping down is not stepping back, and nothing else about section two moves: still second,
 * still on this sheet rather than in a menu, still naming its own file, still unavailable rather
 * than inert without one. §4's secondary shares every measurement with the primary above it and
 * differs only in fill — photographed side by side while this landed, and the two frames differ
 * in the fill and in nothing else, position and size included.
 */
function SaveButton({
  file,
  fallbackName,
  weight,
}: {
  readonly file?: FileDownload;
  readonly fallbackName?: string;
  /**
   * **Required, with no default**, because there is one fill on this sheet and a default is a
   * way of handing it out without deciding to. A third section added later has to say which of
   * the two it is, and the rendered guard in `download.test.tsx` goes red if it says `primary`.
   */
  readonly weight: ButtonWeight;
}): JSX.Element {
  return (
    <Button
      type="button"
      weight={weight}
      className="mt-4 [overflow-wrap:anywhere]"
      disabled={file === undefined}
      onClick={file?.save}
    >
      Download {file?.filename ?? fallbackName}
    </Button>
  );
}
