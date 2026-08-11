/**
 * PROTOTYPE — throwaway. Variant D and its two descendants: **the same seven days, made short.**
 *
 * D was the conservative answer and the control for the other three: keep today's structure —
 * seven days, three states each, native pickers — and attack only what the walk actually
 * measured, which was 1516px. Each day collapses to one line, the `<select>` becomes a segmented
 * control that shows all three states without opening anything, and the bulk ask is a *copy* from
 * a day the owner has already filled in rather than a new concept above the list.
 *
 * **D won, and the measurement said what it still owes: opening a day costs typing a time.**
 * Density fixed the day rows; nothing fixed the rows underneath them. So E and F carry the last
 * times the owner typed **down into the next day they open**, and differ on the one thing that
 * decides whether that is allowed at all:
 *
 * - **E carries silently.** Tap *Open* on Tuesday and 9:00–5:00 is simply there.
 * - **F carries in the open.** The same times arrive wearing *from Mon*, which survives until the
 *   owner touches that day's times, and then goes.
 *
 * That difference is §7.3, and it is the whole reason both exist. The rule forbids *a wrong fact
 * the owner never notices we asserted*, and its example is default opening hours. Carried times
 * are not defaults — they are the owner's own answer, moved — which is the same ground *Same as
 * Monday* stands on. But §7.3's teeth are in **never notices**, not in *whose value it was*: an
 * owner who taps Open on Thursday to get to *Closed* and taps away has published 9–5 on a day
 * they meant to shut. E bets the filled boxes are noticed because the owner just opened that row.
 * F pays a line of chrome per carried day to make the claim say where it came from.
 *
 * Neither is a defaulted fact on the *empty* screen: nothing carries until the owner has typed a
 * time, so the screen still opens saying nothing (§7.3), and the very first day is always typed.
 */

import { useState, type JSX } from "react";
import type { Interval, Weekday } from "@linkpage/renderer";
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
export const NAME_E = "…and the times carry down, silently";
export const NAME_F = "…and the times carry down, saying so";
export const HINT = "Leave a day alone if you'd rather not say.";

/** How a newly-opened day gets its times. */
type Carry = "none" | "silent" | "marked";

const MODES: readonly { readonly mode: DayMode; readonly label: string }[] = [
  { mode: "unset", label: "—" },
  { mode: "closed", label: "Closed" },
  { mode: "open", label: "Open" },
];

function complete(intervals: readonly Interval[]): boolean {
  return intervals.some(([open, close]) => open !== "" && close !== "");
}

interface Props {
  readonly days: Days;
  readonly note: string;
  readonly onDays: (next: Days) => void;
  readonly onNote: (next: string) => void;
  readonly control: TimeControl;
}

export function VariantD(props: Props): JSX.Element {
  return <DenseDays {...props} carry="none" />;
}

export function VariantE(props: Props): JSX.Element {
  return <DenseDays {...props} carry="silent" />;
}

export function VariantF(props: Props): JSX.Element {
  return <DenseDays {...props} carry="marked" />;
}

function DenseDays({
  days,
  note,
  onDays,
  onNote,
  control,
  carry,
}: Props & { readonly carry: Carry }): JSX.Element {
  const [copying, setCopying] = useState<Weekday | undefined>(undefined);
  /** The day whose times carry down: the last one the owner filled in themselves. */
  const [source, setSource] = useState<Weekday | undefined>(undefined);
  /** Days holding carried times the owner has not touched. Only `marked` shows them. */
  const [carried, setCarried] = useState<ReadonlyMap<Weekday, Weekday>>(new Map());

  function forget(
    day: Weekday,
    from: ReadonlyMap<Weekday, Weekday>,
  ): ReadonlyMap<Weekday, Weekday> {
    const next = new Map(from);
    next.delete(day);
    return next;
  }

  function setMode(day: Weekday, mode: DayMode): void {
    const form = days[day];

    // The carry: a day opened with nothing in it takes the last times the owner typed. A day
    // that already holds times keeps them — reopening is not a reason to overwrite an answer.
    const takes =
      carry !== "none" &&
      mode === "open" &&
      !complete(form.intervals) &&
      source !== undefined &&
      source !== day;

    onDays({
      ...days,
      [day]: {
        mode,
        intervals: takes ? days[source].intervals : form.intervals,
      },
    });

    setCarried(takes ? new Map(carried).set(day, source) : forget(day, carried));
  }

  function editTime(day: Weekday, index: number, at: 0 | 1, value: string): void {
    const intervals = days[day].intervals.map((slot, i) =>
      i === index ? (at === 0 ? [value, slot[1]] : [slot[0], value]) : slot,
    ) as Interval[];
    onDays({ ...days, [day]: { mode: "open", intervals } });
    // Touched, so it is this owner's own answer again: it stops being marked, and it becomes
    // what the next day carries.
    setCarried(forget(day, carried));
    if (complete(intervals)) setSource(day);
  }

  function copyFrom(from: Weekday, targets: readonly Weekday[]): void {
    const next = { ...days };
    const marks = new Map(carried);
    for (const day of targets) {
      if (day === from) continue;
      next[day] = { mode: "open", intervals: days[from].intervals };
      if (carry === "marked") marks.set(day, from);
    }
    onDays(next);
    setCarried(marks);
    setCopying(undefined);
  }

  return (
    <>
      <ul className="proto-table">
        {WEEK.map((day) => {
          const form = days[day];
          const filled = form.mode === "open" && complete(form.intervals);
          const from = carry === "marked" ? carried.get(day) : undefined;
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
                      onClick={() => setMode(day, mode)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {form.mode === "open" && (
                <div className="proto-table__times">
                  {from !== undefined && (
                    <p className="proto-carried">
                      Same as {DAY_SHORT[from]} — change it below if it isn&rsquo;t.
                    </p>
                  )}
                  {form.intervals.map((interval, index) => (
                    <div className="row" key={index}>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} opens`}
                        value={interval[0]}
                        onChange={(value) => editTime(day, index, 0, value)}
                      />
                      <span className="proto-to">to</span>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} closes`}
                        value={interval[1]}
                        onChange={(value) => editTime(day, index, 1, value)}
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
