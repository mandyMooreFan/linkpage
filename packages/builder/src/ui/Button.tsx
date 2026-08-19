import type { ButtonHTMLAttributes, JSX, Ref } from "react";

/**
 * The tool's three button weights, written once.
 *
 * **A component rather than `@apply` or a repeated utility string** (`SPEC.md` §7.4). `@apply`
 * rebuilds the indirection utilities exist to remove — a class whose meaning lives in another
 * file — and a repeated string is the same decision copied until one copy is wrong.
 *
 * Paper has no boxes (§7.4), so weight is carried by fill and by type rather than by borders:
 * `primary` is the one filled thing on a screen, `secondary` is a hairline outline, and `quiet`
 * is a sentence you can press. Every one keeps §7.6's tap floor.
 */
export type ButtonWeight = "primary" | "secondary" | "quiet";

const WEIGHT: Record<ButtonWeight, string> = {
  primary:
    "tap shrink-0 rounded-sm bg-ink px-5 py-2 font-sans text-ground " +
    "disabled:cursor-default disabled:bg-rule disabled:text-ink-quiet",
  secondary:
    "tap self-start rounded-sm border border-rule bg-transparent px-4 py-2 font-sans text-base",
  quiet: "tap self-start bg-transparent py-2 font-sans text-base underline underline-offset-4",
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
