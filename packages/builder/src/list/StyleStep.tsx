import {
  MODES,
  parseHex,
  SHAPES,
  TYPE_PAIRINGS,
  type Clock,
  type WeekStart,
} from "@linkpage/renderer";
import { useId, useState, type JSX, type ReactNode } from "react";
import { BRAND_SWATCHES } from "../flow/index.js";
import { Field } from "../flow/questions/Question.js";
import { LADDER } from "../ui/ladder.js";
import { hasContent } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import { Advanced } from "./Advanced.js";
import { clearAccent, setStyle } from "./edits.js";
import {
  CLOCK_LABELS,
  MODE_LABELS,
  SHAPE_LABELS,
  TYPE_LABELS,
  WEEK_START_LABELS,
} from "./labels.js";
import { TextInput } from "../ui/TextInput.js";
import { Button } from "../ui/Button.js";

/**
 * _How it looks_: the six style controls, and the advanced disclosure at their foot.
 * `SPEC.md` §3.1, §3.4, §7.4, §7.6.
 *
 * > **You bring the colours, we bring the shape.**
 *
 * §3.1's table is the whole of the default surface, and this is that table: main colour, second
 * colour, shape, type pairing, corner softness, light or dark. Nothing else belongs here — no
 * preset touches any of it (§7.3), and every colour that is not one of the two the owner gave
 * is derived at render time and never stored (§3.2), so there is nothing else to offer.
 *
 * **The main colour is the constrained field, again.** The same twelve swatches the flow's
 * colour question uses, for the same reason: readability is guaranteed by the field rather than
 * by warnings (§3.3), so an owner who stays inside it is never quietly stepped back and never
 * told off. A hand-typed hex beside them is honoured exactly, and if it cannot carry a filled
 * button it takes a quieter role in the derivation — reported at the foot of this step, and
 * nowhere else.
 *
 * **Everything writes through, and there is no Save.** The page beside the list is what the
 * controls are for; a style control whose effect waits for a button is a control the owner
 * cannot use to choose. A typed hex is the one exception, and only until it parses — writing
 * `#c2` on the way to `#c2185b` would put a colour nobody chose on the page.
 *
 * **The two hours preferences ride here rather than on the hours question**, where the flow
 * left them: `clock` and `weekStart` are display preferences (§2.3) and not facts about a
 * business, so they belong with the other things about how the page reads. They appear only
 * when there are hours to read, which is `hasContent` answering — the same predicate the rest
 * of the list uses, rather than a second opinion about whether the section is there.
 */

/**
 * The two hours display preferences (§2.3). Spelled out here rather than exported from the
 * renderer, which has no reason to publish them: they are two lists of two.
 */
const CLOCKS: readonly Clock[] = ["12h", "24h"];
const WEEK_STARTS: readonly WeekStart[] = ["mon", "sun"];

export interface StyleStepProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
}

export function StyleStep({ draft, onChange }: StyleStepProps): JSX.Element {
  const style = draft.style;
  // Bound to a const so the narrowing below survives into the handlers.
  const hours = draft.hours;

  return (
    // Six controls in a stack is a stack of fields, so it takes the field-to-field rung — it had
    // the ladder right already at 24px, and follows it up now that the rung has moved.
    <div className={`mt-4 flex flex-col ${LADDER.betweenFields.className}`} data-style-step>
      <ColourControl
        label="Your main colour"
        hint="Everything else on the page is worked out from it."
        value={style.brand ?? ""}
        onPick={(brand) => onChange(setStyle(draft, { brand }))}
      />

      <ColourControl
        label="A second colour"
        hint="Optional. It shows up as links and small details."
        value={style.accent ?? ""}
        onPick={(accent) => onChange(setStyle(draft, { accent }))}
        onClear={() => onChange(clearAccent(draft))}
      />

      <Choice
        legend="Shape"
        value={style.shape}
        options={SHAPES.map((shape) => [shape, SHAPE_LABELS[shape]] as const)}
        onPick={(shape) => onChange(setStyle(draft, { shape }))}
      />

      <Choice
        legend="Lettering"
        value={style.type}
        options={TYPE_PAIRINGS.map((type) => [type, TYPE_LABELS[type]] as const)}
        onPick={(type) => onChange(setStyle(draft, { type }))}
      />

      <Field label="Corner softness" hint="Sharp on the left, rounded on the right.">
        <input
          type="range"
          className="tap w-full"
          min={0}
          max={1}
          step={0.05}
          value={style.corners}
          onChange={(event) => onChange(setStyle(draft, { corners: Number(event.target.value) }))}
        />
      </Field>

      <Choice
        legend="Light or dark"
        value={style.mode}
        options={MODES.map((mode) => [mode, MODE_LABELS[mode]] as const)}
        onPick={(mode) => onChange(setStyle(draft, { mode }))}
      />

      {hours !== undefined && hasContent(draft, "hours") && (
        <>
          <Choice
            legend="How times read"
            value={hours.clock}
            options={CLOCKS.map((clock) => [clock, CLOCK_LABELS[clock]] as const)}
            onPick={(clock) => onChange({ ...draft, hours: { ...hours, clock } })}
          />
          <Choice
            legend="The week starts on"
            value={hours.weekStart}
            options={WEEK_STARTS.map((start) => [start, WEEK_START_LABELS[start]] as const)}
            onPick={(weekStart) => onChange({ ...draft, hours: { ...hours, weekStart } })}
          />
        </>
      )}

      {/* Last, so the owner meets the six controls before they meet the exit from them (§7.4). */}
      <Advanced draft={draft} onChange={onChange} />
    </div>
  );
}

