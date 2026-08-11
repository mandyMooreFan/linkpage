/**
 * PROTOTYPE — throwaway. Variant D: **the same seven days, made short.**
 *
 * The conservative answer, and the control for the other three: keep today's structure — seven
 * days, three states each, native pickers — and attack only what the walk actually measured,
 * which was **1516px of screen**. Each day collapses to one line, the `<select>` becomes a
 * segmented control that shows all three states without opening anything, and the bulk ask is a
 * *copy* from a day the owner has already filled in rather than a new concept above the list.
 *
 * If D is enough, the complaint was density and the shape was never wrong. That is worth being
 * able to lose to on purpose.
 */

import { useState, type JSX } from "react";
import type { Weekday } from "@linkpage/renderer";
import {
  DAY_LONG,
  DAY_SHORT,
  NoteField,
  TimeBox,
  WEEK,
  WEEKDAYS_ONLY,
  type DayMode,
  type Days,
  type TimeControl,
} from "./kit.js";

export const NAME = "The same seven days, made short";
export const HINT = "Leave a day alone if you'd rather not say.";

const MODES: readonly { readonly mode: DayMode; readonly label: string }[] = [
  { mode: "unset", label: "—" },
  { mode: "closed", label: "Closed" },
  { mode: "open", label: "Open" },
];

export function VariantD({
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
  const [copying, setCopying] = useState<Weekday | undefined>(undefined);

  function copyFrom(source: Weekday, targets: readonly Weekday[]): void {
    const next = { ...days };
    for (const day of targets) {
      if (day === source) continue;
      next[day] = { mode: "open", intervals: days[source].intervals };
    }
    onDays(next);
    setCopying(undefined);
  }

  return (
    <>
      <ul className="proto-table">
        {WEEK.map((day) => {
          const form = days[day];
          const filled =
            form.mode === "open" &&
            form.intervals.some(([open, close]) => open !== "" && close !== "");
          return (
            <li key={day} className="proto-table__row">
              <div className="proto-table__head">
                <span className="proto-table__day">
                  <span aria-hidden="true">{DAY_SHORT[day]}</span>
                  <span className="proto-sr">{DAY_LONG[day]}</span>
                </span>
                <div className="proto-segmented" role="group" aria-label={DAY_LONG[day]}>
                  {MODES.map(({ mode, label }) => (
                    <button
                      key={mode}
                      type="button"
                      className="proto-segmented__button"
                      aria-pressed={form.mode === mode}
                      aria-label={mode === "unset" ? `${DAY_LONG[day]}: don't say` : undefined}
                      onClick={() => onDays({ ...days, [day]: { ...form, mode } })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.mode === "open" && (
                <div className="proto-table__times">
                  {form.intervals.map((interval, index) => (
                    <div className="row" key={index}>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} opens`}
                        value={interval[0]}
                        onChange={(value) =>
                          onDays({
                            ...days,
                            [day]: {
                              mode: "open",
                              intervals: form.intervals.map((slot, at) =>
                                at === index ? [value, slot[1]] : slot,
                              ),
                            },
                          })
                        }
                      />
                      <span className="proto-to">to</span>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} closes`}
                        value={interval[1]}
                        onChange={(value) =>
                          onDays({
                            ...days,
                            [day]: {
                              mode: "open",
                              intervals: form.intervals.map((slot, at) =>
                                at === index ? [slot[0], value] : slot,
                              ),
                            },
                          })
                        }
                      />
                    </div>
                  ))}
                  <div className="row proto-table__actions">
                    <button
                      type="button"
                      className="proto-link"
                      onClick={() =>
                        onDays({
                          ...days,
                          [day]: { mode: "open", intervals: [...form.intervals, ["", ""]] },
                        })
                      }
                    >
                      Add another time
                    </button>
                    {filled &&
                      (copying === day ? (
                        <>
                          <button
                            type="button"
                            className="proto-link"
                            onClick={() => copyFrom(day, WEEKDAYS_ONLY)}
                          >
                            to weekdays
                          </button>
                          <button
                            type="button"
                            className="proto-link"
                            onClick={() => copyFrom(day, WEEK)}
                          >
                            to every day
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="proto-link"
                          onClick={() => setCopying(day)}
                        >
                          Copy these times&hellip;
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <NoteField note={note} onChange={onNote} />
    </>
  );
}
