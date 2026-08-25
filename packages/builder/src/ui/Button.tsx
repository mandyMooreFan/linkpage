import type { ButtonHTMLAttributes, JSX, Ref } from "react";

/**
 * The tool's button weights, written once.
 *
 * **A component rather than `@apply` or a repeated utility string** (`SPEC.md` §7.4). `@apply`
 * rebuilds the indirection utilities exist to remove — a class whose meaning lives in another
 * file — and a repeated string is the same decision copied until one copy is wrong. It had been
 * copied at ten call sites, three of which had dropped `tap` and fallen under §7.6's touch floor,
 * and one of which had invented a fourth weight nobody named. `controls.test.ts` holds the rule
 * now by reading the sources.
 *
 * Paper has no boxes (§7.4), so weight is carried by fill and by type rather than by borders:
 * `primary` is the one filled thing on a screen, `secondary` is a hairline outline, and `quiet`
 * is a sentence you can press.
 *
 * **The three pressable weights differ only in fill, border and rule.** They share a padding, a
 * radius, a type size and a tap floor, so a primary and a secondary standing next to each other
 * are the same box. Two of those agreements are new: `primary` was `px-5` against everyone else's
 * `px-4`, and it declared no type size at all, inheriting one from whatever serif chain it
 * happened to sit in.
 *
 * **Every weight says when it is unavailable.** Only `primary` used to. A disabled `secondary`
 * looked exactly like an enabled one, which mattered most on the "Add" button — disabled on every
 * screen load, because the box beside it starts empty.
 */
export type ButtonWeight = "primary" | "secondary" | "quiet" | "inline";

/**
 * Exported so `controls.test.ts` can assert the weights agree, rather than re-spelling them and
 * drifting from the thing it is guarding.
 */
export const WEIGHT: Record<ButtonWeight, string> = {
  primary:
    "tap shrink-0 rounded-sm bg-ink px-4 py-2 font-sans text-base text-ground " +
    "disabled:cursor-default disabled:bg-rule disabled:text-ink-quiet",
  secondary:
    "tap self-start rounded-sm border border-rule bg-transparent px-4 py-2 font-sans text-base " +
    "disabled:cursor-default disabled:border-rule disabled:text-ink-quiet",
  quiet:
    "tap self-start bg-transparent py-2 font-sans text-base underline underline-offset-4 " +
    "disabled:cursor-default disabled:text-ink-quiet",
  /**
   * A link inside a sentence — "Already have a project file? **Open it.**"
   *
   * **The one weight deliberately without the tap floor**, and the reason it is a named weight
   * rather than a hand-written string: a 44px-tall word in the middle of a line would push the
   * text apart. Naming it is what stops the next person reaching for `className` instead, which
   * is how the floor got dropped from two real buttons that did need it.
   */
  inline: "bg-transparent p-0 font-sans text-base underline underline-offset-4",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly weight?: ButtonWeight;
  /**
   * Forwarded, because focus is a real requirement here rather than a convenience: §7.8's
   * replace confirmation moves focus to its safe action, and §7.7's sheet holds the keyboard.
   */
  readonly ref?: Ref<HTMLButtonElement>;
}

export function Button({
  weight = "secondary",
  type = "button",
  className,
  ...rest
}: ButtonProps): JSX.Element {
  return <button type={type} className={`${WEIGHT[weight]} ${className ?? ""}`.trim()} {...rest} />;
}
