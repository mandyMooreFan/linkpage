import type { Logo } from "@linkpage/renderer";
import { useRef, useState, type DragEvent, type JSX } from "react";
import { browserImageCodec, importLogo, LOGO_ACCEPT, type LogoIntake } from "../../logo/index.js";
import { Question } from "./Question.js";
import { FilePicker } from "../../ui/FilePicker.js";
import { Panel } from "../../ui/Panel.js";
import { TYPE } from "../../ui/type.js";

/**
 * The logo step. `SPEC.md` §6.6, §7.9.
 *
 * The pipeline is #31's and lives in `../../logo`; this screen is the four lines that call it.
 * Three of its rules are visible here and none of them is enforced here, which is the point of
 * that module's shape:
 *
 * - **`accept` is the explicit list, never `image/*`** — on desktop it greys designer files out
 *   of the picker so the failure never happens.
 * - **A failed input never damages what is already there.** `applyIntake` takes the whole
 *   result rather than a logo, so the rejected branch has nothing to apply; the caller cannot
 *   get this wrong and this screen does not try.
 * - **Usually there is no message at all** — the logo appears in the preview, and that is the
 *   feedback. What is shown, when anything is, is one sentence in place beside the control that
 *   opened the picker (§7.9): the soft-result notice, or the reason nothing happened.
 *
 * The chosen logo reaches the draft immediately rather than on _Continue_, because the preview
 * is the feedback and feedback after the screen has gone is not feedback. Declining afterwards
 * takes it back off — which is why the escape is the same control whether or not one is there.
 *
 * **The control is a drop zone, and the form says what it took in** (#374, the desktop walk's
 * moments 9 and 10). *Choose a file* was a small outlined button, and once a file was chosen
 * the form said nothing about it — the picture reached the page beside it, and that was the
 * only sign. Now the control is one large dashed region the owner presses or drops a picture
 * on, the width of the column, and once the picture is on the page the form shows its name
 * beside a thumbnail of it. **Still one control with one name** (§7.12 commitment 6): the
 * region is the `<button>` that opens the dialog and its own words are its name, the dropped
 * file goes through the same `read` as a chosen one, and `FilePicker` is untouched. It wears
 * the preset tile's paper vocabulary rather than a button weight — a region is as wide as its
 * column, which is the one thing a weight refuses to be (B-72) — and, like every enabled
 * button since #370, its hairline turns to ink under the pointer, and under a picture held
 * over it.
 *
 * The file's *name* is the one thing the pipeline does not carry — a `Logo` is bytes and a
 * size — so it is held here from the pick, only when the pick succeeded (a refusal leaves the
 * earlier picture and its name in place, §6.6). A screen that opens with a logo already on it
 * knows no name and says *Your logo* instead.
 */

export interface LogoQuestionProps {
  readonly logo: Logo | null;
  /** Applied by the flow through `applyIntake`, which is a no-op when the result is a refusal. */
  readonly onPick: (result: LogoIntake) => void;
  readonly onContinue: () => void;
  /** Clears any logo picked on this screen and moves on. */
  readonly onSkip: () => void;
  readonly onBack?: () => void;
  /** Injected by the tests. A browser has `<img>` and `<canvas>`; jsdom has neither. */
  readonly intake?: (file: File) => Promise<LogoIntake>;
}