/**
 * The constrained field plus the exact-hex escape hatch (§3.1, §3.3).
 *
 * The same twelve colours the flow offers — `BRAND_SWATCHES` is one list with two callers, so
 * the field an owner meets on day one is the field they come back to.
 */
function ColourControl({
  label,
  hint,
  value,
  onPick,
  onClear,
}: {
  readonly label: string;
  readonly hint: ReactNode;
  readonly value: string;
  readonly onPick: (colour: string) => void;
  /** Present on the optional colour only: absent is a state, empty is not. */
  readonly onClear?: () => void;
}): JSX.Element {
  const [typed, setTyped] = useState(
    value !== "" && !BRAND_SWATCHES.some((swatch) => swatch.hex === value) ? value : "",
  );
  const groupId = useId();

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="block text-base font-medium">{label}</legend>
      {/*
       * No `mt-1` of its own: the fieldset is a gapped column, so the offset was additive and
       * the same hint string rendered 12px here against `Field`'s 4px (B-11). The container owns
       * the ladder, in one place, exactly as it does inside a field.
       */}
      <p className="block text-sm text-ink-quiet">{hint}</p>

      <ul className="m-0 flex list-none flex-row flex-wrap gap-3 p-0">
        {BRAND_SWATCHES.map((swatch) => (
          <li key={swatch.hex}>
            <button
              type="button"
              className="size-12 rounded-full border border-rule aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-ink"
              data-swatch
              style={{ background: swatch.hex }}
              aria-label={swatch.name}
              aria-pressed={value.toLowerCase() === swatch.hex}
              onClick={() => {
                setTyped("");
                onPick(swatch.hex);
              }}
            />
          </li>
        ))}
      </ul>

      <label className="flex flex-col" htmlFor={groupId}>
        <span className="mt-1 block text-sm text-ink-quiet">
          Or type an exact colour, like #c2185b.
        </span>
        <TextInput
          id={groupId}
          type="text"
          value={typed}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(event) => {
            const next = event.target.value;
            setTyped(next);
            // Half-typed is not an answer: `#c2` on the way to `#c2185b` would put a colour
            // nobody chose on the page for two keystrokes.
            if (parseHex(next.trim()) !== null) onPick(next.trim());
          }}
        />
      </label>

      {onClear !== undefined && value !== "" && (
        <Button
          weight="secondary"
          data-escape
          onClick={() => {
            setTyped("");
            onClear();
          }}
        >
          Just the one colour
        </Button>
      )}
    </fieldset>
  );
}

/** A closed set of preferences, as radios: all the answers visible, one of them chosen. */
function Choice<T extends string>({
  legend,
  value,
  options,
  onPick,
}: {
  readonly legend: string;
  readonly value: T;
  readonly options: readonly (readonly [T, string])[];
  readonly onPick: (value: T) => void;
}): JSX.Element {
  const name = useId();

  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="block text-base font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map(([option, label]) => (
          <label key={option} className="tap flex items-center gap-1.5">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onPick(option)}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
