/**
 * PROTOTYPE — throwaway. Variant A: **say it once, then adjust.**
 *
 * The screen asks one thing first — *which days* — and only then asks for times, once, for all
 * of them. The seven-day table is gone; what replaces it is the sentence an owner would say out
 * loud, in the order they would say it: "we're open weekdays, nine to five."
 *
 * Per-day difference is a second, quieter question, so the restaurant that shuts for lunch is
 * still expressible but no longer sets the cost for everyone. §7.3 is kept by the times starting
 * empty: the shared pair is a box, not a 9–5 the owner has to notice and correct.
 */

import { useState, type JSX } from "react";
import type { Interval, Weekday } from "@linkpage/renderer";
import {
  DAY_LONG,
  DAY_SHORT,
  NoteField,
  RestOfWeek,
  TimeBox,
  WEEK,
  WEEKDAYS_ONLY,
  type Days,
  type TimeControl,
} from "./kit.js";

export const NAME = "Say it once, then adjust";
export const HINT = "Pick your days, then say the hours once. A day that's different comes after.";

export function VariantA({
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
  const [shared, setShared] = useState<Interval>(["", ""]);
  const [own, setOwn] = useState<ReadonlySet<Weekday>>(new Set());
  const [showDifferent, setShowDifferent] = useState(false);
  const [restClosed, setRestClosed] = useState(false);

  const open = WEEK.filter((day) => days[day].mode === "open");
  const rest = WEEK.filter((day) => days[day].mode !== "open");

  function write(nextOpen: readonly Weekday[], pair: Interval, closedRest: boolean): void {
    const next = { ...days };
    for (const day of WEEK) {
      if (nextOpen.includes(day)) {
        next[day] = own.has(day)
          ? { mode: "open", intervals: days[day].intervals }
          : { mode: "open", intervals: [pair] };
      } else {
        next[day] = { mode: closedRest ? "closed" : "unset", intervals: [["", ""]] };
      }
    }
    onDays(next);
  }

  function toggle(day: Weekday): void {
    const nextOpen = open.includes(day) ? open.filter((d) => d !== day) : [...open, day];
    write(nextOpen, shared, restClosed);
  }

  function setPair(index: 0 | 1, value: string): void {
    const pair: Interval = index === 0 ? [value, shared[1]] : [shared[0], value];
    setShared(pair);
    write(open, pair, restClosed);
  }

  return (
    <>
      <div className="field">
        <span className="field__label">Which days are you open?</span>
        <ul className="proto-pills">
          {WEEK.map((day) => (
            <li key={day}>
              <button
                type="button"
                className="proto-pill"
                aria-pressed={open.includes(day)}
                onClick={() => toggle(day)}
              >
                <span aria-hidden="true">{DAY_SHORT[day]}</span>
                <span className="proto-sr">{DAY_LONG[day]}</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="proto-link"
          onClick={() => write([...WEEKDAYS_ONLY], shared, restClosed)}
        >
          Weekdays
        </button>
      </div>

      {open.length > 0 && (
        <div className="field">
          <span className="field__label">
            {open.length === 7 ? "Every day" : "Those days"}, you&rsquo;re open
          </span>
          <div className="row">
            <TimeBox
              control={control}
              label="Opening time"
              value={shared[0]}
              onChange={(value) => setPair(0, value)}
            />
            <span className="proto-to">to</span>
            <TimeBox
              control={control}
              label="Closing time"
              value={shared[1]}
              onChange={(value) => setPair(1, value)}
            />
          </div>
        </div>
      )}

      {open.length > 1 && (
        <div className="field">
          {!showDifferent ? (
            <button type="button" className="proto-link" onClick={() => setShowDifferent(true)}>
              One of those days is different
            </button>
          ) : (
            <ul className="days">
              {open.map((day) => (
                <li key={day} className="days__day">
                  <span className="field__label">{DAY_LONG[day]}</span>
                  {days[day].intervals.map((interval, index) => (
                    <div className="row" key={index}>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} opens`}
                        value={interval[0]}
                        onChange={(value) => {
                          setOwn(new Set([...own, day]));
                          onDays({
                            ...days,
                            [day]: {
                              mode: "open",
                              intervals: days[day].intervals.map((slot, at) =>
                                at === index ? [value, slot[1]] : slot,
                              ),
                            },
                          });
                        }}
                      />
                      <span className="proto-to">to</span>
                      <TimeBox
                        control={control}
                        label={`${DAY_LONG[day]} closes`}
                        value={interval[1]}
                        onChange={(value) => {
                          setOwn(new Set([...own, day]));
                          onDays({
                            ...days,
                            [day]: {
                              mode: "open",
                              intervals: days[day].intervals.map((slot, at) =>
                                at === index ? [slot[0], value] : slot,
                              ),
                            },
                          });
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="proto-link"
                    onClick={() => {
                      setOwn(new Set([...own, day]));
                      onDays({
                        ...days,
                        [day]: { mode: "open", intervals: [...days[day].intervals, ["", ""]] },
                      });
                    }}
                  >
                    Add another time on {DAY_SHORT[day]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <RestOfWeek
        count={rest.length}
        closed={restClosed}
        onChange={(next) => {
          setRestClosed(next);
          write(open, shared, next);
        }}
      />

      <NoteField note={note} onChange={onNote} />
    </>
  );
}
