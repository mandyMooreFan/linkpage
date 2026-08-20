import type { Hours, Interval, Weekday } from "@linkpage/renderer";
import { useState, type JSX } from "react";
import { WEEKDAYS } from "../topics.js";
import { Field, Question } from "./Question.js";
import { SEEDED_HOURS_PREFERENCES } from "../../project/environment.js";

/**
 * Opening hours. `SPEC.md` §2.3, §7.2, §7.3.
 *
 * **The screen opens with nothing filled in, and that is a rule rather than an implementation
 * detail.** §7.3 forbids a preset writing any word that is a claim about the business, and
 * names default opening hours specifically: _a wrong fact the owner never notices we asserted
 * is worse than an absent one_. So there is no 9–5, no Mon–Fri, and no day pre-set to open.
 *
 * **Three states per day, because §2.3 has three.** Absent means unspecified, present-and-empty
 * means explicitly closed, and present-with-intervals means open — and the difference between
 * the first two is real: a page that omits Sunday and a page that says _Sunday: closed_ answer
 * a visitor's question differently. A checkbox has two states and would have to lose one.
 *
 * **More than one interval per day**, because a single open/close pair would be wrong on day
 * one for a large slice of the target users — restaurants open 11–2 and 5–9, salons that close
 * for lunch. Everything structure should not model goes in the note: bank holidays, "by
 * appointment", seasonal changes.
 *
 * Times are stored 24-hour (§2.3); `clock` and `weekStart` are display preferences that meet
 * the owner on _How it looks_ rather than here, since neither is a fact about the business.
 */

type DayMode = "unset" | "closed" | "open";

interface DayForm {
  readonly mode: DayMode;
  readonly intervals: readonly Interval[];
}

const EMPTY_DAY: DayForm = { mode: "unset", intervals: [["", ""]] };

const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

function readDay(intervals: readonly Interval[] | undefined): DayForm {
  if (intervals === undefined) return EMPTY_DAY;
  if (intervals.length === 0) return { mode: "closed", intervals: [["", ""]] };
  return { mode: "open", intervals };
}

export interface HoursQuestionProps {
  readonly initial: Hours | undefined;
  readonly onAnswer: (hours: Hours) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function HoursQuestion({
  initial,
  onAnswer,
  onSkip,
  onBack,
}: HoursQuestionProps): JSX.Element {
  const [days, setDays] = useState<Record<Weekday, DayForm>>(
    () =>
      Object.fromEntries(WEEKDAYS.map((day) => [day, readDay(initial?.days[day])])) as Record<
        Weekday,
        DayForm
      >,
  );
  const [note, setNote] = useState(initial?.note ?? "");

  const update = (day: Weekday, next: DayForm): void => setDays({ ...days, [day]: next });

  function answer(): Hours {
    const out: Partial<Record<Weekday, Interval[]>> = {};
    for (const day of WEEKDAYS) {
      const form = days[day];
      if (form.mode === "unset") continue;
      out[day] = form.mode === "closed" ? [] : form.intervals.map(([o, c]) => [o, c]);
    }
    return {
      // §4.1: the browser's, once, rather than American by default.
      clock: initial?.clock ?? SEEDED_HOURS_PREFERENCES.clock,
      weekStart: initial?.weekStart ?? SEEDED_HOURS_PREFERENCES.weekStart,
      days: out,
      note,
    };
  }

  // Continue is available once anything has been said. The door in `topics.ts` decides again,
  // on the cleaned value, so a day opened and left blank is not an answer either way.
  const said =
    note.trim() !== "" ||
    WEEKDAYS.some((day) => {
      const form = days[day];
      if (form.mode === "unset") return false;
      if (form.mode === "closed") return true;
      return form.intervals.some(([open, close]) => open.trim() !== "" && close.trim() !== "");
    });

  return (
    <Question
      title="When are you open?"
      hint="Leave a day alone if you'd rather not say."
      onSubmit={() => onAnswer(answer())}
      submitDisabled={!said}
      escape={{ label: "We don't have set hours", onEscape: onSkip }}
      onBack={onBack}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {WEEKDAYS.map((day) => {
          const form = days[day];
          return (
            <li key={day} className="flex flex-col gap-2 border-b border-rule py-2">
              <Field label={DAY_NAMES[day]}>
                <select
                  className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                  value={form.mode}
                  onChange={(event) =>
                    update(day, { ...form, mode: event.target.value as DayMode })
                  }
                >
                  <option value="unset">Don&rsquo;t say</option>
                  <option value="closed">Closed</option>
                  <option value="open">Open</option>
                </select>
              </Field>

              {form.mode === "open" && (
                <div className="flex flex-col gap-2">
                  {form.intervals.map(([open, close], index) => (
                    // Positional keys: the rows have no identity of their own, and the list is
                    // only ever appended to or emptied.
                    <div className="flex items-center gap-2" key={index}>
                      <input
                        type="time"
                        className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                        aria-label={`${DAY_NAMES[day]} opens`}
                        value={open}
                        onChange={(event) =>
                          update(day, {
                            ...form,
                            intervals: form.intervals.map((slot, at) =>
                              at === index ? [event.target.value, slot[1]] : slot,
                            ),
                          })
                        }
                      />
                      <input
                        type="time"
                        className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                        aria-label={`${DAY_NAMES[day]} closes`}
                        value={close}
                        onChange={(event) =>
                          update(day, {
                            ...form,
                            intervals: form.intervals.map((slot, at) =>
                              at === index ? [slot[0], event.target.value] : slot,
                            ),
                          })
                        }
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    className="tap self-start rounded-sm border border-rule bg-transparent px-4 py-2 font-sans text-base"
                    onClick={() =>
                      update(day, { ...form, intervals: [...form.intervals, ["", ""]] })
                    }
                  >
                    Add another time
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Field label="Anything else about your hours?" hint="Bank holidays, seasonal changes.">
        <input
          type="text"
          className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>
    </Question>
  );
}
