import { useEffect, useRef, useState, type JSX } from "react";
import type { FileDownload } from "../download/index.js";
import { Button } from "../ui/Button.js";

/**
 * The confirmation that turns a warning into a fork. `SPEC.md` §7.8.
 *
 * > **An existing project → confirm concretely:** _"You're working on **Ada's Bakery**. Opening
 * > this file will replace it."_
 *
 * **Naming it is what makes the confirmation informative rather than a reflex.** _Are you sure?_
 * is a sentence the owner has learned to press through; the name of their own shop is not, and it
 * is the difference between a dialog that is read and one that is dismissed.
 *
 * **The escape is the part that matters.** Import always replaces and never merges (§7.8), there
 * is no undo — localStorage holds one project, so undo means inventing a second slot and a
 * lifetime for it — and there is deliberately **no silent auto-download** of the outgoing
 * project, which would be the same preservation without consent. What is left is an offer, and
 * with it both branches of this fork are safe: download and replace, or replace knowing you
 * chose not to.
 *
 * **Focus and weight answer different questions, so they point at different buttons.** The
 * keyboard lands on the escape, because the OS picker has just closed and an unaimed press must
 * not be the one that replaces the project. The solid fill sits on _Open the file_, because that
 * is the errand the owner is here on — they picked a file. The two used to agree, and reading
 * that agreement as a rule made the escape the loudest thing on the screen while the errand was
 * merely outlined. Focus order is about what a press nobody aimed does; weight is about what the
 * screen is for. Nothing in the safe-focus argument above ever depended on the escape also being
 * the primary, which is why that argument survives the swap unchanged.
 *
 * **Why this appears after the file is picked, not before.** "Opening _this file_ will replace
 * it" is a sentence about a file the owner has already chosen — and by the time it is on screen
 * that file has already been parsed and validated, so a mistyped `index.html` is refused
 * outright (§7.9) instead of prompting a replacement that could not have happened. The owner is
 * only ever asked to weigh a swap that will work.
 *
 * **Downloading does not open the file.** The two are separate presses because the escape can
 * fail — a blocked download, a full disk — and an import that fired itself off the back of one
 * would be the auto-download this section rules out, arriving one step later.
 */

export interface ReplaceConfirmProps {
  /**
   * The outgoing project's business name. Absent only for a project that has one typed but not
   * yet a name — which still counts as something to lose (§7.8), so the sentence stands without
   * it rather than the confirmation being skipped.
   */
  readonly name?: string;
  /** §7.8's escape: the outgoing project, under §7.7's name for it. */
  readonly outgoing: FileDownload;
  /** Replace. The caller has the validated text and does the swap. */
  readonly onOpen: () => void;
  /** Keep what is there. The picked file is dropped and nothing anywhere changed. */
  readonly onCancel: () => void;
}

export function ReplaceConfirm({
  name,
  outgoing,
  onOpen,
  onCancel,
}: ReplaceConfirmProps): JSX.Element {
  /**
   * Whether the escape has been taken, for this confirmation only.
   *
   * It dies with the component, which is what keeps it clear of §7.7's rule that **nothing
   * tracks downloaded versus changed since**. That rule is about the editing screen carrying a
   * badge that goes stale; this is an acknowledgement that the press did something, on a surface
   * that exists for the length of one decision.
   */
  const [saved, setSaved] = useState(false);
  const escape = useRef<HTMLButtonElement>(null);

  // The OS picker has just closed, so the keyboard is nowhere useful. It lands on the safe
  // branch of the fork rather than on the one that replaces the project — which stays true with
  // the fill on `Open the file`, because where focus starts and what the screen emphasises are
  // separate decisions (see the docblock).
  useEffect(() => {
    escape.current?.focus();
  }, []);

  return (
    <div
      className="font-sans"
      data-replace
      role="group"
      aria-label="Opening this file will replace your project"
    >
      <p className="m-0">
        {name === undefined ? (
          <>You’re working on a project you haven’t named yet.</>
        ) : (
          <>
            You’re working on <strong>{name}</strong>.
          </>
        )}{" "}
        Opening this file will replace it.
      </p>

      {/*
       * One alignment for the stack. `items-start` rather than three per-button decisions: the
       * outlined and quiet weights already start-align themselves, and the filled one used to
       * stretch to the full width, so a fork of three choices sat at two different left-to-right
       * shapes at once.
       */}
      <div className="mt-3 flex flex-col items-start gap-2">
        <Button
          type="button"
          weight="secondary"
          ref={escape}
          onClick={() => {
            outgoing.save();
            setSaved(true);
          }}
        >
          Download my work first
        </Button>
        <Button type="button" weight="primary" onClick={onOpen}>
          Open the file
        </Button>
        <Button type="button" weight="quiet" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Names the file, because what the owner has to recognise later is a name in a folder. */}
      {saved && (
        <p className="mt-2 text-sm text-ink-quiet" role="status">
          Saved as <code>{outgoing.filename}</code>.
        </p>
      )}
    </div>
  );
}
