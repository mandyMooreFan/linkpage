import type { Clock } from "@linkpage/renderer";
import { useEffect, useId, useState, type JSX } from "react";
import { useJudged } from "../flow/questions/Question.js";
import { displayTime, parseTime } from "./time.js";
import { TextInput } from "./TextInput.js";

/**
 * One time, typed rather than picked (`SPEC.md` §7.10).
 *
 * **The box is a view of the stored time, not a field of its own.** Type `9am`, leave it, and it
 * reads `9:00 AM` — or `09:00` if the owner has set *How times read* to 24-hour, and flipping
 * that control later changes these boxes with it.
 *
 * **The rewrite this box does was once unique, and is no longer** — since #142's decision 4,
 * web addresses and emails are also written back mended (`topics.ts`'s doors). What is still
 * particular here: **a time has no text.** §2.3 stores only `"HH:MM"` and the page prints it
 * through `clock`, so the stored value *is* the derived target, there is nothing of the owner's
 * to preserve, and the rewrite is the cheapest confirmation that we understood them. Phone
 * remains the one field whose text is fully protected — its normalisation lives in the href
 * alone.
 *
 * **An unreadable time is judged on `Continue`, not on leaving the field** (§7.9 decision 2 as
 * amended, #142 — the #138 walk's clearest moment was this screen marking answers wrong before
 * they were finished). Leaving the box is silent either way: a readable time is stored and read
 * back, an unreadable one stores nothing and keeps the owner's text on screen for the sentence
 * to point at. On `Continue` the sentence appears under the box and the screen stays; it
 * disappears the moment the value becomes usable. Late to speak, quick to stop — and once
 * cleared or fixed, nothing outlives the screen, exactly as before.
 *
 * The renderer's `cleanHours` is what makes the stored side safe: an open day whose intervals
 * all fail to parse drops back to *unspecified* rather than surviving as present-and-empty, so
 * an unreadable time can never publish "we're shut" on a day the business is open.
 */
export function TimeBox({
  label,
  name,
  value,
  clock,
  onChange,
}: {
  readonly label: string;
  /** The judgement's name (§7.9, `useJudged`); unique within the question. */
  readonly name: string;
  /** The stored `"HH:MM"`, or `""` when the day has no time here yet. */
  readonly value: string;
  readonly clock: Clock;
  readonly onChange: (stored: string) => void;
}): JSX.Element {
  const [text, setText] = useState(() => displayTime(value, clock));
  const messageId = useId();

  const message = useJudged(name, text, (raw) =>
    raw.trim() === "" || parseTime(raw.trim()) !== undefined
      ? true
      : // Consequence first, then the fix. *Invalid*, *format* and *valid* are banned (§7.9).
        "This time won't reach your page — try 5:30pm",
  );

  // Re-read whenever the stored time changes from outside the box — a carry, a copy, or the
  // owner flipping *How times read*. This is what "a view of the stored time" means in
  // practice — with one exception: unreadable text the owner just typed stays put, because a
  // blur stores nothing for it and the judgement's sentence needs it on screen to point at.
  useEffect(() => {
    setText((current) =>
      value === "" && current.trim() !== "" && parseTime(current.trim()) === undefined
        ? current
        : displayTime(value, clock),
    );
  }, [value, clock]);

  /** On leaving the field: store what can be stored, silently. Judgement waits for Continue. */
  const commit = (): void => {
    const raw = text.trim();
    if (raw === "") {
      onChange("");
      return;
    }
    const stored = parseTime(raw);
    if (stored === undefined) {
      // Keep the owner's text on screen for the sentence to point at; store nothing.
      onChange("");
      return;
    }
    onChange(stored);
    setText(displayTime(stored, clock));
  };

  return (
    <span className="flex w-full flex-col">
      <TextInput
        type="text"
        aria-label={label}
        {...(message === undefined ? {} : { "aria-describedby": messageId })}
        value={text}
        inputMode="numeric"
        spellCheck={false}
        autoCapitalize="none"
        onChange={(event) => setText(event.target.value)}
        onBlur={commit}
      />
      {message !== undefined && (
        <span className="mt-1 block text-sm text-notice" id={messageId} data-message role="status">
          {message}
        </span>
      )}
    </span>
  );
}
