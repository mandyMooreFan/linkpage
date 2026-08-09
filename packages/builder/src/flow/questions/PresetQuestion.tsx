import { useRef, type JSX, type ReactNode } from "react";
import { PRESETS, type PresetId } from "../presets.js";
import { Question } from "./Question.js";

/**
 * Step one: _"What kind of business is this?"_ `SPEC.md` §7.3, §7.8, §7.9.
 *
 * **Not a gallery in front of the flow.** A pre-flow chooser is a decision made while knowing
 * nothing about the tool and reads as a commitment; as step one of the same
 * one-question-per-screen sequence it is no heavier than "what's it called?". So this is an
 * ordinary question wearing the ordinary shell, and choosing an answer moves on — **there is
 * no confirmation screen**, here or anywhere in the flow (§7.3).
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
      hint="It only decides what we ask you next. Nothing about it ends up on your page."
      footer={
        onOpenFile === undefined ? undefined : (
          <>
            <p className="quiet-line">
              Already have a project file?{" "}
              <button
                type="button"
                className="quiet-line__action"
                onClick={() => picker.current?.click()}
              >
                Open it.
              </button>
            </p>
            {/*
             * The picker itself. `.json` rather than a bespoke type because that is what the
             * file is; import validates by content, not by filename (§7.7). Resetting `value`
             * afterwards is what lets the owner pick the *same* file again after a refusal,
             * which is the recovery §7.9 is designed around.
             */}
            <input
              ref={picker}
              type="file"
              accept=".json,application/json"
              className="quiet-line__input"
              aria-label="Open a project file"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) onOpenFile(file);
              }}
            />
            {fileError !== undefined && fileError !== null && (
              <p className="quiet-line__error">{fileError}</p>
            )}
          </>
        )
      }
    >
      <ul className="presets">
        {PRESETS.map((preset) => (
          <li key={preset.id}>
            <button
              type="button"
              className="presets__option"
              aria-pressed={chosen === preset.id}
              onClick={() => onChoose(preset.id)}
            >
              <span className="presets__label">{preset.label}</span>
              {preset.examples !== "" && (
                <span className="presets__examples">{preset.examples}</span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </Question>
  );
}
