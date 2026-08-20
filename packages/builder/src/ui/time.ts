import type { Clock } from "@linkpage/renderer";
import { formatTime } from "@linkpage/renderer";

/**
 * A time the way an owner would say it, turned into the `"HH:MM"` §2.3 stores.
 *
 * **We own a parser now, and that is a cost taken knowingly** (`SPEC.md` §7.10). What bought it
 * is speed — the native picker costs about five presses against one for a typed `9`, on the
 * screen §7.10 spent its whole budget making cheaper — plus a browser bug we cannot reach while
 * the control is the browser's. The clock alignment arrives free, which is the right order to
 * hold these reasons in.
 *
 * **The vocabulary is short because it is the page's vocabulary.** Digits, a separator, and
 * `am`/`pm`. **Not `noon`, not `midnight`**: the page will never print either word back (§2.5),
 * so they would be a kindness only English speakers can reach, for a convention the page does not
 * have.
 */
const TIME = /^(\d{1,4})(?:[:.](\d{2}))?\s*(am|pm)?$/;

export function parseTime(input: string): string | undefined {
  const text = input.trim().toLowerCase().replace(/\s+/g, " ");
  if (text === "") return undefined;

  const match = TIME.exec(text);
  if (!match) return undefined;

  const digits = match[1] ?? "";
  const meridiem = match[3];

  let hour: number;
  let minute: number;

  if (match[2] !== undefined) {
    // `9:30`, `17.00` — the separator settled it.
    hour = Number(digits);
    minute = Number(match[2]);
  } else if (digits.length <= 2) {
    // `9`, `17` — an hour on its own.
    hour = Number(digits);
    minute = 0;
  } else {
    // `930`, `1700` — the last two are the minutes, which is how a till reads them.
    hour = Number(digits.slice(0, digits.length - 2));
    minute = Number(digits.slice(-2));
  }

  if (!Number.isInteger(hour) || !Number.isInteger(minute) || minute > 59) return undefined;

  if (meridiem !== undefined) {
    // A meridiem means the hour is on a 12-hour clock, so `13pm` is not a time anybody means.
    if (hour < 1 || hour > 12) return undefined;
    if (meridiem === "am") hour = hour === 12 ? 0 : hour;
    else hour = hour === 12 ? 12 : hour + 12;
  } else if (hour > 23) {
    return undefined;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/**
 * How a stored time reads back, in the page's own convention.
 *
 * The renderer's own formatter, deliberately: **the box is a view of the stored time**, so what
 * it shows has to be what the page shows. A second implementation here is exactly the drift §5.2
 * exists to make impossible on the page, arriving through the entry screen instead.
 */
export function displayTime(stored: string, clock: Clock): string {
  return formatTime(stored, clock) ?? "";
}
