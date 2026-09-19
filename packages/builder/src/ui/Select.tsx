import type { JSX, Ref, SelectHTMLAttributes } from "react";
import { LINE_CLASS } from "./TextInput.js";

/**
 * The picker, on the same ruled line as every other answer (§7.4; the pattern is `TextInput.tsx`).
 *
 * **One picker in the whole tool** — the address screen's state (§2.3, #364, built by #386) —
 * and it exists for one reason: a US owner facing a blank area asked where the state goes, and
 * the state on an envelope is a two-letter abbreviation that a box would invite them to spell
 * out. So the control is a list of names that spells the abbreviation for them, and that is the
 * whole of its job; nothing reads the answer as data.
 *
 * **It wears `LINE_CLASS`, not a box.** A native `<select>` arrives as a bordered, filled
 * control with rounded corners, which would make it the only boxed field in the tool; the line
 * recipe strips the border to the one underneath, the fill to the paper, and keeps the `tap`
 * floor and the focus line every text field has. Native rendering is kept beyond that, for
 * `Checkbox.tsx`'s reason: the browser's own list is the one a phone opens as a wheel and a
 * laptop opens as a menu, and redrawing it would be a container built to arrive at what the
 * browser already does once the colour is right. The arrow it paints is the one piece of
 * browser furniture left, and it is the one that says *this opens*.
 *
 * **The first option is blank**, so a picker nothing has been chosen on looks like a box nothing
 * has been typed in — the screen wants any one box filled (§7.9), and a state chosen for the
 * owner would be an answer they never gave.
 */

/** The one recipe. Exported so `controls.test.ts` can assert on it rather than re-spell it. */
export const SELECT_CLASS = LINE_CLASS;

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly ref?: Ref<HTMLSelectElement>;
}

export function Select({ className, ...rest }: SelectProps): JSX.Element {
  return <select className={`${SELECT_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}
