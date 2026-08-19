/**
 * Opening hours, turned from stored intent into rows a page can show (`SPEC.md` §2.3).
 *
 * This is the one section with real logic in it, so it lives apart from the markup: everything
 * below is pure and total, takes `unknown`, and returns data rather than HTML. `render.ts`
 * decides what the rows look like; this file decides what they say.
 *
 * **The three rules that come from the spec rather than from taste:**
 *
 * - A day holds **zero or more intervals**, because one open/close pair per day is wrong on day
 *   one for restaurants open 11–2 and 5–9 and for salons that close for lunch.
 * - **A day present with an empty array is explicitly closed; a day absent is unspecified.**
 *   Those are different facts and the page must not flatten them — an unspecified day is left
 *   out of the list entirely, a closed one gets a row that says so.
 * - **`clock` and `weekStart` are display preferences.** Storage is always 24-hour `"HH:MM"`
 *   and always Monday-first here; neither preference changes what is in the file.
 *
 * **The words are not this file's** (#48). The seven abbreviations and "closed" are the only
 * text the renderer writes that the owner did not, and they arrive as a `Vocabulary` resolved
 * from the same `lang` that `<html lang>` declares — see `locale.ts` for the table, for why
 * `Intl` is ruled out, and for what happens to a language the table does not hold.
 *
 * **Runs are not collapsed, and that is a decided refusal rather than a deferral** (§2.3).
 * "Mon–Fri 9–5" does not appear on an exported page. **The reason is not that it is hard — it
 * is that nobody has ever complained about these rows.** Entry was measured and found wanting
 * and §7.10 fixed it; the page's hours block produced no finding at all. Collapsing buys about
 * 110px on a phone and costs a permanent synthesis step in the one component that must never
 * state an opening time the business does not keep.
 *
 * **Correctness was never the obstacle, and the dispatching rule is recorded so that the refusal
 * is not overturned by rediscovering that it is possible.** Compute runs in *display* order and
 * the `weekStart` wrap disappears. Require every day in a run to be *present* and an unspecified
 * day can never sit inside one. Require an **identical formatted interval list** and both the
 * multi-interval mismatch and the closed-day-inside-a-run disappear at once, because an empty
 * list never equals a non-empty one. Minimum run length 3. `hoursView` is still the seam: it
 * returns rows, so a collapse would be a pure list-to-list step in front of the markup.
 *
 * Reopened by a real complaint from someone reading an exported page, and not by a capability —
 * CLDR ships weekday-range patterns per locale, so the range string was never the obstacle
 * either (§2.5).
 */

import { dayName, type Vocabulary } from "./locale.js";
import type { Clock, Weekday, WeekStart } from "./project.js";
import { asArray, asEnum, asRecord, asText } from "./values.js";

/**
 * A `"HH:MM"` time as the file stores it, tolerating a missing leading zero.
 *
 * Strict about the range rather than the shape: `"25:00"` is not a time, and a value that is
 * not a time is absent (§4.7). Anything else here would put a made-up hour on the page.
 */
const STORED_TIME = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;

/**
 * The week, Monday-first, which is how `Hours.days` is keyed regardless of `weekStart`.
 */
const WEEK_FROM_MONDAY: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** The en dash and its spaces, between the two halves of an interval. */
const RANGE = " \u2013 ";

const CLOCKS: readonly Clock[] = ["12h", "24h"];
const WEEK_STARTS: readonly WeekStart[] = ["mon", "sun"];

/** One day's row. `intervals` empty means the day is explicitly closed. */
export interface HoursRow {
  readonly day: Weekday;
  /** The day's display label in the page's language — `"Mon"`, `"Llun"`, `"月"`. */
  readonly label: string;
  /** Formatted ranges — `["9:00 AM – 5:00 PM"]`. Empty means closed. */
  readonly intervals: readonly string[];
}

