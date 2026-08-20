import type { Hours, Interval, Weekday } from "@linkpage/renderer";
import { useState, type JSX } from "react";
import { WEEKDAYS } from "../topics.js";
import { Field, Question } from "./Question.js";
import { Button } from "../../ui/Button.js";
import { TimeBox } from "../../ui/TimeBox.js";
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
  /**
   * These times arrived by carry and the owner has not touched them yet (§7.10).
   *
   * **Marked rather than silent, and §7.3 is why.** A carried time is not a default — it is the
   * owner's own answer, moved — but §7.3's teeth are in *never notices*, not in whose value it
   * was: tap *Open* on Thursday on the way to *Closed*, tap away, and a silent carry has
   * published 9–5 on a day the business meant to shut.
   */
  readonly carriedFrom?: Weekday;
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

/** Short enough to sit inside a sentence: *"Same as Mon"*. */
const SHORT_DAY: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const WEEKDAY_KEYS: readonly Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

/**
 * The three states §2.3 has, named for what they do rather than for what we call them.
 *
 * **`Not shown` names a consequence, because the consequence is a deletion.** An unspecified day
 * gets no row on the exported page at all, so a customer cannot tell it from a closed one — and
 * the old `<select>` said *Don't say*, which describes the owner's silence rather than its
 * effect. §7.10 records that this is a harder copy problem than naming a `<select>` option was.
 */
const MODES: readonly { readonly mode: DayMode; readonly label: string }[] = [
  { mode: "open", label: "Open" },
  { mode: "closed", label: "Closed" },
  { mode: "unset", label: "Not shown" },
];

function readDay(intervals: readonly Interval[] | undefined): DayForm {
  if (intervals === undefined) return EMPTY_DAY;
  if (intervals.length === 0) return { mode: "closed", intervals: [["", ""]] };
  return { mode: "open", intervals };
}

