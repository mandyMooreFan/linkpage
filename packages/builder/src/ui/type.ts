/**
 * One size per role, and one recipe per heading level. `SPEC.md` §7.4, §2; design change 11
 * (#198), findings B-30, B-31, B-32, B-33.
 *
 * Paper says **type is the only decoration** (§7.4) — there is no card, no fill and no elevation
 * to make one thing outrank another, so the size a string is set at *is* the hierarchy. That makes
 * these seven numbers load-bearing in the same way `ladder.ts`'s four are, and it is why they live in
 * one place rather than in whichever `text-*` each screen reached for.
 *
 * The rule they answer to, from §2: **every size is a step from one scale**; hierarchy is made with
 * **weight and colour before size**; and **one size step per level of hierarchy is enough**. What
 * the audit found instead was the same role set at two sizes *in the same file* — the component's
 * own doc comment calling the preamble "one quiet line above the title" and the hint "one quiet
 * line under the title", at 14px and 16px (B-30); the progress bar naming the topic you are on at
 * 14px in its header and 16px in the drawer that opens under it, so the same words appeared twice,
 * two sizes apart, on one screen (B-31); two `<h3>` recipes eight pixels apart and three different
 * leading/tracking pairings across the serif headings (B-32); and one meaning — *this will not
 * work* — carrying three type treatments, one of which was the only `font-semibold` anywhere in
 * the tool (B-33).
 *
 * **Why `px` is carried beside the class.** The same reason `ladder.ts` and `row.ts` carry theirs:
 * a scale is only worth what its steps render as, and the one thing these have to stay true
 * against is each other. `controls.test.ts` holds the steps apart and in order, so a level promoted
 * past the one above it fails a test rather than merely looking odd — and a reader comparing a
 * page title to a section title compares two numbers rather than two Tailwind spellings.
 *
 * **The scale is exactly the steps some role sets, and no more.** #195 retired `1.125rem` from the
 * exported page rather than rehousing it, on the argument that a step no rule sets is bytes for
 * nothing; the builder pays in generated utilities rather than in exported bytes, but the reason
 * survives the change of currency — an unused step is a fifth option offered to the next person
 * choosing, with nothing on screen to compare it against. `controls.test.ts` asserts every entry
 * here reaches a screen.
 *
 * **`text-lg` was the question this file left open, and `answer` is the answer** (B-29, #227).
 * #198 recorded five roles and deliberately did not record 18px as a sixth: the ruled line set
 * the owner's own answer a step *above* the label naming it, item 0 of the change list had
 * already agreed that was wrong, and naming the step would have settled by accident a question
 * #180 asked out loud. `answer` settles it the other way — the value comes down to the body step
 * and takes its distinction from weight, colour and the line under it, which is the order §2 asks
 * for. `text-lg` now reaches no type role at all; the two reorder arrows still draw their glyphs
 * at that step, and a glyph sized to be pressable is not a level of hierarchy.
 */

/**
 * The three serif headings, one recipe each.
 *
 * **Tied to the HTML level rather than to a place on a screen**, which is the whole of B-32's fix.
 * The audit found `text-2xl leading-tight` on one heading, `text-3xl leading-tight tracking-tight`
 * on another, `text-xl` with neither on a third and `font-serif text-base` — a heading at body size
 * with no weight bump — on a fourth. Naming them by level is what stops "the sheet's title" and
 * "the row's title" drifting apart again while both remain `<h2>`.
 *
 * **The tracking stops at 20px, and that is a decision rather than an omission.** `tracking-tight`
 * is −0.025em, an optical correction for display sizes: at 30px and 24px a serif set at its default
 * tracking reads loose, and at 20px it does not. Two leading/tracking pairings survive where the
 * audit found three, each now attached to a level instead of to a hand.
 *
 * `font-serif` is written into every recipe even where the surface already inherits it (the flow's
 * screen sets it on its root), so that one string is the whole answer to "what does a heading look
 * like" and a heading moved to another surface takes its face with it.
 */
export const HEADING = {
  /** `<h1>`: the one thing the screen is about — the question being asked, the page being edited. */
  page: { className: "font-serif text-3xl leading-tight tracking-tight", px: 30 },
  /** `<h2>`: a screen inside a screen — a question opened in a row, the download sheet, a section of the list. */
  screen: { className: "font-serif text-2xl leading-tight tracking-tight", px: 24 },
  /** `<h3>`: a part of one of those — the sheet's two halves, the advanced readout. */
  section: { className: "font-serif text-xl leading-tight", px: 20 },
} as const;

/**
 * The roles that are not headings.
 *
 * **`quietLine` carries its colour, and `notice` carries its own.** §2 ranks weight and colour
 * above size, so the instrument that says *this is supporting text* is `text-ink-quiet` and the
 * instrument that says *this will not work* is `text-notice` — the size is what stays still while
 * the colour does the talking. Writing the pair as one string is what stopped B-33: the notice
 * colour had picked up `font-semibold` at one of its three sites, which pushed the sheet and the
 * list to four font weights against §2's two, to say a thing the colour was already saying.
 */
export const TYPE = {
  /**
   * What the owner types, on the ruled line they type it on — every text field, the address, the
   * time boxes, the prefixed web address (`TextInput.tsx`).
   *
   * **The same step as the label that names it, which is the whole of B-29.** Every input in the
   * tool was `text-lg` while its own label was `text-base` and its hint `text-sm`, so the control
   * shouted and the thing naming it did not — and the placeholder, being the input's own type,
   * came out *larger than the field's name* (B-71). §2 puts weight and colour before size and
   * allows one step per level of hierarchy; a label and its answer are not two levels, they are
   * one field. So the size is the thing held still here, and three instruments already say which
   * is which: the label's `font-medium` against the answer's regular weight, `text-ink-quiet` on
   * everything around it against full ink on the answer, and the underline, which in paper *is*
   * the control (§7.4).
   *
   * **Declared rather than inherited**, for B-16's reason one component over: Tailwind's preflight
   * gives a form control `font-size: 100%`, so an undeclared input takes whatever the surface
   * around it happens to be set at — which is exactly how `primary` came to have no size of its
   * own and read at whatever the serif chain gave it.
   */
  answer: { className: "text-base", px: 16 },
  /**
   * One quiet line — a preamble above a title, a hint under a label, a sample under the option it
   * belongs to, the arrival line above the list's own name.
   *
   * At `text-base` (B-30) a question's hint was also the same size as a `Field` label directly
   * below it, separated from it by weight alone, which is one instrument doing two jobs.
   */
  quietLine: { className: "text-sm text-ink-quiet", px: 14 },
  /**
   * The tool saying something will not work (§7.9): a row's mark, a field's message, a warning in
   * the download sheet.
   *
   * The same fourteen pixels as a hint, because it is the same kind of line — a short sentence
   * attached to something else. The colour is the emphasis.
   */
  notice: { className: "text-sm text-notice", px: 14 },
  /**
   * The type the progress bar is set in, on its root and nowhere inside it (B-31).
   *
   * **Declared once, at the top, rather than restated on the header row and on the drawer.** The
   * defect was that the header named the current topic at 14px and the drawer named the same topic
   * at 16px directly beneath it; setting both to 14px would have fixed the instance and left the
   * shape — two declarations that have to agree. One declaration cannot disagree with itself.
   */
  bar: { className: "text-sm", px: 14 },
} as const;
