/**
 * PROTOTYPE — throwaway. Wayfinder ticket #80, the opening-hours entry screen.
 *
 * Shared parts for the four variants: the day model they all edit, the time control whose two
 * versions answer the native-`<input type="time">` question, and the readout that shows what
 * the page would say.
 *
 * Nothing here is production shape. Throw all of it away once a variant wins.
 */

import { useState, type JSX } from "react";
import type { Hours, Interval, Weekday } from "@linkpage/renderer";

export const WEEK: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const WEEKDAYS_ONLY: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

export const DAY_LONG: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export const DAY_SHORT: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** §2.3's three states, as the entry screen has to hold them. */
export type DayMode = "unset" | "closed" | "open";

export interface DayForm {
  readonly mode: DayMode;
  readonly intervals: readonly Interval[];
}

export type Days = Record<Weekday, DayForm>;

export const BLANK_DAY: DayForm = { mode: "unset", intervals: [["", ""]] };

export function blankDays(): Days {
  return Object.fromEntries(WEEK.map((day) => [day, BLANK_DAY])) as Days;
}

/** What the flow would hand to the project. `clock`/`weekStart` are display prefs, not asked here. */
export function toHours(days: Days, note: string): Hours {
  const out: Partial<Record<Weekday, Interval[]>> = {};
  for (const day of WEEK) {
    const form = days[day];
    if (form.mode === "unset") continue;
    out[day] =
      form.mode === "closed"
        ? []
        : form.intervals
            .filter(([open, close]) => open !== "" && close !== "")
            .map(([open, close]) => [open, close] as Interval);
  }
  return { clock: "12h", weekStart: "mon", days: out, note };
}

/** Anything said at all — the same door `HoursQuestion` puts on Continue today. */
export function anythingSaid(days: Days, note: string): boolean {
  if (note.trim() !== "") return true;
  return WEEK.some((day) => {
    const form = days[day];
    if (form.mode === "unset") return false;
    if (form.mode === "closed") return true;
    return form.intervals.some(([open, close]) => open !== "" && close !== "");
  });
}

/* ------------------------------------------------------------------- times */

