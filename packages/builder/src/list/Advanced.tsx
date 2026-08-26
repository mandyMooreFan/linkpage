import { useId, useState, type JSX } from "react";
import type { Draft } from "../project/index.js";
import { formatRatio, readout, ROLE_LABELS } from "./contrast.js";
import { setAdvancedEnabled, setOverride } from "./edits.js";
import { Button } from "../ui/Button.js";
import { TextInput } from "../ui/TextInput.js";
import { Checkbox } from "../ui/Checkbox.js";
import { Field } from "../flow/questions/Question.js";
import { LADDER } from "../ui/ladder.js";
import { HEADING, TYPE } from "../ui/type.js";

/**
 * The advanced tier, at the foot of _How it looks_. `SPEC.md` §3.4, §3.3, §7.4.
 *
 * **Last, and that is the argument for where it sits.** §7.4: putting it at the foot of the
 * step means the owner has met the six controls before they meet the exit from them. Somebody
 * who scrolls past shape, type and corners and only then finds a panel of eleven hex boxes has
 * already been offered the thing that would have solved their problem.
 *
 * **Collapsed, and opening it is the acknowledgement.** The readability guarantee is "by
 * default", not "always" (§3.4): it holds because the colour field above is constrained (§3.3),
 * and hand-setting eleven colours steps outside that field. So the panel says so, once, in
 * plain words — and then stops talking about it.
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
      {/*
       * **B-3's last hand-copy, and the one the sweeps could not see** (#240). Until now this was
       * a raw `<button>` wearing `tap bg-transparent py-2 font-sans underline underline-offset-4`
       * — `WEIGHT.quiet` as it stood in 2026 before #198 gave it a size and #234 gave it an ink,
       * frozen at the moment it was copied. #183 moved the ten `<Button>` call sites and unified
       * the weights; #198 and #234 swept the call sites by walking `<Button>` opening tags. A
       * recipe hand-written on a plain element is invisible to all three, so this one went on
       * taking the screen's `text-ink` while every other tertiary in the tool moved to
       * `text-ink-quiet`. It is a disclosure at the foot of a step — §4's tertiary, the tool's own
       * words — so `quiet` is what it always meant, and `Button` is where that is written.
       *
       * `self-start` came off the same string with #230: the parent is an ordinary block, so
       * `align-self` reached nothing here at any point — a declaration that styles nothing, which
       * is B-1's defect in one word.
       */}
      <Button
        weight="quiet"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        Advanced colours
      </Button>

      {/*
       * The panel is a sibling of the button in a container that is not a flex parent, so it
       * owns its own offset — and had none, which opened its first sentence flush against the
       * control that reveals it (B-9). Disclosure to disclosed is a section boundary.
       */}
      <div
        id={panelId}
        hidden={!open}
        // Its own parts are sections — a sentence, a switch, ten fields, a readout — so they sit
        // a rung above the gap the fields inside them use, and the ladder stays monotonic.
        className={`${LADDER.betweenSections.className} flex flex-col ${LADDER.betweenSections.gapClassName}`}
      >
        <p className={TYPE.quietLine.className}>
          The colours above are picked so they always read well together. Set your own here and that
          stops being true — the numbers at the bottom are how you check.
        </p>

        <label className="tap flex items-center gap-2 font-medium" htmlFor={switchId}>
          <Checkbox
            id={switchId}
            checked={advanced.enabled}
            onChange={(event) => onChange(setAdvancedEnabled(draft, event.target.checked))}
          />
          <span>Set the colours by hand</span>
        </label>

        {/*
         * Ten fields through the one `Field`, rather than a hand-built label-over-input that had
         * the ladder inverted — 0px inside each row against 12px between them (B-10). Routing
         * them through the component is §7.4's rule, and it is also the whole fix: the spacing
         * arrives with it.
         */}
        <ul className={`m-0 flex list-none flex-col ${LADDER.betweenFields.className} p-0`}>
          {ROLE_LABELS.map(([role, label]) => (
            <li key={role}>
              <Field label={label}>
                <TextInput
                  id={`${panelId}-${role}`}
                  type="text"
                  spellCheck={false}
                  autoCapitalize="none"
                  // The derived colour, so an empty box reads as "whatever the derivation says"
                  // rather than as nothing. Leaving it empty is how a role goes back.
                  placeholder={palette[role]}
                  value={advanced.colors[role] ?? ""}
                  disabled={!advanced.enabled}
                  onChange={(event) => onChange(setOverride(draft, role, event.target.value))}
                />
              </Field>
            </li>
          ))}
        </ul>

        <h3 className={`m-0 ${HEADING.section.className}`}>What the numbers say</h3>
        {/*
         * **The one row spec these readings do not take** (B-43). They were the fourth spelling
         * of "a hairline-separated row" — `py-1` under a rule on every line, so dense that the
         * rules dominated the numbers they were separating. §1 prefers white space to borders and
         * §6 makes a border the last resort: a two-column `justify-between` line with a name at
         * one end and a figure at the other is already two columns, and needs no rule to say so.
         */}
        <ul className="m-0 flex list-none flex-col p-0" data-readings>
          {readings.map((reading) => (
            <li key={reading.label} className="flex justify-between gap-4 py-2">
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
        <p className={TYPE.quietLine.className}>
          Text is usually asked to reach 4.5:1, and larger text 3:1.
        </p>

        {brandSteppedBack && (
          <p className={TYPE.quietLine.className}>
            Your colour is too close to the page background to fill a button, so the buttons use a
            stronger version of it. Your colour itself is unchanged.
          </p>
        )}
      </div>
    </div>
  );
}