/** Everything the hours section needs, with nothing left to decide. */
export interface HoursView {
  readonly rows: readonly HoursRow[];
  /**
   * What a row with no intervals says, already in the page's language.
   *
   * It sits on the view rather than being a constant `render.ts` imports because it is one of
   * the eight strings `locale.ts` translates, and this interface's promise is that nothing is
   * left to decide.
   */
  readonly closed: string;
  /** The free-text note: bank holidays, "by appointment", seasonal changes (§2.3). */
  readonly note?: string;
}

/**
 * Format one stored time for display, or `undefined` if it is not a time.
 *
 * 24-hour output is zero-padded, so a column of times aligns. 12-hour output is not, because
 * `"09:00 AM"` is not how anyone writes it — and midnight and noon are the two cases a naive
 * modulo gets wrong, so they are handled explicitly.
 */
export function formatTime(value: unknown, clock: Clock): string | undefined {
  const raw = asText(value);
  if (raw === undefined) return undefined;

  const match = STORED_TIME.exec(raw);
  if (!match) return undefined;

  const hour = Number(match[1]);
  const minute = match[2];

  if (clock === "24h") return `${String(hour).padStart(2, "0")}:${minute}`;

  const suffix = hour < 12 ? "AM" : "PM";
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${minute} ${suffix}`;
}

/**
 * One `[open, close]` pair, formatted, or `undefined` if either end is unreadable.
 *
 * An interval with one usable end is dropped rather than shown half-open: "from 9:00" is a
 * claim about closing time that the file does not make.
 */
function formatInterval(value: unknown, clock: Clock): string | undefined {
  const pair = asArray(value);
  const open = formatTime(pair[0], clock);
  const close = formatTime(pair[1], clock);
  if (open === undefined || close === undefined) return undefined;
  return `${open}${RANGE}${close}`;
}

/**
 * Read the `hours` block into rows, or `undefined` when there is nothing to show.
 *
 * Nothing to show means no readable day *and* no note — an hours block that survives as an
 * empty object in a hand-edited file produces no section rather than an empty panel.
 *
 * **`words` is the page's language, resolved** (`locale.ts`). It is a parameter rather than a
 * lookup done here because the tag it came from is the same one `<html lang>` declares, and
 * the renderer resolves that once: the page must never announce one language and label its
 * days in another.
 */
export function hoursView(value: unknown, words: Vocabulary): HoursView | undefined {
  const hours = asRecord(value);
  if (!hours) return undefined;

  const clock = asEnum(hours.clock, CLOCKS, "24h");
  const weekStart = asEnum(hours.weekStart, WEEK_STARTS, "mon");
  const days = asRecord(hours.days);

  const rows: HoursRow[] = [];
  if (days) {
    for (const day of orderedWeek(weekStart)) {
      // A day absent from `days` is unspecified and gets no row at all. Present-and-empty is
      // a different fact — the business is closed — and does.
      if (!Object.hasOwn(days, day)) continue;

      const stored = days[day];
      // A wrong-typed day reads as absent (§4.7) rather than as closed: claiming a business
      // is shut is a claim, and `"hourz"`-grade damage should not be able to make it.
      if (!Array.isArray(stored)) continue;

      const intervals: string[] = [];
      for (const entry of stored) {
        const formatted = formatInterval(entry, clock);
        if (formatted !== undefined) intervals.push(formatted);
      }
      rows.push({ day, label: dayName(words, day), intervals });
    }
  }

  const note = asText(hours.note);
  if (rows.length === 0 && note === undefined) return undefined;
  const closed = words.closed;
  return note === undefined ? { rows, closed } : { rows, closed, note };
}

/** The week rotated to start where the owner reads it starting. */
function orderedWeek(weekStart: WeekStart): readonly Weekday[] {
  if (weekStart === "mon") return WEEK_FROM_MONDAY;
  return [...WEEK_FROM_MONDAY.slice(6), ...WEEK_FROM_MONDAY.slice(0, 6)];
}
