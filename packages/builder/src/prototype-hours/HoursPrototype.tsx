/**
 * PROTOTYPE — throwaway. Wayfinder ticket #80: what does the seven-day opening-hours entry
 * screen become?
 *
 * Five screens on one route, switchable with `?variant=T|A|B|C|D` and the bar at the bottom.
 * **T is today's screen, unmodified** — the real `HoursQuestion`, rendered in the real flow
 * chrome — because a variant that only looks good next to a memory of the old one has not been
 * judged.
 *
 * The bar carries two more axes and one measurement:
 *
 * - **Time control.** `native` is today's `<input type="time">`; `typed` is a text box that takes
 *   "9", "930", "9am" and echoes back what the page will print. The ticket asks whether the
 *   browser's clock convention disagreeing with §3.1's is worth a custom control, and that is not
 *   answerable in prose.
 * - **Readout.** What the page would say, so the three states of §2.3 are visible as the owner
 *   makes them: a day that is *closed* prints a row, a day that is *unspecified* prints nothing.
 * - **Interactions.** Every value committed plus every button pressed. The walk measured today's
 *   screen at **15 for Mon–Fri 9–5**, and that number is the thing each variant is trying to beat
 *   without losing a state §2.3 needs.
 *
 * Throw all of this away once a variant wins.
 */

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import "../flow/flow.css";
import { HoursQuestion } from "../flow/questions/HoursQuestion.js";
import { Question } from "../flow/questions/Question.js";
import { anythingSaid, blankDays, toHours, Readout, type Days, type TimeControl } from "./kit.js";
import "./prototype.css";
import { VariantA, NAME as NAME_A, HINT as HINT_A } from "./VariantA.js";
import { VariantB, NAME as NAME_B, HINT as HINT_B } from "./VariantB.js";
import { VariantC, NAME as NAME_C, HINT as HINT_C } from "./VariantC.js";
import { VariantD, NAME as NAME_D, HINT as HINT_D } from "./VariantD.js";

const VARIANTS = [
  { key: "T", name: "Today's screen (baseline)", hint: "" },
  { key: "A", name: NAME_A, hint: HINT_A },
  { key: "B", name: NAME_B, hint: HINT_B },
  { key: "C", name: NAME_C, hint: HINT_C },
  { key: "D", name: NAME_D, hint: HINT_D },
] as const;

type Key = (typeof VARIANTS)[number]["key"];

function readKey(): Key {
  const raw = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  const found = VARIANTS.find((entry) => entry.key === raw);
  return found?.key ?? "T";
}

export function HoursPrototype(): JSX.Element {
  const [variant, setVariant] = useState<Key>(readKey);
  const [control, setControl] = useState<TimeControl>("native");
  const [showReadout, setShowReadout] = useState(true);
  const [days, setDays] = useState<Days>(blankDays);
  const [note, setNote] = useState("");
  const [taps, setTaps] = useState(0);
  const stage = useRef<HTMLDivElement>(null);

  const go = useCallback((key: Key) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", key);
    window.history.replaceState(null, "", url);
    setVariant(key);
    setDays(blankDays());
    setNote("");
    setTaps(0);
  }, []);

  // Interactions, counted the way the walk counted them: a value committed (`change`, which is
  // once per time picker rather than once per keystroke) or a button pressed.
  useEffect(() => {
    const node = stage.current;
    if (!node) return;
    const onClick = (event: Event): void => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("button")) setTaps((n) => n + 1);
    };
    const onChange = (event: Event): void => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) setTaps((n) => n + 1);
    };
    node.addEventListener("click", onClick, true);
    node.addEventListener("change", onChange, true);
    return () => {
      node.removeEventListener("click", onClick, true);
      node.removeEventListener("change", onChange, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const active = document.activeElement as HTMLElement | null;
      if (
        active &&
        (active.tagName === "INPUT" || active.tagName === "TEXTAREA" || active.isContentEditable)
      )
        return;
      const at = VARIANTS.findIndex((entry) => entry.key === variant);
      const step = event.key === "ArrowRight" ? 1 : VARIANTS.length - 1;
      go(VARIANTS[(at + step) % VARIANTS.length]!.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, go]);

  const current = VARIANTS.find((entry) => entry.key === variant) ?? VARIANTS[0];
  const shared = { days, note, onDays: setDays, onNote: setNote, control } as const;

  return (
    <div className="flow">
      <div className="flow__question" ref={stage}>
        {variant === "T" ? (
          <HoursQuestion initial={undefined} onAnswer={() => {}} onSkip={() => {}} />
        ) : (
          <Question
            title="When are you open?"
            hint={current.hint}
            onSubmit={() => {}}
            submitDisabled={!anythingSaid(days, note)}
            escape={{ label: "We don't have set hours", onEscape: () => {} }}
          >
            {variant === "A" && <VariantA {...shared} />}
            {variant === "B" && <VariantB {...shared} />}
            {variant === "C" && <VariantC {...shared} />}
            {variant === "D" && <VariantD {...shared} />}
          </Question>
        )}
      </div>

      {showReadout && variant !== "T" && (
        <div className="flow__preview">
          <Readout hours={toHours(days, note)} />
        </div>
      )}

      <div className="proto-bar">
        <div className="proto-bar__row">
          {VARIANTS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              className="proto-bar__key"
              aria-pressed={entry.key === variant}
              onClick={() => go(entry.key)}
            >
              {entry.key}
            </button>
          ))}
          <span className="proto-bar__name">{current.name}</span>
        </div>
        <div className="proto-bar__row">
          <button
            type="button"
            className="proto-bar__toggle"
            onClick={() => setControl(control === "native" ? "typed" : "native")}
          >
            time: {control}
          </button>
          <button
            type="button"
            className="proto-bar__toggle"
            onClick={() => setShowReadout(!showReadout)}
          >
            readout: {showReadout ? "on" : "off"}
          </button>
          <button type="button" className="proto-bar__toggle" onClick={() => go(variant)}>
            reset
          </button>
          <span className="proto-bar__count">
            {taps} <small>interactions (today = 15)</small>
          </span>
        </div>
      </div>
    </div>
  );
}
