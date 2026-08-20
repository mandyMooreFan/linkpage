import type { Clock } from "@linkpage/renderer";
import { useEffect, useId, useState, type JSX } from "react";
import { displayTime, parseTime } from "./time.js";

/**
 * One time, typed rather than picked (`SPEC.md` §7.10).
 *
 * **The box is a view of the stored time, not a field of its own.** Type `9am`, leave it, and it
 * reads `9:00 AM` — or `09:00` if the owner has set *How times read* to 24-hour, and flipping
 * that control later changes these boxes with it.
 *
 * **This is the one place §2.3's _mend the target, never the text_ does not reach**, and the
 * difference is worth stating rather than assuming. Phone, email and the URLs are the owner's
 * text plus a derived target, so the text is protected. **A time has no text**: §2.3 stores only
 * `"HH:MM"` and the page prints it through `clock`, so the stored value *is* the derived target.
 * There is nothing of the owner's to preserve, and the rewrite is the cheapest confirmation that
 * we understood them.
 *
 * **An unreadable time is said and then dropped, and nothing outlives the screen.** §7.9's line
 * on leaving the field, blocking nothing, and then the value is simply not stored. The other four
 * marked fields keep the owner's text in the file, so their mark can be re-derived forever; a
 * refused time never enters the file at all, and carrying a mark would mean storing a value that
 * is not page content and never will be.
 *
 * The renderer's `cleanHours` is what makes that safe: an open day whose intervals all fail to
 * parse drops back to *unspecified* rather than surviving as present-and-empty, which §2.3 would
 * print as *Closed*. So an unreadable time can never publish "we're shut" on a day the business is
 * open. **The known cost is that a lost second interval of a split shift is far less visible than
 * a lost day.**
 */
export function TimeBox({
  label,
  value,
  clock,
  onChange,
}: {
  readonly label: string;
  /** The stored `"HH:MM"`, or `""` when the day has no time here yet. */
  readonly value: string;
  readonly clock: Clock;
  readonly onChange: (stored: string) => void;
}): JSX.Element {
  const [text, setText] = useState(() => displayTime(value, clock));
  const [message, setMessage] = useState<string | undefined>(undefined);
  const messageId = useId();

  // Re-read whenever the stored time changes from outside the box — a carry, a copy, or the
  // owner flipping *How times read*. This is what "a view of the stored time" means in practice.
  useEffect(() => {
    setText(displayTime(value, clock));
    setMessage(undefined);
  }, [value, clock]);

  /**
   * On leaving the field, per §7.9 decision 2 — late to speak, quick to stop.
   *
   * Pressing `Continue` reaches this too: a pointer or a keyboard moving to the button blurs the
   * box first, so the same commit runs. It blocks nothing either way, which is §7.9 decision 1.
   */
  const commit = (): void => {
    const raw = text.trim();
    if (raw === "") {
      setMessage(undefined);
      onChange("");
      return;
    }

    const stored = parseTime(raw);
    if (stored === undefined) {
      // Consequence first, then the fix. *Invalid*, *format* and *valid* are banned (§7.9).
      setMessage("This time won't reach your page — try 5:30pm");
      onChange("");
      return;
    }

    setMessage(undefined);
    onChange(stored);
    setText(displayTime(stored, clock));
  };

  return (
    <span className="flex w-full flex-col">
      <input
        type="text"
        className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
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