/** `"9"`, `"930"`, `"9am"`, `"9.30 pm"`, `"17:00"` → `"HH:MM"`, or `undefined`. */
export function parseTyped(raw: string): string | undefined {
  const text = raw.trim().toLowerCase().replace(/\s+/g, "");
  if (text === "") return undefined;
  if (text === "noon" || text === "midday") return "12:00";
  if (text === "midnight") return "00:00";

  const match = /^(\d{1,2})(?:[:.]?(\d{2}))?(am|pm|a|p)?$/.exec(text);
  if (!match) return undefined;

  let hour = Number(match[1]);
  const minute = match[2] === undefined ? 0 : Number(match[2]);
  const suffix = match[3];

  if (minute > 59) return undefined;
  if (suffix !== undefined) {
    if (hour < 1 || hour > 12) return undefined;
    const pm = suffix.startsWith("p");
    hour = hour === 12 ? (pm ? 12 : 0) : pm ? hour + 12 : hour;
  } else if (hour > 23) return undefined;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** Stored 24-hour time as the page would print it under a 12-hour preference. */
export function show12h(stored: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(stored);
  if (!match) return stored;
  const hour = Number(match[1]);
  const suffix = hour < 12 ? "AM" : "PM";
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${match[2]} ${suffix}`;
}

export type TimeControl = "native" | "typed";

/**
 * One time box. The `control` axis is the ticket's fourth bullet made switchable: `native` is
 * what ships today — free, accessible, localised, and rendered in the *browser's* convention
 * rather than the page's — and `typed` is the cheapest custom answer, a text box that takes
 * what someone would say out loud and echoes back what the page will print.
 */
export function TimeBox({
  control,
  value,
  onChange,
  label,
  id,
}: {
  readonly control: TimeControl;
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly id?: string;
}): JSX.Element {
  if (control === "native") {
    return (
      <input
        type="time"
        id={id}
        className="input proto-time"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
  return <TypedTime id={id} label={label} value={value} onChange={onChange} />;
}

function TypedTime({
  value,
  onChange,
  label,
  id,
}: {
  readonly value: string;
  readonly onChange: (next: string) => void;
  readonly label: string;
  readonly id?: string;
}): JSX.Element {
  const [text, setText] = useState(() => (value === "" ? "" : show12h(value)));
  const parsed = parseTyped(text);
  const unusable = text.trim() !== "" && parsed === undefined;

  return (
    <span className="proto-typed">
      <input
        type="text"
        id={id}
        inputMode="numeric"
        className="input proto-time"
        aria-label={label}
        placeholder="9am"
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => {
          const next = parseTyped(text);
          onChange(next ?? "");
          if (next !== undefined) setText(show12h(next));
        }}
      />
      {unusable && <span className="proto-typed__warn">We can&rsquo;t read that as a time</span>}
    </span>
  );
}

/* ----------------------------------------------------------------- readout */

/** What the exported page would print, day by day. Prototype scaffolding, not a preview. */
export function Readout({ hours }: { readonly hours: Hours }): JSX.Element {
  const rows = WEEK.filter((day) => hours.days[day] !== undefined);
  return (
    <div className="proto-readout">
      <p className="proto-readout__title">What the page would say</p>
      {rows.length === 0 && hours.note?.trim() === "" ? (
        <p className="proto-readout__empty">No hours section at all.</p>
      ) : (
        <ul className="proto-readout__list">
          {rows.map((day) => {
            const intervals = hours.days[day] ?? [];
            return (
              <li key={day}>
                <span>{DAY_SHORT[day]}</span>
                <span>
                  {intervals.length === 0
                    ? "Closed"
                    : intervals.map(([o, c]) => `${show12h(o)} – ${show12h(c)}`).join(", ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      {hours.note?.trim() !== "" && <p className="proto-readout__note">{hours.note}</p>}
      <p className="proto-readout__absent">
        {WEEK.filter((day) => hours.days[day] === undefined).length} day(s) unspecified — no row.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------ small pieces */

/** A note field, identical in all four so it is not what is being judged. */
export function NoteField({
  note,
  onChange,
}: {
  readonly note: string;
  readonly onChange: (next: string) => void;
}): JSX.Element {
  return (
    <div className="field">
      <label className="field__label" htmlFor="proto-note">
        Anything else about your hours?
      </label>
      <span className="field__hint" id="proto-note-hint">
        Bank holidays, seasonal changes.
      </span>
      <input
        type="text"
        id="proto-note"
        aria-describedby="proto-note-hint"
        className="input"
        value={note}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

/**
 * What happens to the days the owner never mentioned.
 *
 * Three of the four variants need this, because they let the owner name only the days they are
 * open — which leaves *unset* and *explicitly closed* indistinguishable unless something asks.
 * §2.3 says those are two different facts, so this is where the third state goes when the
 * per-day control has stopped carrying it.
 */
export function RestOfWeek({
  closed,
  onChange,
  count,
}: {
  readonly closed: boolean;
  readonly onChange: (next: boolean) => void;
  readonly count: number;
}): JSX.Element | null {
  if (count === 0) return null;
  return (
    <fieldset className="proto-rest">
      <legend className="field__label">The other {count} day(s)</legend>
      <label className="proto-rest__option">
        <input type="radio" name="proto-rest" checked={!closed} onChange={() => onChange(false)} />
        <span>Don&rsquo;t say anything</span>
      </label>
      <label className="proto-rest__option">
        <input type="radio" name="proto-rest" checked={closed} onChange={() => onChange(true)} />
        <span>Say we&rsquo;re closed</span>
      </label>
    </fieldset>
  );
}
