import type { InputHTMLAttributes, JSX, Ref, TextareaHTMLAttributes } from "react";

/**
 * A text control, as a ruled line rather than as a box.
 *
 * Paper's whole idea is structure from space rather than from containers (`SPEC.md` §7.4), so a
 * field is a line you write on. The underline is the one border in the tool, and it recolours on
 * focus rather than moving anything — a control that reflows when you reach it is a control that
 * feels broken on a phone.
 *
 * **This is the only place the recipe is written**, which is §7.4's rule about controls being
 * components rather than repeated strings. It had stopped being true: the string existed in
 * thirteen places, and this component — the one that owned the placeholder colour — had no call
 * sites at all, so the placeholder rule reached nothing and every field fell back to the
 * browser's own grey. `controls.test.ts` now holds the rule by reading the sources.
 *
 * **The placeholder is held to the body contrast threshold**, not to a "lighter than the value"
 * feel. §7.4 moves the exact-colour field's example out of the hint and into the placeholder so it
 * stops reading as instruction — which makes it information, and information has to be readable.
 * At `text-ink-quiet/60` it composited to 2.49:1; at full strength it is 5.60:1, still visibly
 * lighter than the entered value's 16.02:1.
 */

/** The one recipe. Exported so `controls.test.ts` can assert on it rather than re-spell it. */
export const INPUT_CLASS =
  "tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg " +
  "placeholder:text-ink-quiet focus:border-ink";

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly ref?: Ref<HTMLInputElement>;
}

export function TextInput({ className, ...rest }: TextInputProps): JSX.Element {
  return <input className={`${INPUT_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}

/**
 * The same line, for an answer that runs to several — the address, and nothing else today.
 *
 * **It lives here rather than in its own file so the two cannot drift.** They are one control at
 * two heights: an address written the way you would write it on an envelope is still a ruled line
 * you write on, and a box would make it the only boxed field in the tool. Sharing `INPUT_CLASS`
 * is what keeps that true without a second string to keep in step — which is the whole failure
 * this file exists to have fixed.
 */
export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({ className, ...rest }: TextAreaProps): JSX.Element {
  return <textarea className={`${INPUT_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}
