import { useId, useState, type JSX } from "react";
import type { Draft } from "../project/index.js";
import { formatRatio, readout, ROLE_LABELS } from "./contrast.js";
import { setAdvancedEnabled, setOverride } from "./edits.js";

/**
 * The advanced tier, at the foot of _How it looks_. `SPEC.md` §3.4, §3.3, §7.4.
 *
 * **Last, and that is the argument for where it sits.** §7.4: putting it at the foot of the
 * step means the owner has met the six controls before they meet the exit from them. Somebody
 * who scrolls past shape, type and corners and only then finds a panel of ten hex boxes has
 * already been offered the thing that would have solved their problem.
 *
 * **Collapsed, and opening it is the acknowledgement.** The readability guarantee is "by
 * default", not "always" (§3.4): it holds because the colour field above is constrained (§3.3),
 * and hand-setting ten colours steps outside that field. So the panel says so, once, in plain
 * words — and then stops talking about it.
 *
 * **It reports contrast and nothing else.** No refusal, no auto-correction, no export gate. The
 * numbers are stated and the owner decides; nothing here disables Download, rewrites a colour,
 * or marks a reading as wrong. That is not politeness, it is §3.3's design holding: an owner is
 * never told off for a colour, and the person who has come this far is asking a factual
 * question that has a factual answer.
 *
 * **The colours persist even when the switch is off** (§3.4), which is a property of
 * `setAdvancedEnabled` writing one boolean and of `derivePalette` reading the object only when
 * it is enabled. Switching off and saving cannot destroy the owner's manual work; switching
 * back on returns it intact.
 */

export interface AdvancedProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
}

export function Advanced({ draft, onChange }: AdvancedProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const switchId = useId();

  const advanced = draft.style.advanced;
  // Measured from the palette the page is actually rendering, overrides included — see
  // `contrast.ts`. Recomputed on every keystroke, which is what makes it a readout.
  const { readings, brandSteppedBack, palette } = readout(draft.style);

  return (
    <div className="mt-4 border-t border-rule pt-4" data-advanced>
      <button
        type="button"
        className="tap self-start bg-transparent py-2 font-sans underline underline-offset-4"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        Advanced colours
      </button>

      <div id={panelId} hidden={!open} className="flex flex-col gap-4">
        <p className="question__hint">
          The colours above are picked so they always read well together. Set your own here and that
          stops being true — the numbers at the bottom are how you check.
        </p>

        <label className="tap flex items-center gap-2 font-medium" htmlFor={switchId}>
          <input
            id={switchId}
            type="checkbox"
            checked={advanced.enabled}
            onChange={(event) => onChange(setAdvancedEnabled(draft, event.target.checked))}
          />
          <span>Set the colours by hand</span>
        </label>

        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {ROLE_LABELS.map(([role, label]) => (
            <li key={role} className="field">
              <label className="field__label" htmlFor={`${panelId}-${role}`}>
                {label}
              </label>
              <input
                id={`${panelId}-${role}`}
                type="text"
                className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                spellCheck={false}
                autoCapitalize="none"
                // The derived colour, so an empty box reads as "whatever the derivation says"
                // rather than as nothing. Leaving it empty is how a role goes back.
                placeholder={palette[role]}
                value={advanced.colors[role] ?? ""}
                disabled={!advanced.enabled}
                onChange={(event) => onChange(setOverride(draft, role, event.target.value))}
              />
            </li>
          ))}
        </ul>

        <h3 className="m-0 font-serif text-base">What the numbers say</h3>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0" data-readings>
          {readings.map((reading) => (
            <li
              key={reading.label}
              className="flex justify-between gap-4 border-b border-rule py-1"
            >
              <span>{reading.label}</span>
              <span className="tabular-nums whitespace-nowrap">{formatRatio(reading.ratio)}</span>
            </li>
          ))}
        </ul>
        {/*
         * One static fact, attached to no reading. Saying "text is usually asked to reach 4.5"
         * gives the numbers above a scale; saying it *about* a particular reading would be the
         * verdict §3.4 rules out.
         */}
        <p className="question__hint">Text is usually asked to reach 4.5:1, and larger text 3:1.</p>

        {brandSteppedBack && (
          <p className="question__hint">
            Your colour is too close to the page background to fill a button, so the buttons use a
            stronger version of it. Your colour itself is unchanged.
          </p>
        )}
      </div>
    </div>
  );
}