export function LogoQuestion({
  logo,
  onPick,
  onContinue,
  onSkip,
  onBack,
  intake,
}: LogoQuestionProps): JSX.Element {
  const picker = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The name of the file whose picture is on the page, when this screen was the one to take it. */
  const [chosen, setChosen] = useState<string | null>(null);
  /** A picture is being held over the zone. */
  const [over, setOver] = useState(false);

  const read = intake ?? ((file: File) => importLogo(file, browserImageCodec()));

  function take(file: File): void {
    setBusy(true);
    setMessage(null);
    void read(file).then((result) => {
      setBusy(false);
      setMessage(result.ok ? result.notice : result.message);
      if (result.ok) setChosen(file.name);
      onPick(result);
    });
  }

  /** The browser must be told a drop is welcome, or it opens the picture as a page instead. */
  function welcome(event: DragEvent<HTMLButtonElement>): void {
    event.preventDefault();
    setOver(true);
  }

  return (
    <Question
      title="Do you have a logo?"
      hint="A picture file from your signage, menus or social profile."
      onSubmit={onContinue}
      // §7.9 decision 1 (#368): pressed with no picture, it says so. While a file is still being
      // read the picture is not here yet either, and the sentence clears on its own when it is.
      unanswered={
        logo === null
          ? "No picture chosen yet — choose a file, or say you don't have one."
          : undefined
      }
      escape={{ label: "We don't have one", onEscape: onSkip }}
      onBack={onBack}
    >
      {/*
       * The chosen-file state, in place above the control that produced it (§7.9's placement
       * for anything the screen says about what just happened). Not while a picture is still
       * being read: the sentence is about what is on the page, and nothing is yet.
       */}
      {logo !== null && (
        <p className="m-0 flex items-center gap-3 font-sans" data-chosen>
          {/*
           * `alt=""`: decorative beside its own name, exactly as the page's logo is beside the
           * business name (§6.6). Its box is the page frame's surface with a hairline, so a
           * light-on-transparent mark still has something to stand on.
           */}
          <img
            src={logo.src}
            alt=""
            width={logo.width}
            height={logo.height}
            className="h-12 w-auto max-w-32 rounded-sm border border-rule bg-surface object-contain p-1"
          />
          <span>
            <span className="font-medium">{chosen ?? "Your logo"}</span> is on your page.
          </span>
        </p>
      )}
      {/*
       * One `<button>` is the control (#254, #374): as wide as the column, dashed where every
       * other hairline in the tool is solid — the one place a dashed line is the convention for
       * *something goes here* — and its two lines of words are its accessible name. The
       * preset tile's vocabulary, not a `Button` weight: see the note at the top of the file.
       */}
      <button
        type="button"
        className="tap flex w-full flex-col items-start gap-1 rounded-sm border border-dashed border-rule bg-transparent px-4 py-10 text-start font-sans enabled:hover:border-ink data-[over=true]:border-ink disabled:border-rule disabled:text-ink-quiet"
        disabled={busy}
        data-drop-zone
        data-over={over}
        onClick={() => picker.current?.click()}
        onDragEnter={welcome}
        onDragOver={welcome}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          const file = event.dataTransfer.files[0];
          if (file !== undefined && !busy) take(file);
        }}
      >
        <span className="font-medium">
          {logo === null ? "Choose a file" : "Choose a different file"}
        </span>{" "}
        <span className={TYPE.quietLine.className}>
          {logo === null ? "or drop a picture here" : "or drop one here"}
        </span>
      </button>
      {/*
       * `FilePicker`, not a third copy of a clipped `<input type="file">` (#254). The copy that
       * was here was a tab stop and a second button in the accessibility tree, named `Choose a
       * logo file` beside the visible `Choose a file` — so the zone above is now the only thing
       * on this screen that offers to open the dialog, and its own words are the name.
       */}
      <FilePicker ref={picker} accept={LOGO_ACCEPT} onPick={take} />
      {/*
       * `Panel`, not a fifth copy of its recipe (B-47). The `mt-2` that came with the copy goes
       * with it: this is a direct child of the question's own `LADDER.betweenFields` column, so
       * the margin was stacking on a gap and putting the message 8px further from the button
       * that produced it than the "have a look at your page" line directly below is. The parent
       * gap does the spacing, and the two messages now stand at the same distance.
       */}
      {message !== null && (
        <Panel tone="notice" data-notice>
          {message}
        </Panel>
      )}
    </Question>
  );
}
