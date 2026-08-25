import type { JSX, ReactNode } from "react";
import { Field, useJudged } from "../flow/questions/Question.js";
import { TextInput, UrlInput } from "./TextInput.js";
import { splitWebAddress, typedWebAddress } from "./webAddress.js";

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

/**
 * The one web-address field (design change 10, finding B-55).
 *
 * All four of them — the link button's destination in the flow and again in the review list, the
 * directions link, and a social account — are this, so the scheme is written on the line once
 * rather than as a placeholder four times. **The value it hands back is the whole address**,
 * scheme and all, exactly as `project.json` has always held it; `webAddress.ts` is where the
 * split between the line and the box lives, and why.
 *
 * **`onCommit` rather than an `onBlur` passthrough**, because a passthrough would be a trap: the
 * `event.target.value` a caller reached for is the *box*, which no longer holds the address. The
 * review list's mend (§7.9 decision 4) is the one caller that needs the moment the owner leaves
 * the box, and what it needs is the value, so that is what it is given.
 */
export interface UrlFieldProps {
  readonly label: string;
  readonly hint?: ReactNode;
  /** The whole address, scheme included — what the project stores. */
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  /** Leaving the box, with the whole address. The review list mends here; nothing else uses it. */
  readonly onCommit?: (value: string) => void;
}

export function UrlField({
  label,
  hint,
  value,
  onValueChange,
  onCommit,
}: UrlFieldProps): JSX.Element {
  const { scheme, rest } = splitWebAddress(value);
  return (
    <Field label={label} hint={hint}>
      <UrlInput
        scheme={scheme}
        value={rest}
        onChange={(event) => onValueChange(typedWebAddress(value, event.target.value))}
        onBlur={onCommit === undefined ? undefined : () => onCommit(value)}
      />
    </Field>
  );
}

function plainInput(props: TextFieldProps): JSX.Element {
  return (
    <TextInput
      type={props.type ?? "text"}
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
