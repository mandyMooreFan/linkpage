import { useEffect, useRef, useState } from "react";
import type { Draft } from "../../project/index.js";

/**
 * Tell the screen what the owner has typed so far, so the page beside the question can show it
 * before `Continue` (#373). `SPEC.md` §7.1, §7.2, §7.6.
 *
 * Every question holds its answer in its own state until the owner presses `Continue`, and
 * only then hands it through a door in `topics.ts`. That stays exactly so — **nothing is
 * written until something is answered** — but on a laptop the page sits open beside the
 * question, and a page that holds still while the name is typed and only moves one screen
 * later reads as a page that did not notice. So a question reports its answer *as it stands*
 * every time it changes, and `Flow.tsx` shows that answer on the page and nowhere else.
 *
 * **Reported from an effect on the answer, not from every setter.** A question with seven
 * setters (hours) and one with one (the name) then report the same way, and a question that
 * forgets to report is a question that forgot one line. The callback is read through a ref so
 * that the effect depends on the answer alone: the screen hands each question a fresh closure
 * on every render, and an effect keyed on that would fire, be reported, re-render the screen
 * and fire again, for ever.
 *
 * **Not on mount.** The screen already shows what the draft holds when a question opens
 * pre-filled, and an answer nobody has touched is not typing.
 */
export function useTyping<T>(answer: T, onTyping: ((answer: T) => void) | undefined): void {
  const latest = useRef(onTyping);
  useEffect(() => {
    latest.current = onTyping;
  });

  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current) {
      touched.current = true;
      return;
    }
    latest.current?.(answer);
  }, [answer]);
}

/**
 * How long after the last keystroke the page beside the question catches up (#373).
 *
 * The frame is a `srcdoc` iframe, so every change to the page is a document reload. A quarter
 * of a second is under the pause between two words and over the gap between two letters: the
 * page moves while the owner is still on the screen, and not while they are still in a word.
 * The appearance ritual settles for longer than this before every frame, so a `-filled` shot
 * is of the page with the answer on it.
 */
export const TYPING_SETTLE_MS = 250;

export interface TypedPage {
  /** The draft as the page shows it while an answer is typed, or `null`: show what is written. */
  readonly typed: Draft | null;
  /** Show an answer in progress on the page, once the keys have paused. */
  readonly show: (next: Draft) => void;
  /** The owner has left the question: the page shows what is written, and a pause still running shows nothing. */
  readonly drop: () => void;
}

/**
 * The screen's half of the same rule: what the page beside the question shows.
 *
 * Both screens hold one of these — the flow beside its question, the list beside its rows —
 * and hand `show` what a question reports through the same door `Continue` would use. What it
 * returns goes to the preview and nowhere else: not to the draft the screen holds, not to
 * `onChange`, not to storage. That is §7.2's "nothing is written until something is answered"
 * kept exactly, with the page allowed to look ahead.
 */
export function useTypedPage(): TypedPage {
  const [typed, setTyped] = useState<Draft | null>(null);
  const settling = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(settling.current), []);

  const show = (next: Draft): void => {
    clearTimeout(settling.current);
    settling.current = setTimeout(() => setTyped(next), TYPING_SETTLE_MS);
  };
  const drop = (): void => {
    clearTimeout(settling.current);
    setTyped(null);
  };
  return { typed, show, drop };
}