/** Whether a day holds a time the owner actually typed, which is what may be carried or copied. */
const isFilled = (form: DayForm): boolean =>
  form.mode === "open" &&
  form.intervals.some(([open, close]) => open.trim() !== "" && close.trim() !== "");

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

  // §4.1's seeded preference, and §7.10's second surface for it: the boxes read back in the same
  // convention the page prints, so the two can never disagree.
  const clock = initial?.clock ?? SEEDED_HOURS_PREFERENCES.clock;

  /**
   * The last times the owner typed, and which day they typed them on.
   *
   * **Nothing carries until there is one**, which is how §7.3 is kept on the empty screen *by
   * construction* rather than by care: the first day of the week is always typed by hand.
   *
   * Seeded from a project that already has hours, because there the times are the owner's own
   * answers already — §7.3 is about facts we invent, and a re-entered screen invents nothing.
   */
  const [source, setSource] = useState<
    { day: Weekday; intervals: readonly Interval[] } | undefined
  >(() => {
    const filled = WEEKDAYS.find((day) => isFilled(readDay(initial?.days[day])));
    return filled === undefined
      ? undefined
      : { day: filled, intervals: readDay(initial?.days[filled]).intervals };
  });

  const update = (day: Weekday, next: DayForm): void => setDays({ ...days, [day]: next });

  /** Editing a time makes the answer the owner's again, and makes it what carries next. */
  const typeTime = (day: Weekday, intervals: readonly Interval[]): void => {
    setDays({ ...days, [day]: { mode: "open", intervals } });
    if (intervals.some(([open, close]) => open.trim() !== "" && close.trim() !== "")) {
      setSource({ day, intervals });
    }
  };

  /**
   * Switching a day's state, with §7.10's carry on the way into *Open*.
   *
   * Only into a day holding nothing: **reopening is never a reason to overwrite an answer**, so a
   * day that already has times keeps them.
   */
  const setMode = (day: Weekday, mode: DayMode): void => {
    const form = days[day];
    if (mode !== "open" || isFilled(form) || source === undefined || source.day === day) {
      update(day, { ...form, mode, carriedFrom: undefined });
      return;
    }
    update(day, { mode: "open", intervals: source.intervals, carriedFrom: source.day });
  };

  /** §7.10's explicit path, from a day already filled in. Deliberate where the carry is implicit. */
  const copyFrom = (day: Weekday, to: readonly Weekday[]): void => {
    const intervals = days[day].intervals;
    const next = { ...days };
    for (const target of to) {
      if (target === day) continue;
      next[target] = { mode: "open", intervals, carriedFrom: day };
    }
    setDays(next);
  };

  function answer(): Hours {
    const out: Partial<Record<Weekday, Interval[]>> = {};
    for (const day of WEEKDAYS) {
      const form = days[day];
      if (form.mode === "unset") continue;
      out[day] = form.mode === "closed" ? [] : form.intervals.map(([o, c]) => [o, c]);
    }
    return {
      // §4.1: the browser's, once, rather than American by default.
      clock,
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
      // Two sentences in the hint the screen already has (§7.10): the convention is taught once
      // rather than fourteen times, and costs no chrome on the screen #111 just shortened.
      hint="Type times how you'd say them. Leave a day alone if you'd rather not say."
      onSubmit={() => onAnswer(answer())}
      submitDisabled={!said}
      escape={{ label: "We don't have set hours", onEscape: onSkip }}
      onBack={onBack}
    >
      <ul className="m-0 flex list-none flex-col p-0">
        {WEEKDAYS.map((day) => {
          const form = days[day];
          return (
            <li key={day} className="flex flex-col gap-2 border-b border-rule py-2">
              {/*
               * One line: the day, then all three states at once (§7.10). The `<select>` is gone
               * — three states that need no opening is what makes a closed or an unshown day
               * cost a line rather than a block, which is most of what this screen bought back.
               */}
              <div className="flex items-center justify-between gap-3">
                <span className="text-base">{DAY_NAMES[day]}</span>
                <div
                  role="radiogroup"
                  aria-label={DAY_NAMES[day]}
                  className="flex shrink-0 rounded-sm border border-rule"
                >
                  {MODES.map(({ mode, label }) => (
                    <label
                      key={mode}
                      className="tap flex cursor-pointer items-center px-3 text-sm has-checked:bg-ink has-checked:text-ground"
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`hours-${day}`}
                        value={mode}
                        checked={form.mode === mode}
                        onChange={() => setMode(day, mode)}
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {form.mode === "open" && (
                <div className="flex flex-col gap-2">
                  {form.intervals.map(([open, close], index) => (
                    // Positional keys: the rows have no identity of their own, and the list is
                    // only ever appended to or emptied.
                    <div className="flex items-center gap-2" key={index}>
                      <TimeBox
                        label={`${DAY_NAMES[day]} opens`}
                        value={open}
                        clock={clock}
                        onChange={(stored) =>
                          typeTime(
                            day,
                            form.intervals.map((slot, at) =>
                              at === index ? [stored, slot[1]] : slot,
                            ),
                          )
                        }
                      />
                      <TimeBox
                        label={`${DAY_NAMES[day]} closes`}
                        value={close}
                        clock={clock}
                        onChange={(stored) =>
                          typeTime(
                            day,
                            form.intervals.map((slot, at) =>
                              at === index ? [slot[0], stored] : slot,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}

                  {/*
                   * §7.10: a carried day says where it came from, and the line goes when the
                   * owner touches the times — because touching them makes the answer theirs
                   * again. 77px across a week, and the cheapest thing on the screen to ignore
                   * once it is true.
                   */}
                  {form.carriedFrom !== undefined && (
                    <p className="text-sm text-ink-quiet" data-carried>
                      Same as {SHORT_DAY[form.carriedFrom]} — change it below if it isn&rsquo;t.
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() =>
                        update(day, { ...form, intervals: [...form.intervals, ["", ""]] })
                      }
                    >
                      Add another time
                    </Button>
                    {/*
                     * **Once, on the day the times would be copied *from*** — not under every
                     * open day. Three controls per day is the noise this screen exists to
                     * remove: the walk's own complaint was that *Add another time* repeats under
                     * every open day, and a copy block would repeat it three times over. The
                     * source is the day the owner most recently typed on, which is where they
                     * are already looking.
                     */}
                    {source?.day === day && isFilled(form) && (
                      <>
                        <span className="text-sm text-ink-quiet">Copy these times</span>
                        <Button onClick={() => copyFrom(day, WEEKDAY_KEYS)}>to weekdays</Button>
                        <Button onClick={() => copyFrom(day, WEEKDAYS)}>to every day</Button>
                      </>
                    )}
                  </div>
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
