import type { JSX, ReactNode } from "react";
import { Field, useJudged } from "../flow/questions/Question.js";

/**
 * The one text input, as a component (§7.4's component layer, #142).
 *
 * Every single-line text answer in the builder is this: a `Field` around one underlined input,
 * controlled by the question that owns the value. What #142 adds is the seam for judgement —
 * a field that carries `validate` is registered with the form `Question` provides, so its
 * sentence appears **on `Continue` and not before**, then re-checks live (§7.9 decision 2).
 * A field without `validate` is never judged on screen at all: phone, email and the URLs keep
 * their §7.9 notice where it always was, the review list's mark (decision 5).
 */

const INPUT_CLASS =
  "tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink";

export interface TextFieldProps {
  readonly label: string;
  readonly hint?: ReactNode;
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  /**
   * §7.9's sentence when the value cannot be used — return `true` for a usable (or empty)
   * value, the sentence otherwise. Requires `name`. Absent, the field is never judged here.
   */
  readonly validate?: (value: string) => string | true;
  /** The registration name; unique within one question. Required with `validate`. */
  readonly name?: string;
  readonly type?: string;
  readonly placeholder?: string;
  readonly autoComplete?: string;
  readonly inputMode?: JSX.IntrinsicElements["input"]["inputMode"];
  readonly spellCheck?: boolean;
  readonly autoCapitalize?: string;
}

export function TextField(props: TextFieldProps): JSX.Element {
  if (props.validate !== undefined && props.name !== undefined) {
    return <JudgedText {...props} name={props.name} validate={props.validate} />;
  }
  return (
    <Field label={props.label} hint={props.hint}>
      {plainInput(props)}
    </Field>
  );
}

/**
 * The judged variant. The question's own state stays the source of the value; `useJudged`
 * holds the sentence and its timing — silent until `Continue`, gone the moment the value
 * becomes usable. Late to speak, quick to stop.
 */
function JudgedText(
  props: TextFieldProps & {
    readonly name: string;
    readonly validate: (v: string) => string | true;
  },
): JSX.Element {
  const message = useJudged(props.name, props.value, props.validate);
  return (
    <Field label={props.label} hint={props.hint} message={message}>
      {plainInput(props)}
    </Field>
  );
}

function plainInput(props: TextFieldProps): JSX.Element {
  return (
    <input
      type={props.type ?? "text"}
      className={INPUT_CLASS}
      value={props.value}
      placeholder={props.placeholder}
      autoComplete={props.autoComplete}
      inputMode={props.inputMode}
      spellCheck={props.spellCheck}
      autoCapitalize={props.autoCapitalize}
      onChange={(event) => props.onValueChange(event.target.value)}
    />
  );
}
