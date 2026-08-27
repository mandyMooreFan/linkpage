# The change list, audited finding by finding

**Issue [#231](https://github.com/mandyMooreFan/linkpage/issues/231)**, of the build map
[#181](https://github.com/mandyMooreFan/linkpage/issues/181). Audited **2026-08-25** against `main`
@ `678af9d`.

> **Amended since the audit.** The tables below are the audit as it stood, and are left as written.
> One verdict has moved: **B-21's colour half**, recorded here as _deliberately left_ and as having
> no ticket, went to the owner and was decided — one ink for every small text-only button — and
> built by [#234](https://github.com/mandyMooreFan/linkpage/issues/234). `WEIGHT.quiet` names
> `text-ink-quiet` and no call site names a colour on a `<Button>` at all.
>
> **R-6 has also been decided, and its verdict stands rather than moves.** It went to the owner with
> the cost stated — the flex fix is ~100 B against 347 B of remaining chrome headroom, a third of what
> is left, for one icon's alignment — and the owner chose to leave it and record why. So it is no
> longer an unowned deliberate leave; it is a **settled scope decision**, recorded in the map's
> _Out of scope_ section. **Every finding on this list is now either built, deliberately left with an
> owner's decision behind it, or ticketed.**
>
> **B-3's "landed" verdict has a remainder, and the method is why**
> ([#240](https://github.com/mandyMooreFan/linkpage/issues/240)). This audit read B-3 as landed from
> the **definition** — `WEIGHT` in `ui/Button.tsx` is unified, which it is, and `Remove` carries
> `tap`, which it does. Both are true, and a call site that **bypasses the component entirely**
> is invisible to either check: `list/Advanced.tsx` went on hand-writing
> `tap bg-transparent py-2 font-sans underline underline-offset-4` — `WEIGHT.quiet` frozen at the
> moment #183 copied it, without the size [#198](https://github.com/mandyMooreFan/linkpage/issues/198)
> later gave it or the ink [#234](https://github.com/mandyMooreFan/linkpage/issues/234) later gave it
> — so the tool's own advanced disclosure stood at full `text-ink` while every other tertiary
> receded. It is now `<Button weight="quiet">`, and `controls.test.ts` asks the question none of
> the sweeps asked: **is a control recipe hand-written anywhere, not only inside a `<Button>` tag?**
>
> **This is the second time a verdict on this list has had a remainder, and the next reader should
> know the shape.** B-39 was the first — this audit caught it itself, recording _partly landed_
> where a resolution said done. B-3 is the harder one: the verdict was not wrong about what it
> checked, it was checking the wrong side. **A finding about "hand-copied at N sites" cannot be
> closed from the definition.** #183, #198, #234 and #230 all swept the call sites by walking
> `<Button>` opening tags, and this audit verified the record they left; nothing in that chain could
> see an element that never became a `<Button>`. Where a finding is about copies, the check has to
> be a sweep over every element, and it has to prove it found something.
>
> **B-72 is built** ([#230](https://github.com/mandyMooreFan/linkpage/issues/230)), so the last of
> item 0's three agreed-and-never-built findings is closed and the "still open" rows below are
> historical. A button is as wide as its words, said once on the weight: `w-fit` on `primary`,
> `secondary` and `quiet`. The table's reading of the cause is worth correcting in passing — the
> `shrink-0` it names is a _main-axis_ class and was drawing nothing at any of the five `primary`
> sites; what stretched `Continue` was the flow column's own `align-items: stretch`, with the width
> unwritten anywhere in the weights at all.
>
> **B-46 is built** ([#248](https://github.com/mandyMooreFan/linkpage/issues/248)), and it is the
> one entry below that has moved from _off the list_ to _on `main`_. This audit names it as one of
> the three findings the change list deliberately left off, **for never having been verified** —
> and that is exactly what it was, so the sentence below stands as written. What changed is the
> reason: [#201](https://github.com/mandyMooreFan/linkpage/issues/201) drove the product in a
> browser and confirmed both halves — 12px of row gap against 8px, and lead-ins at `#1f1b16`
> against `#6b6257`, which is `--color-ink-quiet`, the same grey as the sentences they introduce.
> The owner brought it in on that basis and on the fact that the two lead-ins carry §8's two
> outright warnings. **The door is that narrow**: a finding left off for _merit_ is still off.
>
> The two `<ul>`s in `download/Hosting.tsx` are now one exported recipe, `LEAD_IN_LIST`, and the
> lead-ins take the full ink — settled on the evidence rather than on taste, since the sheet's own
> prose is `text-ink` (`SHEET_SURFACE`) and six of the builder's eight `<strong>`s already rendered
> at it. `controls.test.ts` and `download/download.test.tsx` hold that two lists which are the same
> list twice cannot be tuned one at a time again.

## Why this exists

The map's destination is _both lists_ of
[Design changes agreed from the Tailwind audit](https://github.com/mandyMooreFan/linkpage/issues/180)
built and merged. [#227](https://github.com/mandyMooreFan/linkpage/issues/227) audited **item 0**
alone and found three of its eleven findings agreed and never built — B-29, B-71 and B-72.

**The mechanism is structural.** Each change-list item carries a **finding list** and a **fix
sentence**, written at different resolutions. Where the fix sentence spells out only some of the
findings behind it, the rest sit attached to no instruction — and a ticket built faithfully from
the fix sentence can pass review, merge, and still leave findings on the floor. Item 0 was audited
only because B-29 happened to be noticed in passing.

This document is the other twenty-two items, checked the same way: every finding on the list against
(a) the resolution comment of the ticket that built the item, and (b) the code on `main`.

**Findings not on the change list are out of scope.** The map rules out re-auditing; this is the
list checked against itself. B-28 (a note, not a violation), B-46 (never verified) and R-8 (rejected)
are the three the change list deliberately left off, and they are not audited here.

## The answer, in one line

**Item 0 was the only item with a finding that was agreed, built past, and unnoticed.** Every other
finding on both lists is either on `main`, in flight on the one ticket still open, or was
deliberately left with the reason written down. Two of the deliberate leaves have no ticket owning
them and are worth one; the rest of this document is the working.

## Counts

80 findings are on the change list — 72 builder (B-1 to B-74 less B-28 and B-46) and 8 renderer
(R-1 to R-9 less R-8).

| verdict                                                                                 | count | which                                                                                                                                |
| --------------------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **landed and named** — a resolution says so, by ID or in substance                      | 60    | see the tables                                                                                                                       |
| **landed but never named** — done, but no resolution mentions the finding's own symptom | 4     | B-49, B-59, B-64, B-74                                                                                                               |
| **agreed and never built**                                                              | 3     | B-29, B-71 (both closed retroactively by #227); **B-72, still open as [#230](https://github.com/mandyMooreFan/linkpage/issues/230)** |
| **deliberately left**, with the reason recorded                                         | 2     | B-21's colour half; R-6                                                                                                              |
| **not yet built — the ticket is in flight**                                             | 11    | all of item 12, on [#199](https://github.com/mandyMooreFan/linkpage/issues/199)                                                      |

B-21 appears in two rows: its tap-floor half landed and its ink-vs-ink-quiet half did not. It is
counted once, under _deliberately left_.

### The thing worth carrying forward

**Only 6 of the 18 merged resolutions cite a finding ID at all.** #187 (B-8, B-9, B-10, B-11, B-13,
B-65), #189 (B-14, B-15), #191 (B-41, B-42, B-43, B-62), #192 (B-35, B-43), #198 (B-29, B-30, B-31,
B-32) and #197 (B-55) do; #184, #186, #193, #194, #195, #200, #222 mention one or none. The
resolutions are excellent prose and are _not_ an index — which is exactly the failure mode #227
named when it found B-59 closed with nobody having written the number down. If the map wants the
finding list to stay checkable, the ID belongs in the resolution.

---

# List one — the nine defects

| #   | finding                                                                                   | ticket                                                                                                                      | verdict                                      | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1 | **R-1** brand roles derived against `ground` while `floatingCard` draws them on `surface` | [#184](https://github.com/mandyMooreFan/linkpage/issues/184)                                                                | **landed and named**                         | `palette.ts:175` `const backdrops = [ground, surface]`; every role derives through it (`:180`, `:185`, `:201`, `:229`, `:234`). `toContrast` takes a _set_ of backdrops, so a caller cannot pass one. Fill worst case 3.00, accent 4.50, both modes. #182's resolution names R-1 by ID; #184's does not.                                                                                                                              |
| 1.2 | **B-23** the input underline at 1.31:1                                                    | [#185](https://github.com/mandyMooreFan/linkpage/issues/185)                                                                | **landed and named**                         | `theme.css:58` `--color-control-edge: #948d83` (3.072 on ground, 3.28 on surface); spent only by `LINE_CLASS` (`TextInput.tsx:68`, `border-b border-control-edge`). `--color-rule` stays `#e2d9cb` for decorative separators and is asserted to stay under 3:1.                                                                                                                                                                       |
| 1.2 | **B-64** an empty field is invisible                                                      | #185                                                                                                                        | **landed but never named**                   | Closed by B-23's fix — it _is_ B-23 from the front — but no resolution restates the symptom ("the field reads as a gap with a faint rule under it"). Recorded so it is not mistaken for unbuilt.                                                                                                                                                                                                                                      |
| 1.3 | **B-57** the focus ring is drawn through the hint text                                    | [#187](https://github.com/mandyMooreFan/linkpage/issues/187) + [#188](https://github.com/mandyMooreFan/linkpage/issues/188) | **landed and named**                         | Two independent closures, as the change list intended. #187: `LADDER.withinField` = `gap-2`, 8px against the ring's 4px need, and the hint moved _below_ the control (`Question.tsx:436-462`). #188: `focus-line` sets `outline-color: transparent` on text controls (`theme.css:268-271`), so there is no rectangle left to strike anything.                                                                                         |
| 1.3 | **B-74** on mobile the ring is drawn outside the content column                           | #188                                                                                                                        | **landed but never named**                   | Structurally impossible now — a full-width text control draws no rectangle at all. #188's table records "No rectangle" for text field / textarea / time box, but neither resolution names the column-overflow symptom.                                                                                                                                                                                                                |
| 1.4 | **B-15** two escapes render as bare text (`question__escape`)                             | [#183](https://github.com/mandyMooreFan/linkpage/issues/183) + [#189](https://github.com/mandyMooreFan/linkpage/issues/189) | **landed and named**                         | #183 removed the undefined class and routed both through `<Button>`; #189 names B-15 explicitly and took the pair from `quiet` to `secondary` with `data-escape`. On `main`: `LinkButtons.tsx:169` and `StyleStep.tsx:229-230`. `controls.test.ts` names all four dead BEM classes and goes red if one returns.                                                                                                                       |
| 1.5 | **B-3** (tap-floor half) `Remove` omits `tap`                                             | #183                                                                                                                        | **landed and named**                         | `LinkQuestions.tsx:112` and `LinkButtons.tsx:146` are `<Button weight="quiet">`; `WEIGHT.quiet` carries `tap` (`Button.tsx:39`).                                                                                                                                                                                                                                                                                                      |
| 1.5 | **B-21** (tap-floor half) `Open it.` omits `tap`, uses `p-0`                              | #183                                                                                                                        | **landed and named**                         | `PresetQuestion.tsx:67` is `<Button weight="inline">`; `inline` is the one **named** weight deliberately without the floor, argued in `Button.tsx:42-50` — which is what the change list asked for rather than a hand-written string.                                                                                                                                                                                                 |
| 1.5 | **B-21** (colour half) is the tertiary ink or ink-quiet?                                  | —                                                                                                                           | **deliberately left**                        | #183: _"B-21's ink-versus-ink-quiet question is untouched. The review never settled it, so it stays open rather than being decided inside a refactor."_ Live on `main`: `WEIGHT.quiet` declares no colour and `Back` alone overrides at its call site (`Question.tsx:223` `text-ink-quiet`). #227 re-examined it and confirmed B-29's reading does not settle it. **No ticket owns it.**                                              |
| 1.6 | **B-48** the phone hides the button it names                                              | [#186](https://github.com/mandyMooreFan/linkpage/issues/186)                                                                | **landed and named**                         | `Preview` gained `onCover(covering)` and an `action` slot; `List.tsx:314` `action={covered ? download : undefined}` and `:216` `{!covered && download}` — written once, placed twice, never rendered twice. Both #186 and #190 name B-48.                                                                                                                                                                                             |
| 1.6 | **B-52** the mobile landing, confirmed on screen                                          | #186                                                                                                                        | **landed and named** (in substance, as B-48) | Same fix; B-52 is B-48 seen from the front and #186's subject is exactly that screen. The ID appears in no resolution.                                                                                                                                                                                                                                                                                                                |
| 1.7 | **B-26** the progress track at 1.16:1                                                     | #185 (half) + [#222](https://github.com/mandyMooreFan/linkpage/issues/222)                                                  | **landed and named**                         | #185 took the track `#e5e7eb → #c1b9ac` (1.16 → 1.82) and recorded, as a _test_ (`fill/ground < 9`), that the remaining half needed an owner decision on the fill. #222 made that call: `theme.css:95-96` `--color-progress: #3730a3`, `--color-progress-track: #938d83` — fill/ground 9.30, track/ground 3.08, fill/track 3.02. Both edges clear 3:1. Warmth asserted (red channel over blue), which is the half a ratio cannot see. |
| 1.8 | **B-25** disabled arrows in the hairline colour                                           | #185                                                                                                                        | **landed and named**                         | `LinkButtons.tsx:130,139` `disabled:border-rule disabled:text-ink-quiet` — 1.31 → 5.60. `controls.test.ts` reads the disabled vocabulary off `WEIGHT` and forbids a `disabled:` class outside it.                                                                                                                                                                                                                                     |
| 1.9 | **B-24** the placeholder at 2.49:1                                                        | #183                                                                                                                        | **landed and named**                         | `TextInput.tsx:73` `INPUT_CLASS = LINE_CLASS + placeholder:text-ink-quiet` — full strength, 5.60:1, shipped in the same commit as item 0 exactly as the change list required.                                                                                                                                                                                                                                                         |

**List one: 14 finding-slots, 14 accounted for. One deliberately left (B-21's colour half), two
landed-but-never-named (B-64, B-74), the rest landed and named.**

---

# List two

## Item 0 — the component layer

Audited in full by [#227](https://github.com/mandyMooreFan/linkpage/issues/227); its table is the
source and is not restated here. Spot-checked against `main` and it holds:

- B-1 — none of the four BEM class names survives anywhere in `packages/builder/src`.
- B-2 — one `INPUT_CLASS` in `ui/TextInput.tsx`, shared by `TextArea` and `UrlInput`.
- B-3 / B-16 / B-17 — `WEIGHT` in `ui/Button.tsx`: `primary` and `secondary` share
  `rounded-sm px-4 py-2 text-base tap`, and all three pressable weights carry a `disabled:` state.
- B-68 — `ReplaceConfirm.tsx:107` `items-start` on the stack, `Cancel` at `weight="quiet"`.
- **B-72 remains open.** `WEIGHT.primary` still carries `shrink-0` (`Button.tsx:34`), so Continue
  stretches the flow column while `DownloadSheet.tsx:260`'s primary is content-width in a block
  `<section>`. This is [#230](https://github.com/mandyMooreFan/linkpage/issues/230).

**Tally (from #227): eight landed, two agreed-then-skipped and closed there (B-29, B-71), one
agreed-then-skipped and still open (B-72), one deliberately left (B-21's colour).**

## Item 1 — the field spacing ladder

Built by [#187](https://github.com/mandyMooreFan/linkpage/issues/187). **This is the item most
exposed to the mechanism** — its fix sentence names only the ladder and the hint's position, leaving
six of its eleven findings attached to no instruction. #187 did them anyway and named five of the
six by ID.

| finding                                                        | verdict                    | evidence on `main`                                                                                                                                                                                                                                           |
| -------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B-4** label→control and hint→control both 0px                | **landed and named**       | `Question.tsx:436` `const stack = "flex flex-col " + LADDER.withinField.className` (`gap-2`, 8px). Measured 0 → 8px in #187's table.                                                                                                                         |
| **B-5** the hint is emitted above the control                  | **landed and named**       | `Question.tsx:442-443` and `:455-462` — `{children}` then `{hintText}`, in both branches.                                                                                                                                                                    |
| **B-6** field-to-field 16px                                    | **landed and named**       | `LADDER.betweenFields` = `gap-8`, **32px, not the agreed 24** — with the reason written into `ladder.ts:14-24`: at 24 a label still sat nearer the field above it than its own, and no value in §1's band closes a deficit that is the control's own height. |
| **B-7** the heading block is no further than field-to-field    | **landed and named**       | `LADDER.outOfHeading` = `mt-6`, 40px rendered (the shell's own `gap-4` spends 16 of it — the px is carried beside the class for exactly this reason).                                                                                                        |
| **B-8** `Back` gets the intra-form 16px                        | **landed and named by ID** | `Question.tsx:223` `LADDER.betweenSections.className` = `mt-10`, 40px.                                                                                                                                                                                       |
| **B-9** the Advanced panel opens flush against its button      | **landed and named by ID** | `Advanced.tsx:73` `LADDER.betweenSections`.                                                                                                                                                                                                                  |
| **B-10** Advanced's ten colour fields invert the ladder        | **landed and named by ID** | `Advanced.tsx:95-113` — `<ul>` at `LADDER.betweenFields`, every `<li>` through `Field`. The spacing arrives with the component, which is §7.4's rule doing the work.                                                                                         |
| **B-11** one hint string at three offsets                      | **landed and named by ID** | All three named sites fixed: `StyleStep.tsx:184` (`mt-1` dropped, reason in comment), `List.tsx:549` (same), `List.tsx:607-625` (the language escape routed through `Field`).                                                                                |
| **B-13** the colour answer line is equidistant                 | **landed and named by ID** | `ColourQuestion.tsx:149` `-mt-6` inside the 32px stack → 8px under the grid it reports on. (`-mt-2` in the finding; the compensating value moved with `betweenFields`.)                                                                                      |
| **B-49** seed finding (a), confirmed on screen                 | **landed but never named** | Both halves are closed — the field gap by #187, the opened-row cramping by #191's `ROW_OPEN` (`pt-8 pb-12`). Every resolution talks about "seed finding (a)" or "the owner's first complaint"; none writes B-49.                                             |
| **B-65** the gap inside a field exceeds the gap between fields | **landed and named by ID** | 32 within-to-underline against 52 label-to-own-underline. #187 recorded that the inversion is _narrowed, not eliminated_, and that what finishes it is the underline reading as an edge — #185's contrast and #188's focus, both since landed.               |

## Item 2 — the escape takes the outlined style

Built by [#189](https://github.com/mandyMooreFan/linkpage/issues/189).

| finding                                        | verdict                             | evidence on `main`                                                                                                                                                                                                                                        |
| ---------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-14** the escape uses `quiet`               | **landed and named by ID**          | `Question.tsx:208` `<Button weight="secondary" data-escape>` — §7.2 renders all eight flow escapes through the shell, so the ticket's "eight files" premise was wrong and harmlessly so. `Back` deliberately untouched at `quiet`, which is half the fix. |
| **B-50** seed finding (b), confirmed on screen | **landed and named** (in substance) | Same edit; #189's whole subject. The ID appears in no resolution.                                                                                                                                                                                         |

## Item 3 — one strong button per screen

Built by [#190](https://github.com/mandyMooreFan/linkpage/issues/190), with the hours third already
done by #192.

| finding                                                  | verdict                             | evidence on `main`                                                                                                                                                                                                   |
| -------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-18** the sheet has two solid primaries               | **landed and named**                | `DownloadSheet.tsx:260` `weight="primary"`, `:283` `weight="secondary"`. `SaveButton`'s `weight` is required with no default — "a default is a way of handing out the scarce thing without deciding to".             |
| **B-19** the list shows two primaries when a row is open | **landed and named**                | `List.tsx:179` `weight={!covered && open !== null ? "secondary" : "primary"}`. `covered` outranks the step-down, so where Download travels into the drawer it travels filled — otherwise the fix would re-open B-48. |
| **B-51** the same, confirmed on screen                   | **landed and named** (in substance) | Same expression.                                                                                                                                                                                                     |
| **B-60** seven solid ink blocks on the hours step        | **landed and named**                | `HoursQuestion.tsx:262` `has-checked:picked`, done by #192 as this item's half and _verified_ rather than redone by #190; #190's new source guard now holds it from the fill side too.                               |

## Item 4 — the review list

Built by [#191](https://github.com/mandyMooreFan/linkpage/issues/191). All six.

| finding                                                                          | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-41** an open row is not separated from the rows around it                    | **landed and named by ID** | `ROW_OPEN` = `pt-8 pb-12` (32/48). The hairline is untouched — space, not a heavier line.                                                                                                                                                                                           |
| **B-42** the open row's heading touches the hairline; 3 of 10 editors compensate | **landed and named by ID** | The 32px is the single owner; the three `mt-4`s are gone (`StyleStep`, `LinkButtons`, `LangRow`).                                                                                                                                                                                   |
| **B-43** four specs for "a hairline-separated row"                               | **landed and named by ID** | `ui/row.ts`: `ROW_LIST`, `ROW_BUTTON`, `ROW_PADDING` (16px), `ROW_STACK_PADDING` (20px). The contrast readings leave the family entirely (`Advanced.tsx:126` `py-2`, no rule) — B-43's own fix. **Two paddings, not one**, because #187 widened `betweenFields` to 32px mid-ticket. |
| **B-44** the list header's ladder is flat                                        | **landed and named**       | `List.tsx:228` `mt-8 flex flex-col gap-2` (32 then 8), `:256` `mt-6` on the `<ul>`, `:279` `mb-6` — 32/8/24/24 exactly.                                                                                                                                                             |
| **B-62** the label is inked and the answer grey                                  | **landed and named by ID** | `List.tsx:470` label `TYPE.quietLine + font-medium`, `:474` summary `text-base text-ink`. Colour alone; size and label weight untouched, per the finding.                                                                                                                           |
| **B-63** an open row repeats its own summary                                     | **landed and named**       | `List.tsx:473` `{!open && (…summary…)}`. The §7.9 _mark_ stays doubled deliberately — it is what outlives the screen.                                                                                                                                                               |

## Item 5 — one way of showing a picked option

Built by [#192](https://github.com/mandyMooreFan/linkpage/issues/192).

| finding                                                                                    | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B-34** three (in fact five, plus a sixth copy styling nothing) treatments for "selected" | **landed and named**       | One `@utility picked` (`theme.css:203`), reached from six sites: `ColourQuestion.tsx:119`, `StyleStep.tsx:193`, `PresetQuestion.tsx:130`, `HoursQuestion.tsx:262`, `List.tsx:582`. The seventh copy — the review list's tick-ons carrying `aria-pressed:` classes on a button with no `aria-pressed` — simply went away. |
| **B-35** the selection outline collides with the focus ring                                | **landed and named by ID** | `picked` draws on `::after` and **never touches `outline`**. The obvious reading (`outline-offset: -4px`) was built first and measured: a utility beats `@layer base`, so the ring still vanished. Different geometry, identical bug. #188 re-measured both marks rendering at once.                                     |
| **B-61** the selected segment's square fill overruns its container                         | **landed and named**       | Fixed _by construction_ — there is no fill left to overrun. `overflow-hidden` deliberately not added: nothing is left to clip, and an ancestor clip would eat the focus ring #179 put outside the control.                                                                                                               |

## Item 6 — the two unstyled native controls

Built by [#193](https://github.com/mandyMooreFan/linkpage/issues/193).

| finding                                                 | verdict              | evidence on `main`                                                                                                                                                                                                                                   |
| ------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-56** raw checkboxes paint the browser's accent blue | **landed and named** | `ui/Checkbox.tsx`, `CHECKBOX_CLASS = "size-5 shrink-0 accent-ink"`, at both raw sites. `tap` deliberately kept off the box (a 20px box 44px tall is a stretched rectangle) — both call sites press the whole label, and the label carries the floor. |
| **B-73** the address textarea keeps its resize grip     | **landed and named** | `TEXTAREA_CLASS = INPUT_CLASS + resize-none` (`TextInput.tsx:114`), held as its own string so it cannot recur on a future textarea. `resize-y` was **photographed and rejected** — Chromium paints the identical grip for `resize: vertical`.        |

**Ticket premise corrected:** the tick boxes are in `flow/questions/LinkQuestions.tsx`, not
`list/LinkButtons.tsx`; the change list carries the same bad pairing at item 10.

## Item 7 — the generated page gets a hover state

Built by [#194](https://github.com/mandyMooreFan/linkpage/issues/194).

| finding                                                         | verdict              | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                             |
| --------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-2** no hover, active or transition anywhere in the renderer | **landed and named** | `palette.ts:224` `buttonFillHover` via a new `stepToward` (0.07 OKLCh L toward the ink); `stylesheet.ts:220` `.lp-link:hover,.lp-link:active`. The rule sets fill **and** ink together, because `colourBlock` draws buttons as outlines with page ink. Overridable in the advanced tier (11 boxes, not 10) so a hand-set `buttonFill` cannot leave a hover derived from a colour you replaced. |

**Recorded, not a gap:** `.lp-social-link`, `.lp-row` and `.lp-address` got nothing, deliberately —
each needs a different instrument and none is on either list. Already in the map's fog.

## Item 8 — the page's spacing gets named, the clock mark settles

Built by [#195](https://github.com/mandyMooreFan/linkpage/issues/195). **This item's fix sentence
covers R-3, R-4, R-5 and R-7 and does not mention R-6** — the same shape as item 0's B-72. Unlike
B-72, #195 noticed and said so.

| finding                                                                 | verdict               | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R-3** `floatingCard` removes the surface shift _and_ tightens the gap | **landed and named**  | `chrome.ts:273-275` — no `gap` override survives; `.lp-page` keeps `--lp-space-7` (1.75rem) here as everywhere, and `.lp-panel`'s top padding takes the same rung so the hairline sits midway rather than 28 above / 20 below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **R-4** ~20 spacing literals, five off the 4px grid, no spacing tokens  | **landed and named**  | `stylesheet.ts:142` emits eight `--lp-space-*` rungs, each named for its own multiple of `0.25rem`; the set is closed by test. The five off-grid values collapsed into **two decisions** — an icon stands one rung from its words everywhere, a stacked list puts one rung between items.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **R-5** the hours mark is larger _and_ quieter than body text           | **landed and named**  | `stylesheet.ts:225` `.lp-hours-mark{…color:var(--lp-ink-muted)}` — **no `font-size` at all**. Colour, not size: §2 ranks colour above size, and it makes the page have one icon treatment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| **R-6** the hours icon sits alone on its own line                       | **deliberately left** | Still `display:block`. #195 states it outright: _"that is left standing, deliberately"_ — there is no text for it to sit beside, §2.5 refuses the ninth string a caption would need, the flex fix costs ~100 B against 0.33 KB of chrome headroom, and #180's stated fix for this item is "pick one instrument" and nothing more. What _did_ change is that the mark is now the panel's first row rather than a band above it. The map's fog entry used to describe it as "on no list" — it is on the list, in item 8's finding list, and that line has been corrected. **Put to the owner with the byte cost stated; the owner chose to leave it and record why**, so it is now a settled scope decision rather than an unowned leave. |
| **R-7** the type sizes are literals; two of five used once              | **landed and named**  | Four steps tokenised (`--lp-text-sm/base/lg/xl`). `1.125rem` was **retired rather than rehoused** — a deviation from the change list, recorded as such: picking colour for the hours mark removed its only type use. A test asserts every step is used and no `font-size` is anything but a step.                                                                                                                                                                                                                                                                                                                                                                                                                                       |

## Item 9 — narrow-container layout

Built by [#196](https://github.com/mandyMooreFan/linkpage/issues/196), which measured against `main`
before changing anything and found two of three parts had moved.

| finding                                                   | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-53** "Edit your page" wraps to three lines            | **landed and named by ID** | Fixed incidentally by #186 and verified by #196 at both sizes. **Structural, not just symptomatic:** `Preview.tsx:144` the header row is `flex-wrap`, and `:158-161` the sentence carries `w-full … wide:w-auto`, so on a phone the sentence takes the first line and the controls the second. The container gives the button room, which is what the item asks for.                                              |
| **B-54** "See the page" is the only right-aligned element | **landed and named by ID** | `justify-end` appears **nowhere** in the builder (`Preview.tsx:144` is `justify-start`), and `controls.test.ts` holds it. Read as incidental rather than thumb-reach: nothing else on a flow screen is right-aligned, and on a laptop it was aligned to nothing — 36px off the page frame's own right edge.                                                                                                       |
| **B-67** primary labels wrap in narrow containers         | **landed and named by ID** | The sharpest result in the sweep: **"Download my work first" had stopped wrapping and had exactly 0px of slack** — label 224px inside 224px of usable panel. The symptom was gone and the defect was whole. `MENU_PANEL` (`List.tsx:693`) is now `w-max min-w-64 max-w-[min(20rem,calc(100vw-2.5rem))]`, 64px of slack, with the arithmetic asserted **both ways** so the zero is recorded rather than described. |
| **B-70** the question floats on short steps               | **landed and named**       | Reproduced at different numbers than the ticket recorded (24–185px, not 90/250) and is now 24px on every step at 390. `flex-col` and unprefixed `justify-center` may no longer share a class list, by test.                                                                                                                                                                                                       |

## Item 10 — `https://` becomes a permanent prefix

Built by [#197](https://github.com/mandyMooreFan/linkpage/issues/197).

| finding                                                     | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B-55** `https://` is a placeholder and vanishes on typing | **landed and named by ID** | `URL_ROW_CLASS = LINE_CLASS + "flex items-center"` (`TextInput.tsx:158`) — one ruled line, the box inside drawing nothing. The value decisions are the substance: the stored value keeps its scheme, nothing migrates on open, a pasted scheme is absorbed, **any of §5.3's four safe schemes is shown** rather than a hard-coded `https://`, and an empty box is an empty answer rather than a bare scheme. |

**Ticket premise corrected:** the stated seam (`Field`'s `htmlFor`) was the wrong one — `htmlFor` is
for a row with more than one _control_, and a prefix is text. What it needed was #187's
`LABELABLE_CONTROLS` register (`Question.tsx:320`).

## Item 11 — type consistency in the builder

Built by [#198](https://github.com/mandyMooreFan/linkpage/issues/198).

| finding                                                     | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                |
| ----------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-30** two sizes for the same "one quiet line" role       | **landed and named by ID** | `TYPE.quietLine` = `text-sm text-ink-quiet`, at the preamble, the question hint and the field hint alike.                                                                                                                                                                         |
| **B-31** the progress bar shows the same label at two sizes | **landed and named by ID** | `ProgressBar.tsx:114` — `TYPE.bar` sits **once, on the bar's root**, and nowhere inside it. Setting both places to 14px would have closed the instance and left two declarations that must agree; one declaration cannot disagree with itself. Measured _rendered_, not by class. |
| **B-32** two `<h3>` specs and three serif heading recipes   | **landed and named by ID** | `HEADING.page/screen/section`, **tied to the HTML level rather than to a place on a screen**. Every `<h1>`/`<h2>`/`<h3>` in the builder reaches one of the three. Tracking stops at 20px, deliberately.                                                                           |
| **B-33** `--color-notice` text at three type specs          | **landed and named**       | `TYPE.notice` = `text-sm text-notice` at all five sites; `font-semibold` appears nowhere in `packages/builder/src` outside prose about it. Two weights again.                                                                                                                     |

## Item 12 — the stray sweep

**Not yet built.** [#199](https://github.com/mandyMooreFan/linkpage/issues/199) is open and in flight
at the time of this audit; it is the last unbuilt item on either list. Verified against `main` so the
starting state is on the record, and so a later reader can tell "still to do" from "skipped":

| finding                                                                          | state on `main` @ `678af9d`                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **B-12** hours day rows, 8px padding against an 8px gap                          | unbuilt — `HoursQuestion.tsx:221` `flex flex-col gap-2 border-b border-rule py-2`                                                                                                                                                                                                                                                                                              |
| **B-22** reorder arrows restate `2.75rem` as `min-w-11`                          | unbuilt — `LinkButtons.tsx:130,139`; no `tap-square` utility exists                                                                                                                                                                                                                                                                                                            |
| **B-27** the scrim is `bg-black/40`                                              | unbuilt — `DownloadSheet.tsx:199`                                                                                                                                                                                                                                                                                                                                              |
| **B-37** `shadow-lg` on the menu panel                                           | unbuilt — `List.tsx:767`                                                                                                                                                                                                                                                                                                                                                       |
| **B-38** two overlay surfaces, two radii                                         | unbuilt — `List.tsx:767` `rounded-sm` against `DownloadSheet.tsx:202` `rounded-t-2xl … wide:rounded-2xl`                                                                                                                                                                                                                                                                       |
| **B-39** bracket values with no written reason                                   | **partly landed.** The inset shadow went with #192 and a guard forbids `shadow-[` anywhere. Still open: `max-h-[92dvh]`, `max-w-[34rem]`, `wide:max-h-[88dvh]` (`DownloadSheet.tsx:202`) and `wide:h-[min(80dvh,46rem)]` (`Preview.tsx:183`). Note #196 added a _documented_ bracket value (`MENU_PANEL`) with its arithmetic written out, which is what the finding asks for. |
| **B-40** `self-start` fights `items-center`; the drawer is inset from its header | unbuilt — `WEIGHT.secondary` still carries `self-start` (`Button.tsx:37`); `ProgressBar.tsx:121` `p-0` against `:152,:170` `px-1`. #183 named B-40 and deferred it here explicitly.                                                                                                                                                                                            |
| **B-45** `Hosting` stacks two margins, off-ladder `mt-5`                         | unbuilt — `Hosting.tsx:43-44`                                                                                                                                                                                                                                                                                                                                                  |
| **B-47** hand-rolled copies of `Panel tone="notice"`                             | unbuilt, and **grown from two to four** — `PresetQuestion.tsx:113`, `LogoQuestion.tsx:89`, and two more in `List.tsx:787,792` that arrived with §7.8's menu. `Panel.tsx:23` is imported by neither. Worth flagging to #199.                                                                                                                                                    |
| **B-66** "Copy these times" splits from the buttons it labels                    | unbuilt — `HoursQuestion.tsx:327` `flex flex-wrap items-center gap-2`, label at `:345`                                                                                                                                                                                                                                                                                         |
| **B-69** the scrim reads cold at the seam                                        | unbuilt — same token as B-27                                                                                                                                                                                                                                                                                                                                                   |

## Item 13 — the replace confirmation

Built by [#200](https://github.com/mandyMooreFan/linkpage/issues/200).

| finding                                                      | verdict              | evidence on `main`                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-20** the escape is primary and the real action secondary | **landed and named** | `ReplaceConfirm.tsx:110` "Download my work first" at `secondary` with `ref={escape}` **untouched**, `:119` "Open the file" at `primary`, `:122` `Cancel` at `quiet`. The docblock's safe-focus argument was **amended rather than deleted** — focus order and visual weight answer different questions. A test asserts each button against `WEIGHT` _and_ that `document.activeElement` is still the safe branch. |

## The settled focus block

The change list's _Settled context_ section states that variant A settles **B-35, B-36, B-58 and
R-9**. Built by [#188](https://github.com/mandyMooreFan/linkpage/issues/188), which names all four.

| finding                                                           | verdict                    | evidence on `main`                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B-35** selection outline collides with focus ring               | **landed and named by ID** | See item 5. #192 did the load-bearing half; #188 added the argument and the guard, and measured six pixels of ground between the two marks on a chosen _and_ focused swatch.                                                                                                                                         |
| **B-36** two focus treatments fire, only one keyboard-only        | **landed and named by ID** | `focus:border-ink` and `focus-within:border-ink` are both gone; `focus-line` (`theme.css:260`) uses `&:focus-visible` and `&:has(:focus-visible)`.                                                                                                                                                                   |
| **B-58** the ring is a rectangle around a control drawn as a line | **landed and named by ID** | The underline thickens 1px → 2px and recolours to ink **in place**; the rectangle is turned **transparent rather than off**, so Windows High Contrast still paints an indicator. Reflow proved by measurement, not argument (padding 8→7 against border 1→2).                                                        |
| **R-9** in light mode the page's ring is the button's own colour  | **landed and named by ID** | `stylesheet.ts:213` `a:focus-visible{outline:2px solid var(--lp-ink);outline-offset:3px}` — 4.84 → 15.56 on the ground in light, 5.10 → 16.64 in dark. The `+3px` offset is what keeps §3.3's 7:1 the applicable guarantee. **Bytes went negative**: `--lp-ink` is eight characters shorter than `--lp-accent-text`. |

---

# What needs a ticket

Two findings on the change list are agreed, unbuilt, recorded as deliberate, and **owned by nobody**.
Neither is the B-72 case — both were noticed and argued rather than dropped — but both are still
open items on a list whose destination is "built and merged", so the map cannot close over them
silently.

1. **B-21's ink-vs-ink-quiet half.** Which of two inks does a tertiary action take? Already in the
   map's fog and re-examined by #227, which set out why B-29's reading does not settle it: #191's
   swap (owner's content ink, tool's words quiet) would send _both_ `Back` and `Remove` to
   ink-quiet, while §4's tertiary recipe at 16px grey-and-underlined makes a pressable hint of it —
   and #198 has just spent the argument that a hint is `text-sm text-ink-quiet`. A taste call with a
   real trade.
2. **R-6, the hours icon alone on its own line.** #195 left it with reasons, and it is the closest
   structural analogue to B-72 anywhere on the list — a finding whose item's fix sentence spoke only
   to its neighbour (R-5). The difference is that #195 saw it and wrote it down. The one real fix
   needs the ninth string §2.5 refuses; the alternative is the ~100 B flex row against the remaining
   chrome headroom, which is an owner call about the tripwire as much as about the icon.

   **Decided.** It was put to the owner with that cost stated, and the owner chose to leave it and
   have the reason recorded. It is out of scope for this map — settled, not forgotten — and returns
   only if the destination is redrawn. See the map's _Out of scope_ section.

**Not gaps, listed so they are not mistaken for gaps:**

- All eleven of item 12 — [#199](https://github.com/mandyMooreFan/linkpage/issues/199) is in flight.
- **B-72** — already ticketed as [#230](https://github.com/mandyMooreFan/linkpage/issues/230).
- The fourth double-fill (the replace confirmation's primary beside the list's Download) —
  [#228](https://github.com/mandyMooreFan/linkpage/issues/228); on no finding list, raised by #190.

# Noticed while auditing, deliberately not fixed and not ticketed

These are **not** findings on the change list, so per the map they are out of scope. Recorded only
so the next reader does not have to re-find them.

- `StyleStep.tsx:208-210` — "Or type an exact colour, like #c2185b." is a hint-styled _label_ above
  its control at `mt-1` (4px), where every `Field` hint is now 8px and below. It is a fourth
  instance of B-11's shape at a line B-11 does not name, and #187 flagged the copy question
  separately. B-11's three named copies are all closed.
- `MENU_PANEL`'s `max-w-[min(20rem,calc(100vw-2.5rem))]` is a new bracket value, added by #196 —
  with its arithmetic written out beside it, which is exactly what B-39 asks of one.
- B-47 has grown from two hand-rolled `Panel` copies to four. #199 owns the finding; the two extra
  sites arrived later with §7.8's menu and are not in the finding's own screen list.
