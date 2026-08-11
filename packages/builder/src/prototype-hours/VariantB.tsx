/**
 * PROTOTYPE — throwaway. Variant B: **a list of statements.**
 *
 * Nothing is a form. The owner builds their week out of sentences — *Mon–Fri, 9:00 AM – 5:00 PM*
 * — and the screen is the list of the ones they have made. It is the only variant whose unit is
 * a **span of days** rather than a day, which is what makes a second interval cheap: a
 * restaurant adds "Mon–Fri 11–2" and then "Mon–Fri 5–9" and never meets the idea of an interval.
 *
 * The empty state says nothing about opening hours at all, which is §7.3 kept by construction:
 * there is no row to pre-fill, so there is nothing to accidentally assert.
 */

import { useState, type JSX } from "react";
import type { Weekday } from "@linkpage/renderer";
import {
  DAY_LONG,
  DAY_SHORT,
  NoteField,
  RestOfWeek,
  TimeBox,
  WEEK,
  WEEKDAYS_ONLY,
  blankDays,
  show12h,
  type Days,
  type TimeControl,
} from "./kit.js";

export const NAME = "A list of statements";
export const HINT =
  "Add the times you keep, the way you'd say them. Lunch closures get a second line.";

interface Entry {
  readonly days: readonly Weekday[];
  readonly open: string;
  readonly close: string;
}

/** "Mon–Fri" when the picked days are one run in week order, otherwise "Mon, Wed, Fri". */
function spanLabel(days: readonly Weekday[]): string {
  const picked = WEEK.filter((day) => days.includes(day));
  if (picked.length === 0) return "";
  if (picked.length === 1) return DAY_SHORT[picked[0]!];
  const first = WEEK.indexOf(picked[0]!);
  const last = WEEK.indexOf(picked[picked.length - 1]!);
  const contiguous = last - first + 1 === picked.length;
  return contiguous
    ? `${DAY_SHORT[picked[0]!]}–${DAY_SHORT[picked[picked.length - 1]!]}`
    : picked.map((day) => DAY_SHORT[day]).join(", ");
}

function daysFrom(entries: readonly Entry[], restClosed: boolean): Days {
  const next = blankDays();
  for (const entry of entries) {
    if (entry.open === "" || entry.close === "") continue;
    for (const day of entry.days) {
      const existing = next[day].mode === "open" ? next[day].intervals : [];
      next[day] = { mode: "open", intervals: [...existing, [entry.open, entry.close]] };
    }
  }
  for (const day of WEEK) {
    if (next[day].mode !== "open") {
      next[day] = { mode: restClosed ? "closed" : "unset", intervals: [["", ""]] };
    }
  }
  return next;
}

export function VariantB({
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
  const [entries, setEntries] = useState<readonly Entry[]>([]);
  const [restClosed, setRestClosed] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [draftDays, setDraftDays] = useState<readonly Weekday[]>([]);
  const [draftOpen, setDraftOpen] = useState("");
  const [draftClose, setDraftClose] = useState("");

  const covered = WEEK.filter((day) => days[day].mode === "open");

  function commit(nextEntries: readonly Entry[], closedRest: boolean): void {
    setEntries(nextEntries);
    onDays(daysFrom(nextEntries, closedRest));
  }

  const canAdd = draftDays.length > 0 && draftOpen !== "" && draftClose !== "";

  return (
    <>
      <ul className="proto-sentences">
        {entries.map((entry, index) => (
          <li key={index} className="proto-sentence">
            <span className="proto-sentence__text">
              <strong>{spanLabel(entry.days)}</strong> {show12h(entry.open)} &ndash;{" "}
              {show12h(entry.close)}
            </span>
            <button
              type="button"
              className="proto-link"
              onClick={() =>
                commit(
                  entries.filter((_, at) => at !== index),
                  restClosed,
                )
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      {!drafting ? (
        <button type="button" className="button-secondary" onClick={() => setDrafting(true)}>
          {entries.length === 0 ? "Add opening times" : "Add more times"}
        </button>
      ) : (
        <div className="proto-draft">
          <div className="field">
            <span className="field__label">Which days?</span>
            <ul className="proto-pills">
              {WEEK.map((day) => (
                <li key={day}>
                  <button
                    type="button"
                    className="proto-pill"
                    aria-pressed={draftDays.includes(day)}
                    onClick={() =>
                      setDraftDays(
                        draftDays.includes(day)
                          ? draftDays.filter((d) => d !== day)
                          : [...draftDays, day],
                      )
                    }
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
              onClick={() => setDraftDays([...WEEKDAYS_ONLY])}
            >
              Weekdays
            </button>
          </div>

          <div className="field">
            <span className="field__label">Open</span>
            <div className="row">
              <TimeBox
                control={control}
                label="Opening time"
                value={draftOpen}
                onChange={setDraftOpen}
              />
              <span className="proto-to">to</span>
              <TimeBox
                control={control}
                label="Closing time"
                value={draftClose}
                onChange={setDraftClose}
              />
            </div>
          </div>

          <div className="row">
            <button
              type="button"
              className="button-secondary"
              disabled={!canAdd}
              onClick={() => {
                commit(
                  [...entries, { days: draftDays, open: draftOpen, close: draftClose }],
                  restClosed,
                );
                setDraftDays([]);
                setDraftOpen("");
                setDraftClose("");
                setDrafting(false);
              }}
            >
              Add
            </button>
            <button type="button" className="proto-link" onClick={() => setDrafting(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <RestOfWeek
        count={7 - covered.length}
        closed={restClosed}
        onChange={(next) => {
          setRestClosed(next);
          commit(entries, next);
        }}
      />

      <NoteField note={note} onChange={onNote} />
    </>
  );
}
