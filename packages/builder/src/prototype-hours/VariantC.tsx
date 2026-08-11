/**
 * PROTOTYPE — throwaway. Variant C: **Monday, then the rest.**
 *
 * The screen starts as one day. Answer Monday and the other six appear, each carrying a one-tap
 * *Same* that copies Monday's times down — so the common week is typed once and tapped four
 * times, without the owner ever meeting a bulk abstraction, a day-range, or a rule about the
 * week.
 *
 * It is the variant that keeps §7.2's per-screen rule most nearly intact: still seven days, but
 * only ever one of them is asking anything. §7.3 holds because *Same* copies what the owner
 * typed rather than what we guessed — an empty Monday copies nothing, and the chip does not
 * appear.
 */

import { useState, type JSX } from "react";
import type { Interval, Weekday } from "@linkpage/renderer";
import {
  DAY_LONG,
  NoteField,
  TimeBox,
  WEEK,
  type DayMode,
  type Days,
  type TimeControl,
} from "./kit.js";

export const NAME = "Monday, then the rest";
export const HINT = "Start with Monday. The rest of the week can copy it.";

const REST = WEEK.slice(1);

export function VariantC({
  days,
  note,
  onDays,
  onNote,
  control,
}: {
  readonly days: Days;
  readonly note: string;
  readonly onDays: (next: Days) => void;
  readonly onNote: (next: string) => void;
  readonly control: TimeControl;
}): JSX.Element {
  const [expanded, setExpanded] = useState<ReadonlySet<Weekday>>(new Set());

  const monday = days.mon;
  const mondayTimes = monday.intervals.filter(([o, c]) => o !== "" && c !== "");
  const mondayAnswered = monday.mode === "closed" || mondayTimes.length > 0;

  function set(day: Weekday, mode: DayMode, intervals?: readonly Interval[]): void {
    onDays({
      ...days,
      [day]: { mode, intervals: intervals ?? (mode === "open" ? [["", ""]] : [["", ""]]) },
    });
  }

  function editInterval(day: Weekday, index: number, at: 0 | 1, value: string): void {
    onDays({
      ...days,
      [day]: {
        mode: "open",
        intervals: days[day].intervals.map((slot, i) =>
          i === index ? (at === 0 ? [value, slot[1]] : [slot[0], value]) : slot,
        ),
      },
    });
  }

  // Declared as a call rather than a nested component on purpose: a component defined inside
  // the render body is a new type every render, so React unmounts and remounts the whole
  // subtree on each keystroke — which cost this variant its second interval before anyone got
  // to judge its shape.
  function dayTimes(day: Weekday): JSX.Element {
    return (
      <div className="days__times">
        {days[day].intervals.map((interval, index) => (
          <div className="row" key={index}>
            <TimeBox
              control={control}
              label={`${DAY_LONG[day]} opens`}
              value={interval[0]}
              onChange={(value) => editInterval(day, index, 0, value)}
            />
            <span className="proto-to">to</span>
            <TimeBox
              control={control}
              label={`${DAY_LONG[day]} closes`}
              value={interval[1]}
              onChange={(value) => editInterval(day, index, 1, value)}
            />
          </div>
        ))}
        <button
          type="button"
          className="proto-link"
          onClick={() =>
            onDays({
              ...days,
              [day]: { mode: "open", intervals: [...days[day].intervals, ["", ""]] },
            })
          }
        >
          Add another time
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="proto-first">
        <span className="field__label">Monday</span>
        <div className="proto-chips">
          <button
            type="button"
            className="proto-chip"
            aria-pressed={monday.mode === "open"}
            onClick={() => set("mon", "open")}
          >
            Open
          </button>
          <button
            type="button"
            className="proto-chip"
            aria-pressed={monday.mode === "closed"}
            onClick={() => set("mon", "closed")}
          >
            Closed
          </button>
          <button
            type="button"
            className="proto-chip"
            aria-pressed={monday.mode === "unset"}
            onClick={() => set("mon", "unset")}
          >
            Don&rsquo;t say
          </button>
        </div>
        {monday.mode === "open" && dayTimes("mon")}
      </div>

      {mondayAnswered && (
        <ul className="days">
          {REST.map((day) => {
            const form = days[day];
            const same =
              form.mode === "open" &&
              !expanded.has(day) &&
              JSON.stringify(form.intervals) === JSON.stringify(monday.intervals);
            return (
              <li key={day} className="days__day">
                <span className="field__label">{DAY_LONG[day]}</span>
                <div className="proto-chips">
                  {mondayTimes.length > 0 && (
                    <button
                      type="button"
                      className="proto-chip"
                      aria-pressed={same}
                      onClick={() => {
                        setExpanded(new Set([...expanded].filter((d) => d !== day)));
                        set(day, "open", monday.intervals);
                      }}
                    >
                      Same as Monday
                    </button>
                  )}
                  <button
                    type="button"
                    className="proto-chip"
                    aria-pressed={form.mode === "open" && !same}
                    onClick={() => {
                      setExpanded(new Set([...expanded, day]));
                      set(day, "open", form.mode === "open" ? form.intervals : [["", ""]]);
                    }}
                  >
                    Different times
                  </button>
                  <button
                    type="button"
                    className="proto-chip"
                    aria-pressed={form.mode === "closed"}
                    onClick={() => {
                      setExpanded(new Set([...expanded].filter((d) => d !== day)));
                      set(day, "closed");
                    }}
                  >
                    Closed
                  </button>
                  <button
                    type="button"
                    className="proto-chip"
                    aria-pressed={form.mode === "unset"}
                    onClick={() => {
                      setExpanded(new Set([...expanded].filter((d) => d !== day)));
                      set(day, "unset");
                    }}
                  >
                    Don&rsquo;t say
                  </button>
                </div>
                {form.mode === "open" && !same && dayTimes(day)}
              </li>
            );
          })}
        </ul>
      )}

      <NoteField note={note} onChange={onNote} />
    </>
  );
}
