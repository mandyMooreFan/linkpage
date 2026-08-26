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
 * **Every weight says when it is unavailable**, and each says it with the instrument it has. Only
 * `primary` used to. A disabled `secondary` looked exactly like an enabled one, which mattered
 * most on the "Add" button — disabled on every screen load, because the box beside it starts
 * empty. `primary` drops its fill to `rule`, `secondary` keeps its hairline and steps its text
 * back to the quiet ink — and `quiet`, which now rests at that ink, drops the underline instead
 * (see the weight itself).
 *
 * **One ink for every small text-only button, declared here** (`SPEC.md` §4; finding B-21, #234).
 * `quiet` is the only weight that departs from the ink the screen sets, so it is the only one that
 * names a colour at rest: `primary` names `text-ground` because it sits on a fill, and `secondary`
 * and `inline` deliberately name none, taking the ink of the surface and the sentence they stand
 * in. That is the rule this file is now the single home of — before #234 `WEIGHT.quiet` declared
 * no colour at all and `Back` overrode it at its own call site, so the only place the tertiary
 * ink was written down was the one exception to it.
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
  /**
   * A sentence you can press — `Back`, `Remove`, `Cancel`, "Or type a code" (§4's tertiary).
   *
   * **`text-ink-quiet`, and it is the weight that says so** (B-21, #234). The owner's call is one
   * rule for every small text-only button rather than a split by what the button does: the
   * rejected alternative had navigation (`Back`) reading lighter than acting on your own work
   * (`Remove`, `Cancel`), which is two buckets a new button has to be sorted into and one more
   * thing to get wrong. It also agrees with #191's swap, which gives the owner's own content the
   * full ink and the tool's own words the quiet one — and `Back` and `Remove` are equally the
   * tool's words. **5.60:1 on the ground and 5.98:1 on the surface**, both over §3.3's 4.5 for
   * body text; `controls.test.ts` asserts both, because a colour decision that is only argued in
   * prose is one nobody can fail.
   *
   * **The size is what keeps it a control rather than a hint.** #198 gave a hint
   * `text-sm text-ink-quiet` and #227 warned that a grey underlined tertiary is nearly that
   * recipe. It is not: this is `text-base` (16px) with an underline, against 14px with none, so
   * two of the three instruments still differ and the underline — which in paper *is* the control
   * (§7.4) — is the one that says *press me*.
   *
   * **Which is also why the disabled treatment is the underline and not the ink.** `secondary`
   * says unavailable by stepping its text back to `ink-quiet`; that move is not available to a
   * weight already resting there, and leaving `disabled:text-ink-quiet` here would have been a
   * declaration that draws nothing — B-1's defect, re-made. Taking the underline away leaves a
   * grey line of type that no longer offers to be pressed, at no cost in contrast.
   */
  quiet:
    "tap self-start bg-transparent py-2 font-sans text-base text-ink-quiet underline " +
    "underline-offset-4 disabled:cursor-default disabled:no-underline",
  /**
   * A link inside a sentence — "Already have a project file? **Open it.**"
   *
   * **The one weight deliberately without the tap floor**, and the reason it is a named weight
   * rather than a hand-written string: a 44px-tall word in the middle of a line would push the
   * text apart. Naming it is what stops the next person reaching for `className` instead, which
   * is how the floor got dropped from two real buttons that did need it.
   *
   * **It names no ink on purpose, and that is not an exception to B-21's rule** — it is the rule
   * arriving by inheritance. A word in the middle of a sentence has to be the colour of that
   * sentence or it stops being part of it, and its one call site is a `text-ink-quiet` paragraph
   * (`PresetQuestion.tsx`), so `Open it.` already renders at the same quiet ink `quiet` now
   * declares. Declaring it here would be the same pixels today and the wrong instruction
   * tomorrow: dropped into a full-ink sentence, a link that recedes from the words around it is a
   * link nobody sees.
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
