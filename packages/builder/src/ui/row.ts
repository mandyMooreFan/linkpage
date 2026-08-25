/**
 * One spec for "a row in a hairline-separated list", written once. `SPEC.md` §7.4, §1, §6.
 *
 * Paper's structure comes from **space rather than containers**, which leaves the hairline doing a
 * lot of work — and four different hands had written it four different ways. The design audit
 * (B-43) found the review rows at `py-4`, the language picker at `py-2` with the *identical*
 * two-line label-and-meta structure, the link-button rows at `py-3`, and the contrast readings at
 * `py-1` — 4px of padding under a rule on every line, dense enough that the rules dominate. §6 asks
 * that every list row use the same class string; §1 asks that a row's padding be ≥4–5× the gap
 * inside it. Four arbitrary numbers answer neither.
 *
 * **The numbers are carried beside the classes, the way `ladder.ts` carries its own**, because the
 * one thing a row's padding has to stay true against is the ladder *inside* the row. A boundary
 * narrower than the gaps it is separating inverts the grouping, and the ladder moves: #187 widened
 * field-to-field from 16px to 32px, which on its own turned the link-button rows' `py-3` into a
 * 24px boundary around 32px contents. `controls.test.ts` holds the comparison so the next widening
 * fails a test rather than merely looking odd.
 *
 * **Constants rather than a component**, unlike `Button` and `TextInput`. §7.4's rule is about
 * *controls* — a thing with behaviour and states that a hand-copied string gets wrong. These rows
 * are not one control: they are a `<ul>` and an `<ol>`, holding a two-line pressable summary, a
 * pair of text fields, and a scrolling picker, each with its own data hooks. A component covering
 * that would take `as`, a `className` passthrough and arbitrary props, which is the utility string
 * again with extra steps. What they must actually agree on is the separation and the padding, and
 * that is what these name.
 *
 * **The readings deliberately left the family.** B-43's fix takes the contrast readout *out* of
 * hairline rows entirely — a two-column `justify-between` line separated by ground needs no rule
 * (§1 prefers white space to borders; §6 makes a border the last resort).
 */

/**
 * The list a row sits in: hairlines between the rows, and one at each end.
 *
 * `divide-y` rather than a `border-b` per row, so the last row does not trail a rule into whatever
 * follows it, and the list's own two edges are stated once.
 */
export const ROW_LIST = "m-0 list-none divide-y divide-rule border-y border-rule p-0";

/**
 * A row holding a line or two — a summary, a name over a sample.
 *
 * 16px against the 2px inside a two-line row is 8:1, comfortably past §1's ≥4× floor. It is the
 * measurement the language picker's `py-2` failed at exactly 4:1.
 */
export const ROW_PADDING = { className: "py-4", px: 16 } as const;

/**
 * A row that is itself a stack of fields — the link-button editor, and nothing else today.
 *
 * It cannot take the padding above. Two rows meeting at `ROW_PADDING` are 32px apart, which is
 * exactly `LADDER.betweenFields` — so the boundary *between* two link buttons would be no wider
 * than the gap between the two fields inside one, and the rows would stop reading as rows. 20px a
 * side puts them `LADDER.betweenSections` apart, which is the rung §1 asks for between groups, and
 * a row holding its own fields is a group.
 */
export const ROW_STACK_PADDING = { className: "py-5", px: 20 } as const;

/**
 * A full-width, two-line, pressable row — the shape the change list anticipated when it asked for
 * *named* variants rather than an eleventh anonymous string.
 *
 * Two sites: the review row (field name over the owner's answer) and the language picker (the
 * language in its own language, over the words choosing it puts on the page). The colours the two
 * lines take are the caller's, because they are opposite in the two cases: in a review row the
 * lower line is the owner's answer and takes the ink (B-62), while in the picker the lower line is
 * a sample and stays quiet.
 */
export const ROW_BUTTON = `tap flex w-full flex-col gap-0.5 bg-transparent ${ROW_PADDING.className} text-start font-sans`;

/**
 * What an open row is delimited by (B-41, B-42).
 *
 * **Space, not a heavier line.** The hairline above an open row is the *same* hairline that
 * separates two one-line summaries, so a 600px form and a 78px row were delimited identically —
 * the boundary out of an open row measured 32px against the form's own internal gaps. §1 prefers
 * space to borders, so the rule is untouched and the gap grows instead.
 *
 * **48px below**, which is the widest gap on the screen: past `LADDER.betweenSections`, so nothing
 * inside the form it closes can be mistaken for the boundary out of it. **32px above**, which is
 * the *one* owner of an open row's top offset — three of the ten editors used to bring their own
 * `mt-4` and the other seven sat flush against the rule (B-42) — and which stays level with
 * `LADDER.betweenFields` so the form's own widest internal rung does not out-space its own edge.
 */
export const ROW_OPEN = { className: "pt-8 pb-12", topPx: 32, bottomPx: 48 } as const;
