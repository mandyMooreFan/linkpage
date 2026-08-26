/**
 * The form's spacing ladder, written once. `SPEC.md` §7.4.
 *
 * Paper takes its structure **from space rather than from containers** — there is no card, no
 * fill and no elevation to say where one field ends and the next begins, so the space *is* the
 * grouping. That makes these four numbers load-bearing rather than decorative, and it is why
 * they live in one place instead of in whichever `gap-*` each screen reached for.
 *
 * The rule they answer to: a label and its control are one group at **8px and never 0**;
 * field-to-field is **24–32px**, roughly 3–4× the within-field gap; and the ladder is
 * **monotonic** — intra-group < inter-field < inter-section. `ladder.test.ts` holds all three,
 * so a later change that widens one rung past another fails rather than merely looking odd.
 *
 * **Why field-to-field sits at the top of its band rather than the bottom.** Measured on the
 * rendered page rather than read off the class list, which is what finding B-65 asked for: an
 * empty control is 44px of blank, and its only ink is the underline at the bottom. So a label is
 * **52px** above its own underline and, at the agreed 24px, only 24px below the underline of the
 * field before it — still nearer the field above than the one it names, which is the inversion
 * that started this. 32px narrows that to 32 against 52. **No value inside §1's band closes it**,
 * because the deficit is the control's own height; what closes it is the underline reading as the
 * *edge of a region* rather than as a free-floating line, which is the rule's contrast (change
 * list item 1.2) and the focus treatment (#188), not spacing. 32px is where spacing stops helping
 * and starts costing a phone screen a field.
 *
 * **B-29 (#227) took one pixel off both numbers, and confirmed the argument rather than moving
 * it.** Bringing the answer down to the body step shortened the empty control from 45px to 44 —
 * where §7.6's `tap` floor catches it, so no further type-size decision can shorten it again. The
 * deficit really is the control's own height, and that height is now the floor itself.
 *
 * **Why `px` is carried beside the class.** A gap is only worth what it renders as, and in the
 * question shell it is not worth what it says: the `<form>` is itself a `gap-4` column, so a
 * margin written on the field stack is *added* to 16px already spent. `outOfHeading` is that
 * rung — the same 40px as `betweenSections`, bought with less margin — and writing the two
 * numbers down is what stops the next reader "tidying" them into agreement.
 */
export const LADDER = {
  /** Within one field: label → control → hint. Never 0 — that was the owner's first complaint. */
  withinField: { className: "gap-2", px: 8 },
  /** Field → field, in a stack of them. */
  betweenFields: { className: "gap-8", px: 32 },
  /** Group → group: the form to `Back`, a disclosure to what it reveals. */
  betweenSections: { className: "mt-10", gapClassName: "gap-10", px: 40 },
  /** The same rung, out of the heading block, where the shell's own `gap-4` spends 16 of it. */
  outOfHeading: { className: "mt-6", px: 40 },
} as const;
