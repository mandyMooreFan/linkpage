import { useRef, type JSX, type ReactNode } from "react";
import { PRESETS, type PresetId } from "../presets.js";
import { Question } from "./Question.js";
import { Button } from "../../ui/Button.js";
import { FilePicker } from "../../ui/FilePicker.js";
import { Panel } from "../../ui/Panel.js";
import { TYPE } from "../../ui/type.js";

/**
 * Step one: _"What kind of business is this?"_ `SPEC.md` §7.3, §7.8, §7.9.
 *
 * **Not a gallery in front of the flow.** A pre-flow chooser is a decision made while knowing
 * nothing about the tool and reads as a commitment; as step one of the same
 * one-question-per-screen sequence it is no heavier than "what's it called?". So this is an
 * ordinary question wearing the ordinary shell, and choosing an answer moves on — **there is
 * no confirmation screen**, here or anywhere in the flow (§7.3).
 *
 * **The screen's first words are orientation** (§7.3, #141): one quiet line above the title
 * carrying the three doubts a cold owner actually holds — how long, can I leave, where does
 * this go. Nothing precedes the screen; the line asks for nothing; "about ten" is honest as a
 * range stated once and never updated, with §7.2's bar carrying the exact count from screen
 * two onward.
 *
 * **The examples are the question.** _café, restaurant, takeaway, bar_ is what tells a chip
 * shop owner they are looking at their own row; without it "Food & drink" is a category and
 * the owner has to do the classifying. §7.3's growth rule leans on the same fact — a candidate
 * entry that runs the same steps and suggests the same buttons as an existing one belongs in
 * that row's subtitle.
 *
 * **The quiet line beneath** (§7.8) is a statement, not a question: it adds an exit to the
 * screen without adding a decision to it. The person with a file arrives knowing they have one
 * and is scanning for the way in; someone starting fresh has no reason to look and reads past
 * it. It opens the OS picker **directly** — an intermediate "import a project" screen would be
 * a screen whose only content is a button.
 *
 * **A failed import lands under that line** (§7.9), with the preset question above it
 * untouched: _try a different file_ is overwhelmingly the next action, and in place makes
 * recovery _pick again_ rather than _dismiss → re-find the control → re-open the picker_.
 */

export interface PresetQuestionProps {
  /** What the owner said last time they were here, when `Back` brought them round again. */
  readonly chosen: PresetId | null;
  readonly onChoose: (id: PresetId) => void;
  /** Absent when the host has nothing to open a file with. The line goes with it. */
  readonly onOpenFile?: (file: File) => void;
  /** §7.9's message, in place, beside the control that opened the picker. */
  readonly fileError?: ReactNode;
}

export function PresetQuestion({
  chosen,
  onChoose,
  onOpenFile,
  fileError,
}: PresetQuestionProps): JSX.Element {
  const picker = useRef<HTMLInputElement>(null);

  return (
    <Question
      title="What kind of business is this?"
      preamble="About ten quick questions. Everything stays on this device — stop anytime, nothing is lost."
      hint="It only decides what we ask you next. Nothing about it ends up on your page."
      footer={
        onOpenFile === undefined ? undefined : (
          <>
            <p className="m-0 font-sans text-ink-quiet">
              Already have a project file?{" "}
              <Button weight="inline" onClick={() => picker.current?.click()}>
                {/*
                 * The upload glyph (#148, walk moment 2): affordance rather than decoration —
                 * it marks the one control on this screen that opens the file picker. Inline
                 * and ink-coloured, so it is type-sized paper furniture, not chrome.
                 */}
                <svg
                  className="mr-1 inline-block size-4 align-text-bottom"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                  />
                </svg>
                Open it.
              </Button>
            </p>
            {/*
             * The picker itself. `.json` rather than a bespoke type because that is what the
             * file is; import validates by content, not by filename (§7.7).
             *
             * `FilePicker` rather than a clipped `<input type="file">` written here (#254): the
             * copy that was here sat between `Open it.` and the preview's own control as a tab
             * stop nobody could see, and named itself `Open a project file` in the accessibility
             * tree beside the visible `Open it.` — two buttons on this screen for one action.
             */}
            <FilePicker ref={picker} accept=".json,application/json" onPick={onOpenFile} />
            {/*
             * `Panel`, not a hand-rolled copy of its recipe (B-47) — and `Panel` renders a
             * `<div>` rather than a `<p>`, which is what this site needs anyway: §4.6 puts the
             * technical half of a refusal behind a disclosure, and a `<details>` is flow content
             * that cannot live inside a paragraph.
             *
             * The `mt-2` stays here, unlike `LogoQuestion`'s. This is the question's `footer`
             * slot, which is ordinary block flow with no gap of its own to stack on.
             */}
            {fileError !== undefined && fileError !== null && (
              <Panel tone="notice" className="mt-2" data-open-error>
                {fileError}
              </Panel>
            )}
          </>
        )
      }
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              // The row's hairline stays the row's hairline whether or not it is chosen; `picked`
              // draws the choice inside it (#192). What was here recoloured the border *and* laid
              // a bracket-valued inset shadow over it — one faux border built twice, with the
              // arbitrary value unexplained.
              className="tap flex w-full flex-col gap-0.5 rounded-sm border border-rule bg-transparent px-4 py-3 text-start font-sans aria-pressed:picked"
              aria-pressed={chosen === preset.id}
              onClick={() => onChoose(preset.id)}
            >
              <span className="font-medium">{preset.label}</span>
              {preset.examples !== "" && (
                <span className={TYPE.quietLine.className}>{preset.examples}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Question>
  );
}
