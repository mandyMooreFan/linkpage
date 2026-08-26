import type { Hours, Interval, Weekday } from "@linkpage/renderer";
import { useState, type JSX } from "react";
import { WEEKDAYS } from "../topics.js";
import { Field, Question } from "./Question.js";
import { Button } from "../../ui/Button.js";
import { TimeBox } from "../../ui/TimeBox.js";
import { SEEDED_HOURS_PREFERENCES } from "../../project/environment.js";
import { TextInput } from "../../ui/TextInput.js";
import { TYPE } from "../../ui/type.js";

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
          /*
           * **`py-4`, not `py-2`** (B-12). The row's own internal gap is `gap-2` — 8px between the
           * day's one line and the times under it — and the padding around it was the same 8px, a
           * **1×** ratio where §1 asks a row's padding to be ≥4× the gap inside it. With seven of
           * these stacked behind hairlines the boundary *between* two days read as no stronger
           * than the boundary *inside* one, which is the grouping inverted.
           *
           * 16px is `ROW_PADDING`'s number, which the review list's rows already take, so the two
           * lists of rows in the tool are separated by the same amount. The hairline stays: B-12
           * asks for the padding and not for the separator, and these rows are the flow's own
           * sub-list rather than the review list's family — #191 scoped `row.ts` to `list/`
           * deliberately, and widening it to here would be re-auditing.
           */
          return (
            <li key={day} className="flex flex-col gap-2 border-b border-rule py-4">
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
                      /*
                       * The chosen segment takes `theme.css`'s one `picked` mark (#192) — the same
                       * inset ink ring the swatches and the preset rows take.
                       *
                       * **It used to be a solid ink fill**, which cost twice. It made every day's
                       * untouched default — all seven start on "Not shown" — the strongest object
                       * on a screen whose one real action, `Continue`, sits disabled and pale
                       * beneath them (§4, §6; design change 3, which is why this fill moves here
                       * rather than there). And being a square fill inside a `rounded-sm`
                       * container, it overran the container's own corners at either end of the
                       * row. A mark drawn inside the segment cannot: it follows the radius and
                       * stops 4px short of the edge, so nothing needs clipping.
                       *
                       * **Deliberately no `overflow-hidden` on the group**, which is the other fix
                       * the change list offered for that overrun. There is no longer anything to
                       * clip, and an ancestor's clip would eat a focus ring drawn *outside* a
                       * segment — which is exactly where #179 put focus.
                       *
                       * **The focus ring is on this label and it takes no class to put it here**
                       * (#188). The radio below is `sr-only`, so `:focus-visible` matches a
                       * clipped 1px box and the ring is clipped away with it — the one control in
                       * the tool with no working focus treatment at all. `theme.css`'s base rule
                       * forwards the ring to the label that hides its own control, so the ring is
                       * still spelled once and a future segmented control gets it for free.
                       */
                      className="tap flex cursor-pointer items-center px-3 text-sm has-checked:picked"
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
                        name={`time-${day}-${index}-opens`}
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
                        name={`time-${day}-${index}-closes`}
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
                    <p className={TYPE.quietLine.className} data-carried>
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
                    {/*
                     * **The label is a heading over the two buttons it labels, and the three are
                     * one group** (B-66). They used to be three loose children of the wrapping
                     * row, so the line read *Add another time · Copy these times · to weekdays*
                     * and then wrapped, dropping *to every day* onto the next line — the label
                     * split from half of what it labels, at **both** of §7.6's sizes. On a phone
                     * it was worse: the wrap left *Copy these times* at the end of a line whose
                     * only other occupant was *Add another time*, a button it does **not** label,
                     * with both of its real buttons below it. A label that reads as belonging to
                     * the wrong control is worse than no label, and §1 asks that related items sit
                     * closer than unrelated ones.
                     *
                     * **A heading rather than one non-wrapping line**, which is B-66's other
                     * offered fix and the one the review shots chose. Held on one line the three
                     * fit nowhere: on a phone the two buttons and the gaps take all but ~60px of
                     * the column, so the label squeezes to *Copy / these / times* — photographed,
                     * and worse than the defect. Full-width, the sentence sits directly above
                     * exactly what it introduces, reads the same at 390 and at 1440, and needs no
                     * breakpoint to say so.
                     *
                     * The buttons used to need `self-center` here, because `WEIGHT.secondary`
                     * carried `self-start` and overrode this group's `items-center` (B-40, #199,
                     * corrected at the call site because a weight was not that ticket's to move).
                     * **B-72 moved it** (#230): the weights say their width with `w-fit` and say
                     * nothing at all about alignment, so this row's own `items-center` is the only
                     * thing deciding where its three objects sit on the line.
                     */}
                    {source?.day === day && isFilled(form) && (
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`w-full ${TYPE.quietLine.className}`}>
                          Copy these times
                        </span>
                        <Button onClick={() => copyFrom(day, WEEKDAY_KEYS)}>to weekdays</Button>
                        <Button onClick={() => copyFrom(day, WEEKDAYS)}>to every day</Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <Field label="Anything else about your hours?" hint="Bank holidays, seasonal changes.">
        <TextInput type="text" value={note} onChange={(event) => setNote(event.target.value)} />
      </Field>
    </Question>
  );
}
