# The accessibility change list, audited item by item

**Issue [#287](https://github.com/mandyMooreFan/linkpage/issues/287)**, the closing ticket of the
build map [#273](https://github.com/mandyMooreFan/linkpage/issues/273). Audited **2026-08-29**
against `origin/main` @ `7eb62d6`, item by item, against
[the change list (#272)](https://github.com/mandyMooreFan/linkpage/issues/272) rather than against
the resolution comments.

> **Method, and why it is stated first.** This audit's predecessor
> ([`change-list-audit.md`](change-list-audit.md), of map #181) exists because
> [#180](https://github.com/mandyMooreFan/linkpage/issues/180) **agreed three findings and never
> built them** — attached to no instruction, with only 6 of 18 resolutions citing a finding id.
> #272 was written to make that impossible: every finding appears exactly once, with an instruction
> or an explicit note that it is knowingly not acted on. **This document is what proves the rule
> held.** So every verdict below was read off the code on `main` — the file, the assertion, the
> section — and a resolution comment saying a thing was done is nowhere treated as evidence that it
> was. Where a resolution's own claim was the only thing checkable (a hand-run mutation, a red
> observed before a green), that is said in the row.

---

## The answer, in one line

**Every one of CL-1 to CL-13 shipped, and shipped what its item said. Nothing was lost, nothing was
widened, and the map can close.**

CL-14, CL-15 and CL-16 are correctly **not built**, and `main` shows no sign of anyone having
quietly done them. Nothing is outstanding that blocks #273.

**One defect found, in the promise rather than in an item.** §7.12's commitment 5 says _"Two stops
are under it"_ where its own check reports **thirteen**, of two kinds — the `inline` weight once,
and §7.2's bar header on twelve of the seventeen screens. That under-states the exception rather
than over-stating the promise, and the check itself hides nothing, so it does not hold the map open.
[**#319**](https://github.com/mandyMooreFan/linkpage/issues/319), and it is one word.

## Counts

|                                                   |                                                                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| items in the change list                          | 16                                                                                                                                             |
| actionable (CL-1 – CL-13)                         | 13                                                                                                                                             |
| **built as instructed**                           | **13**                                                                                                                                         |
| built short, or built differently from the item   | **0**                                                                                                                                          |
| correctly not built (CL-14, CL-15, CL-16)         | 3                                                                                                                                              |
| findings in #272 unanswered by anything on `main` | **0**                                                                                                                                          |
| tickets filed by this map beyond the thirteen     | 5, all merged (#291, #294, #296, #298, #302)                                                                                                   |
| commits on `main` since `42b7e66`                 | 18 — one per item, one per follow-up, none unattributed                                                                                        |
| tickets filed **by this audit**                   | 8 — [#312](https://github.com/mandyMooreFan/linkpage/issues/312) – [#319](https://github.com/mandyMooreFan/linkpage/issues/319), none blocking |

**Eighteen commits, eighteen resolutions, and every one names its CL id or the ticket it answers.**
That is the #180 count inverted: there, 6 of 18 cited a finding.

---

## The thirteen, item by item

Each row: what #272 instructed, and what is on `main` — the file and the assertion, not the claim.

### Group A — defects

**CL-1 — an invalid colour tells nobody anything** ([#275](https://github.com/mandyMooreFan/linkpage/issues/275),
[PR #292](https://github.com/mandyMooreFan/linkpage/pull/292), `c9a2aa2`). **Built as instructed.**
All three halves of the instruction are on `main`: `Question.tsx:482` writes `aria-invalid` inside
the same conditional as `aria-describedby`, so it arrives and leaves with the sentence; the error
text joins `aria-describedby`; and the announcement is §7.9's own `role="alert"` reused rather than
a second announcer beside it. `ColourQuestion.test.tsx` holds all three. The item's open remedy —
whether `Continue` stays enabled — was **decided rather than escalated**, and the derivation is
sound: with `Continue` disabled the sentence has nothing to speak on, and the only other remedy is
judging on a keystroke, which §7.9 decision 2 (#142) already refuses. One remedy left standing is
not a taste call. It moved §7.9 decisions 1 and 3 in `SPEC.md`, which the resolution flagged rather
than buried; **the owner's to overturn, and this audit does not.**

**CL-2 — Escape does not close the progress bar's topic list from the toggle**
([#276](https://github.com/mandyMooreFan/linkpage/issues/276), [PR #289](https://github.com/mandyMooreFan/linkpage/pull/289),
`10e80c3`). **Built as instructed.** `ProgressBar.tsx:136` closes the list on Escape from a
`document` listener while open — the menu's shape, so no third mechanism was invented, which is what
the item asked for. Three tests drive real focus positions rather than dispatching at `document`.
**See _the correction to B-3_ below**: the finding's stated cause was half wrong and it did not
change the fix.

### Group B — the promise, written down

**CL-3 — write §7.12 into `SPEC.md`** ([#274](https://github.com/mandyMooreFan/linkpage/issues/274),
[PR #288](https://github.com/mandyMooreFan/linkpage/pull/288), `b5d0a2b`). **Built as instructed.**
§7.12 sits between §7.11 and §8. Six commitments, the _what these are checked against_ bound, the
_what this does not cover_ exclusions and the _what it must not be read as saying_ paragraph are all
present. **The hedges were not tidied out** — see the §7.12 reading below.

**CL-4 — correct §2.5 and §6.9 for the ninth and tenth words**
([#277](https://github.com/mandyMooreFan/linkpage/issues/277), [PR #290](https://github.com/mandyMooreFan/linkpage/pull/290),
`9a6fb23`). **Built as instructed, and wider than its instruction block — correctly.** §2.5 writes
**ten** throughout, _a change that adds a ninth string_ is now _an eleventh_, both words are recorded
as hand-authored, the price is on the page (**42 hand-written words to 126**), and the growth rule
gained its two halves — a language earns a place when a speaker can name the closed word, the word
it heads its hours with, **and** the word it puts on a link to directions. §6.9's _"the gap stays
open"_ is replaced by the reversal and by why the price changed, and its lesson kept its complement:
_a glyph is never as cheap as its drawing; a word is._ **The instruction named two sections and the
claim lived in six**; correcting only two would have left `SPEC.md` false in exactly the way CL-4
exists to fix. **That is the map's _read the whole item_ rule earning its place with the instruction
block itself as the narrow thing**, and it is not scope creep.

### Group C — the renderer's two new words

**CL-5 — name the hours panel** ([#280](https://github.com/mandyMooreFan/linkpage/issues/280),
[PR #300](https://github.com/mandyMooreFan/linkpage/pull/300), `72ca172`). **Built as instructed.**
`render.ts:379` emits `<h2 class="lp-sr" id="lp-h">` and `render.ts:384` points the `<dl>` at it with
`aria-labelledby`. **Real text, not `aria-label`**, as the item required. **No CSS added** — `.lp-sr`
was already paid for. `exported-page-a11y.e2e.ts:259` reads `heading "Opening hours"` and
`DescriptionList "Opening hours"` back out of a real accessibility tree, and a control strips the
`aria-labelledby` and watches it fall back to `DescriptionList ""`.

**CL-6 — say that the address link opens directions**
([#281](https://github.com/mandyMooreFan/linkpage/issues/281), [PR #304](https://github.com/mandyMooreFan/linkpage/pull/304),
`0143b08`). **Built as instructed.** `render.ts:650` emits the hidden span as the **first** child of
the `<a class="lp-address">`. **§6.9's demanded assertion is there and is asserted rather than
trusted**: `render.test.ts` checks in all 42 languages that the span sits outside
`itemprop="address"` and that the property's text is unchanged, and
`exported-page-a11y.e2e.ts:360` re-reads it out of a real DOM. **The map's sharpest case held up**:
`link-name` passes in both states, so the gated tier was green over the gap before and after, and
only the tree read-back caught it.

**CL-7 — a missing word falls back to English, marked `lang="en"`**
([#282](https://github.com/mandyMooreFan/linkpage/issues/282), [PR #307](https://github.com/mandyMooreFan/linkpage/pull/307),
`b6bd0cc`). **Built as instructed, and the item's reach shrank under measurement — correctly.**
`render.ts:134` emits ` lang="en"` only when `isEnglishFallback(tag)`. The per-word path the
instruction names (_"when a vocabulary has no opening hours or directions word"_) is
**unconstructable**: all 42 entries hold all ten words and `Vocabulary` requires them at the type
level, so the only remaining fallback is an unrecognised tag. **That is narrowing the claim to the
truth, not building short** — and the narrowing is pinned by an assertion rather than left to the
type. Only the **hidden** pair are marked; the day names and the closed word fall back unmarked on
the same page, which is §2.5's original argument holding exactly where it still applies.

### Group D — the checks that make the promise real

**CL-8 — axe-core on the exported page, in CI** ([#278](https://github.com/mandyMooreFan/linkpage/issues/278),
[PR #295](https://github.com/mandyMooreFan/linkpage/pull/295), `7f1bf29`). **Built as instructed.**
`packages/builder/e2e/exported-page-a11y.e2e.ts`, on the existing End-to-end job. The placement
constraint the item named is respected to the letter: `axe-core` is a `devDependency` of
`packages/builder` alone, the page is rendered **through the renderer's source**, and the renderer's
manifest is untouched. Tagged WCAG 2.2 A + AA **plus `best-practice`**, and §7.12 records the tag
choice as a decision. Four known-bad controls; see _the guards_ below.

**CL-9 — axe-core for the builder, hand-run beside `pnpm shots`, not a gate**
([#279](https://github.com/mandyMooreFan/linkpage/issues/279), [PR #303](https://github.com/mandyMooreFan/linkpage/pull/303),
`640c254`). **Built as instructed.** `pnpm a11y` → `scripts/a11y-sweep.mjs`, with a `//a11y` key in
the root `package.json` beside `//shots` saying it is never wired to CI. **Verified against
`.github/workflows/`: `ci.yml` runs `pnpm test` and `pnpm test:e2e` and nothing else; no workflow
names `a11y` or `shots`.** §7.12 says the tier is hand-run and that the two tiers are not
interchangeable. Five known-bad controls, and both of #265's traps reproduced.

**CL-10 — give `ui/FilePicker.tsx` a test of its own**
([#283](https://github.com/mandyMooreFan/linkpage/issues/283), [PR #293](https://github.com/mandyMooreFan/linkpage/pull/293),
`d5aade7`). **Built as instructed.** `src/ui/FilePicker.test.tsx` asserts both halves the item
named: **one accessible name for one action** (as a count of the exposed named controls, not as an
absence) and **no file input in the tab order**. Commitment 6 dropped its caveat. The instruction's
parenthesis — _"the bug was two accessible buttons per screen, not only the dead tab stop"_ — is
what the count is for, and it is the half a role-based assertion cannot see.

**CL-11 — upgrade commitment 2 from a stylesheet guard to a measurement**
([#284](https://github.com/mandyMooreFan/linkpage/issues/284), [PR #301](https://github.com/mandyMooreFan/linkpage/pull/301),
`6b0aabd`). **Built as instructed, on the charted placement rather than #272's.** #272 had it riding
CL-9's harness; the map settled that CL-11 to CL-13 gate CI and so cannot, and they landed as
`*.e2e.ts` on the End-to-end job. **That is a recorded decision of the map, not a deviation.**
`e2e/focus-ring.e2e.ts` plus the shared `e2e/walk.ts`. Re-run for this audit: **17 screens, 133 tab
stops at 390 and 144 at 1440, a ring on every one** — the figures §7.12 quotes, printed by the suite
itself.

**CL-12 — upgrade commitment 3 from an attribute guard to a measurement**
([#285](https://github.com/mandyMooreFan/linkpage/issues/285), [PR #309](https://github.com/mandyMooreFan/linkpage/pull/309),
`78be4a2`). **Built as instructed.** `e2e/reachability.e2e.ts` asserts **what Tab reaches**, never
`[inert]`. Re-run for this audit: **17 screens, 159 controls, 133 reachable at 390 and 144 at
1440**. The reachable numbers match #264 exactly; the denominator honestly does not (2 of **13**,
not 15) and the resolution says why. The old `[inert]` tests stay, which is the hedge moved rather
than tidied: _where the statement is_ is still worth holding, as the smaller half of the claim.

**CL-13 — upgrade commitment 5 from a class string to a measurement**
([#286](https://github.com/mandyMooreFan/linkpage/issues/286), [PR #306](https://github.com/mandyMooreFan/linkpage/pull/306),
`220c7fe`). **Built as instructed.** `e2e/tap-target.e2e.ts` measures rendered boxes against `tap`'s
44px and allows for a label forwarding the target — only where the browser's own `label.control`
says so, or where the one hand-written forwarding hook declares itself. It found a real miss the
string never looked at ([#305](https://github.com/mandyMooreFan/linkpage/issues/305)), and **the
excuse list is asserted exactly** at `tap-target.e2e.ts:184` — `toEqual` over the two excuses, so
neither can outlive the thing it excuses and closing #305 turns the file red until the line is
rewritten. That is the good case, and it is why #305 being out of scope costs the promise nothing.
**One wording defect in the line it rewrote** — see [#319](https://github.com/mandyMooreFan/linkpage/issues/319)
under _§7.12 as it now stands_ — which does not touch what was measured or asserted.

### Group E — recorded, and knowingly not acted on

**CL-14, CL-15 and CL-16 are out of scope** by #272 and #273, and **nobody quietly did any of them.**
Checked on `main`:

- **CL-14** — the preview iframe is still the one stop with no ring, `walk.ts` steps over it, and
  §7.12's commitment 2 names it as _"the one place a ring was not observed, and the one place the
  browser rather than the builder decides."_ Recorded in the promise, not claimed.
- **CL-15** — `open/ReplaceConfirm.tsx:87` is still `role="group"`, and `open.test.tsx:233` still
  asserts `[aria-modal]` is **absent**. It claims no modality, so it still is not lying.
- **CL-16** — both mechanisms are still there and unconverged: `List.tsx` uses `inert`,
  `DownloadSheet.tsx:243` uses `aria-modal` plus a real trap. Commitment 3's closing sentence names
  the difference rather than papering it: _"those are not the same guarantee."_

---

## Nothing was lost

**#272's findings were walked, not its instruction blocks.** Every finding in the provenance table
is answered by something on `main`:

| finding                                    | source                                                       | #272 says                  | on `main`                 |
| ------------------------------------------ | ------------------------------------------------------------ | -------------------------- | ------------------------- |
| **A-1** invalid colour announces nothing   | [#263](https://github.com/mandyMooreFan/linkpage/issues/263) | CL-1                       | built (`c9a2aa2`)         |
| **A-2** Escape does not close it           | #263                                                         | superseded by B-3, no item | **the correction below**  |
| **A-3** preview iframe has no ring         | #263                                                         | CL-14, recorded            | recorded in §7.12(2)      |
| **B-1** replace confirmation               | [#264](https://github.com/mandyMooreFan/linkpage/issues/264) | CL-15, recorded            | `role="group"`, unchanged |
| **B-2** preview iframe, second sighting    | #264                                                         | CL-14, recorded            | as A-3                    |
| **B-3** Escape from the toggle             | #264                                                         | CL-2                       | built (`10e80c3`)         |
| §7.12 draft                                | [#262](https://github.com/mandyMooreFan/linkpage/issues/262) | CL-3                       | §7.12 exists              |
| gap: `FilePicker` untested                 | #262                                                         | CL-10                      | `FilePicker.test.tsx`     |
| gap: `inert` checked as an attribute       | #262                                                         | CL-12                      | `reachability.e2e.ts`     |
| gap: tap floor checked as a class          | #262                                                         | CL-13                      | `tap-target.e2e.ts`       |
| tooling + coverage                         | [#265](https://github.com/mandyMooreFan/linkpage/issues/265) | CL-8, CL-9                 | both shipped              |
| two unnamed sites + the fallback           | [#266](https://github.com/mandyMooreFan/linkpage/issues/266) | CL-4, CL-5, CL-6, CL-7     | all four shipped          |
| focus rings observed painted (observation) | #263 walk                                                    | CL-11                      | `focus-ring.e2e.ts`       |
| two modality mechanisms (observation)      | #264                                                         | CL-16, recorded            | both still present        |

**Nought lost, against #180's three.** The mechanism that did it is worth naming, because it is
cheaper than it looks: #272 made every finding appear **exactly once, with an instruction or an
explicit note**, and #273 made every PR and resolution cite its CL id. Neither is a process; both
are one sentence in a template.

**And the harder half also held.** Three items shipped a diff wider than their instruction block —
CL-4 (six sections, not two), CL-6 (its own docblock's argument), CL-9 (`flow.mjs` extracted out of
the appearance ritual) — and one shipped **narrower** than its instruction (CL-7, whose per-word
path does not exist). All four are the _read the whole item_ rule working in the direction #180
needed it to.

## Nothing was widened

**The two tiers did not collapse.** §7.12 keeps them apart in three places: commitment-side, the
gated paragraph says `axe-core` _runs over it in CI_; the hand-run paragraph says `pnpm a11y` is
_"never wired to CI, deliberately, the way §7.4's appearance ritual is not"_; and the section closes
that pair with **"The two tiers are not interchangeable: the exported page's is a gate and this one
is a report for a person, and the six commitments above do not rest on it."** The code agrees —
`ci.yml` runs `pnpm test` and `pnpm test:e2e` only, and the root manifest's `//a11y` key says the
same thing a third time.

**The bound did not move.** _"What the browser exposes to assistive technology — names, roles, focus
order, what is and is not reachable. **Not what a screen reader announces.** No screen-reader pass
has been done, and none is claimed."_ No commitment reaches past it: 1 computes ratios, 2, 3 and 5
read what Chromium computes, 4 reads the stylesheet, and 6 says out loud that the roles _"were read
once, in Chromium."_ **A real screen-reader pass still has everything to prove**, which is what the
wording is for.

> **One loose sentence, recorded rather than ticketed.** §6.9 says a hidden _directions_ word
> _"is what a screen reader gets"_ (`SPEC.md:1382`, added by CL-4), mirroring the clock paragraph's
> pre-existing _"changes nothing for a screen reader"_ four lines down. Both are design prose about
> the exported page, not §7.12 commitments, and both are the section's own long-standing voice — but
> read strictly they say what a screen reader does, and what was measured is an accessibility tree.
> **It widens no promise** (§7.12's bound is explicit, repeated and unmoved) and it is one word in
> each place. Recorded here so it is not re-discovered as a finding.

## How the guards held up

**Six of the thirteen items are guards, and all six clear the map's first Note** — _a guard must
prove it found something before it can report nothing wrong._ Every one ships a **standing** control
in the file, not only a hand-run experiment, and every resolution says how the failure was
**induced** and observed:

| item      | standing control on `main`                                                                                                                   | induced and observed red                                                                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CL-8**  | four controls, each asserting the mutation _changed_ the page, that the clean page is clean on that rule, and that the broken one is not     | the **no-op trap** (marker repointed at `<a class="lp-nonexistent"`, failed at step 1) and the **dead-harness trap** (`setContent` a stand-in; all four failed at step 3)                                 |
| **CL-9**  | five controls, same three-part shape, run in a throwaway context; a control that does not fire exits **2** — _the report cannot be believed_ | both #265 traps reproduced; **and a third face found in the wild** — a contrast control that made axe return _incomplete_, refused by the run before anyone went looking. **Undecided is not found.**     |
| **CL-10** | four mutants of the real recipe mounted as standing tests, plus a fifth asserting the finder fails on a screen with no picker                | four hand-mutations of `FilePicker.tsx`, each red on the half that owns it and green on the other                                                                                                         |
| **CL-11** | mutant CSS overriding `:focus-visible` on one screen, **plus a check that the control is not vacuous**                                       | `outline` deleted from `theme.css` and the builder rebuilt: **120 of 133 stops go bare.** The 13 survivors are the fields, whose indicator is the other mechanism — two treatments detected independently |
| **CL-12** | a control breaking reachability **both ways** on the real list screen, **plus a non-vacuity check**                                          | `inert={covered}` deleted from `List.tsx`: the 390 test fails naming **all eleven leaks by their accessible names**, and 1440 still passes — the shape a lost `inert` really has                          |
| **CL-13** | an in-band mutant squashing controls **and their forwarding labels**, **plus a non-vacuity check**                                           | `tap` deleted from `LINE_CLASS` and the checkbox label: **17 stops red at 390**, the two mechanisms reporting independently                                                                               |

**Three of the six go a step past the Note and check the control itself is not vacuous** — CL-11,
CL-12 and CL-13 each assert that with the mutation neutered the control _fails_. That is the
control of the control, and it is the direct answer to #265's two no-op mutants. **No guard on this
map falls short.**

Two liveness details worth keeping:

- **`passes > 0` is still not a liveness check**, and both tiers now say so from measurement rather
  than from #265's number. **Three different figures exist for the same empty document** — #265's
  `violations=0 passes=4` under WCAG-only tags, CL-8's four rules firing, CL-9's `violations=4
passes=1` on the builder. They are not a drift: they are three different tag sets and documents,
  each **measured where it is quoted**, which is the rule working. #265's original figure is
  superseded wherever this map cites it.
- **CL-13's third proof is the neatest thing on the map**: the `inline` weight is 84×24 and is
  reported under the floor on **every** green pass, so the instrument demonstrates it can see a
  small target each time it says nothing else is wrong. The deliberate exception doubles as the
  standing liveness proof.

## §7.12 as it now stands, read end to end

Six tickets amended it — CL-3 wrote it, CL-8 and CL-9 added the tag and tier lines, CL-10, CL-11,
CL-12 and CL-13 each rewrote **their own** commitment. **It reads as one section, and no line claims
more than its check delivers.**

| #   | says                                                              | its check                                                            | honest?                                                                            |
| --- | ----------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | the tool's text clears 4.5:1                                      | `controls.test.ts` computes the ratio                                | yes — _measured_, unchanged                                                        |
| 2   | a ring on every tab stop                                          | a browser walk, **17 screens, 133/144 stops**, and it says so        | yes — and it names the preview iframe as the one exception                         |
| 3   | what is covered is out of reach, what is on the glass is in reach | a browser walk, **159 controls, 133/144 reachable**, both directions | yes — and it keeps the `[inert]` guard as the smaller half rather than deleting it |
| 4   | motion collapses under `reduce`                                   | the `@media` block must exist and name every duration                | yes — _guarded at the stylesheet_, and it says durations are **not** measured      |
| 5   | every control the keyboard reaches clears the tap floor           | rendered boxes at both widths                                        | **one word short** — see below                                                     |
| 6   | one control, one accessible name                                  | the rendered tree, counting named controls                           | yes — and it says what jsdom cannot see                                            |

**Commitment 5's two named exceptions match the code exactly.** §7.12 excuses _"the deliberate
inline weight and §7.2's progress bar header"_; `tap-target.e2e.ts:184` asserts the set of excuses
met on the run **equals** exactly those two, and line 173 requires every other short stop to be
empty. So a third short stop fails, and **fixing #305 turns the file red until the promise is
rewritten.** That is the good case the owner named: the promise does not quietly absorb a miss.

> **The one defect this audit found: commitment 5 says _"Two stops are under it"_ and there are
> thirteen.** The line is right about the two _shapes_ and right about the excuses, and the sentence
> after it — _"Both are named in the check, and a third fails it"_ — is clearly counting kinds. But
> it says **stops**, and the check's own report line says otherwise. Run on `main` for this audit,
> at both widths:
>
> ```
> §7.12(5) at 390: 17 screens, 133 tab stops, 14 of them pressed through a label or a line,
>   13 under the 44px floor — 1× the `inline` weight; 12× §7.2's bar header (#305)
> ```
>
> **Twelve, because §7.2's bar sits on twelve of the seventeen screens.** The direction of the error
> is worth being exact about: it **under-states the exception**, so the promise reads as better kept
> than it is — a reader takes _two stops_ for something negligible and the truth is one weight plus a
> header on most screens. It over-claims nothing about what was measured, the check hides nothing,
> and #305 is named in the promise either way. **So it does not hold the map open, and it is one
> word:** _two shapes of stop_, with the count beside it.
> [#319](https://github.com/mandyMooreFan/linkpage/issues/319).

**Two hedges survived that a tidier would have removed**, and they are the point: commitment 4 is
still _guarded at the stylesheet_ with _"durations are not measured by a standing test"_ attached,
and commitment 6 still says the count is over name-computing attributes because _"jsdom gives
`<input type="file">` no role."_ **The three upgrades moved three lines across the hedge; they did
not delete the idea of one.**

---

## The routed fog, ruled

The map's _Not yet specified_ section and #287's six routed comments hand this audit ten open
questions. Each is ruled here.

### 1. Five instances of `SPEC.md` asserting what the code stopped doing → **a successor effort** ([#312](https://github.com/mandyMooreFan/linkpage/issues/312))

The five: the **eight-words** claim (18 source sites, [#291](https://github.com/mandyMooreFan/linkpage/issues/291)),
**§5.3's e2e count** (8 sites, [#296](https://github.com/mandyMooreFan/linkpage/issues/296)),
**§7.10's speak-on-blur line** ([#298](https://github.com/mandyMooreFan/linkpage/issues/298)),
**CL-4's own §2.5 bullet** (caught by CL-7 before it landed), and **R-6's vanished ground** in
`docs/change-list-audit.md`.

**They are not five of a kind, and the difference is the finding.** Four are a claim restated in
many places, drifting when the code moved under it, and each was found by a person grepping for it
_while building the thing that made it false_. The fifth — CL-4's bullet — was caught **before
landing, by the ticket downstream of the one that wrote it**, because CL-7 had to build against the
sentence.

**So the evidence says what catches these is building against the sentence, not reading it**, and
that is not a standing check anyone can write: **no test can compare two paragraphs of prose for
agreement.** What _is_ constructible is narrower and worth a successor's time — every one of the four
was a **count or a number restated in N places** (eight words in 18 sites, one e2e in 8), and §5.3's
new table naming five files by name is already a stricter thing to keep true than a number was.
**Ruling: not a fourth correction, and not a prose-consistency test. Handed to a spec-maintenance
effort**, with the five instances and this evidence recorded so the successor argues from them.

### 2. R-6's vanished ground → **a ticket** ([#313](https://github.com/mandyMooreFan/linkpage/issues/313))

**This is the worst of the five and is different in kind.** `docs/change-list-audit.md`'s R-6 — _the
hours icon sits alone on its own line_ — is a **settled owner decision**, and its recorded ground is
_"§2.5 refuses the ninth string a caption would need."_ **§2.5 no longer refuses it.** The four
others were prose resting on a stale claim; this is a **decision** resting on one.

**#291 was right to leave the file alone** — its own header says the tables are the audit as it stood
and are left as written, and editing a dated snapshot to match today breaks the thing it is for.
**But the leave cannot stand on a ground that no longer exists.** The decision is probably still
right, and for a _stronger_ reason than it was made on: the ~100 B flex row now stands against
**215 B** of headroom rather than the 347 B the entry quotes, so the cost argument hardened as the
word argument disappeared. That is a sentence someone has to put to the owner, not one an audit can
write for them. **Ruling: a ticket, not blocking this map.**

### 3. §12 Provenance is five efforts behind → **a ticket** ([#314](https://github.com/mandyMooreFan/linkpage/issues/314))

Verified on `main`: §12 names #1, #76 and #116 and **no effort after them** — not the guided flow
(#136), the design audit (#171), the build map (#181), what-was-left-behind (#252), nor the promise
map (#261) that produced §7.12 itself. **So §7.12 lands unattributed in the one section whose stated
job is attributing every decision.** CL-3 was right to leave it: the gap is five efforts wide and
fixing one fifth of it inside an accessibility ticket would be worse than leaving it whole. **Ruling:
spec upkeep, its own ticket, not this map's.**

### 4. The job's cost is not a number → **answered; no ticket**

Four runs of the **unchanged** five-file suite spanned **1 m 35 s to 1 m 51 s**, so CL-11's _+14 s_,
CL-13's _+17 s_ and CL-12's _+15 s_ are within the noise of each other and of nothing changing.
**True, and it disturbs no decision this map made** — the bound is 10 minutes and the job is under
two. §5.3 already records the range rather than a figure and says explicitly to take a single run as
a **sample, not the cost**, which is the correct fix and it has landed. A per-file price to better
than a walk needs repeated measures nobody needs today; **the person who proposes a sixth browser
test is the person who should pay for it**, and §5.3 is the paragraph they will read. Nothing owed.

### 5. Two walkers now drive the builder → **a ticket** ([#315](https://github.com/mandyMooreFan/linkpage/issues/315))

`e2e/walk.ts` (TypeScript, gated) and `scripts/flow.mjs` (plain ESM, ungated) drive the same wizard
by the same `data-*` hooks, and nothing keeps them in step. **The charting question is answered
_no_, and the bill has already arrived twice**: CL-9 named the cost as a second copy of the wizard's
headings, and [#302](https://github.com/mandyMooreFan/linkpage/issues/302) then found a second copy
of its **scroll position** — a bug **found by the gated walker and filed against the ungated one**,
whose whole cause was that the two arrive at the same screen in different scroll states. **Two
demonstrated drifts is not fog any more.** Ruling: a ticket for a successor to decide whether to
converge them or to make one of them assert against the other. **It does not block this map** —
both walkers work, and #302 fixed the live instance in both.

### 6. B-3's half-wrong measurement, and A-2's supersession → **a note, not a correction**

B-3 said the bar handled Escape on the panel and not the toggle. On `origin/main` at `42b7e66` the
bar had **no Escape handling at all**, in `ProgressBar.tsx` or `Flow.tsx` — so the panel half never
worked either, and B-3's _"the panel closes"_ was an instrument artefact. **It did not change the
fix**, and the panel test went red beside the toggle test on unfixed code, which is the proof.

**The consequence for the record: #272 says A-2's broader wording — _"Escape does not close it"_ —
is too broad and is superseded by B-3. That is now known to be backwards.** A-2 was the accurate
statement and the correction narrowed it wrongly.

**Ruling: a note, not a correction back into #272.** Two reasons. The change list is a **closed,
dated document** and the same argument that protects `change-list-audit.md` from being rewritten
protects it — a successor effort points at it and needs it to say what was decided at the time.
And **the supersession cost nothing**: CL-2's fix answers A-2's broad wording in full, because
matching the menu covers both focus positions. So the record is corrected **here**, where a reader
who follows #272's provenance table will arrive. A comment on #272 carries the pointer.

**Worth recording plainly: this is the map's _a finding's stated code cause can be wrong_ Note firing
on this map three times**, not just on #181 — B-3 here, A-1's already-stale half in CL-1, and
#302's `force: true` comment. **All three were caught by the same habit: demanding a red before a
green.** That is the strongest single piece of evidence this map produced about method.

### 7. Whether "16 of 16 clean" states its own bound → **answered; no ticket**

The matrix is four shapes × both modes × both widths of **one** fixture — the busiest honest page,
with a business name. A page with no name reports `document-title` and `page-has-heading-one`.

**The framing this arrived under was already corrected by CL-5's builder, and the correction holds
on `main`:** `header.name` is a required `string`, `schema.ts:526` lists it as a `MissingField` that
**blocks export**, and §6.6 says it is required. The nameless page is reachable only by hand-editing
a `project.json` (§4.6), where `documentTitle` emits an empty `<title>` **deliberately**, on §6.7's
rule against inventing a credit. So it is a considered position, not a defect.

**Ruling: §7.12's line does not need to name the bound, because it never states the figure.** What
§7.12 says is _"`axe-core` runs over it in CI — every shape, both modes, both widths"_ — which is
exactly the three axes it varies, and it claims **checked, never proven**, with the 23-of-55 ceiling
attached. The clean figure lives in the resolutions and in the file's own docblock, which states the
fixture choice and argues it (_"a check that only ever sees `MINIMAL` has never seen an image, a
definition list or a link that is an icon plus a word"_). **A line that names its axes and claims no
cleanliness is not over-claiming.** A successor widening the matrix should say so in the line at that
point; today there is nothing false to fix.

### 8. The appearance ritual's six-for-six → **a successor effort** ([#316](https://github.com/mandyMooreFan/linkpage/issues/316))

`review-shots.mjs` answers every question correctly, so §7.9's refusal sentence — the one surface in
the flow where the tool says _this will not work_ — had never been in any shot set, and CL-1 had to
widen the ritual or its before/after would have come back byte-identical, **evidencing nothing.**
That is the **sixth** item-shaped patch for one standing failure. **Six-for-six is a pattern.** But
what the ritual must reach is a **§7.4 question, not an accessibility one**, and #302 showed the
failure has a second and more dangerous face — not a state the ritual never reaches, but one it
_believed_ it reached. **Ruling: a successor effort, with both faces named.** Not this map's.

### 9. Whether a role-based count is vacuous elsewhere → **a ticket** ([#317](https://github.com/mandyMooreFan/linkpage/issues/317))

`pickers.test.tsx`'s `expect(screen.queryAllByRole("button")).not.toContain(input)` — the line that
_reads_ as the second-button guard at all three call sites — **cannot fail**, because jsdom maps no
role to `<input type="file">`. The guard still holds by other means, so **nothing is broken**; the
line is decoration. **Ruling: a ticket anyway, and small.** A decorative assertion is the map's first
Note wearing its quietest clothes, and one sweep answers whether the same shape is doing the same
nothing elsewhere. CL-10 was right that no _fix_ was owed on its own branch; the sweep is a
different question and nobody owns it.

### 10. The builder's own screens → **a successor effort** ([#318](https://github.com/mandyMooreFan/linkpage/issues/318)), per the owner's ruling

`landmark-one-main` and `region` on **46 of 76 screens** (every wizard screen — the flow has no
`<main>`), `heading-order` on **2**. All three `best-practice` rather than WCAG A/AA, so **no promise
§7.12 makes is broken**, and all pre-existing defects a new instrument revealed. **The owner ruled
them out of scope and this audit does not grade the map down for them.** Also folded into the same
ticket: **`color-contrast` comes back _undecided_ on 11 of 76 screens** — axe's strongest rule class
saying it cannot tell, which CL-9 correctly recorded as _not a finding, and not clean either._
Ticketed only so a successor has a starting point; all four are reproducible any time with
`pnpm a11y`.

---

## Recorded, ticketed by nobody, and deliberately so

Small observations the build produced that are true, cost nothing today, and would be noise as
tickets. **They are written down here because a closed issue is exactly where #180 lost three.**

- **A fallback page that is also right-to-left** (Persian, Urdu, Pashto — none in the table) lays
  itself out `dir="rtl"` around two English words that declare `lang="en"` and say nothing about
  direction. Costs nothing while both words are visually hidden; it matters the moment one reaches
  the glass. (CL-7)
- **The tap walk sees 7 of 21 day modes.** A roving `radiogroup` is one tab stop per group, so
  fourteen of §7.10's radios are stepped over. They share a recipe with the seven measured, and the
  old class-string guard reached **none** of them — so this is strictly more coverage, and
  _"every control the keyboard reaches"_ is the honest wording. Measuring every pressable control
  rather than every tab stop is the obvious next widening, and it is a different instrument. (CL-13)
- **The reachability census is a second definition of "a control"**, beside `walk.ts`'s definition of
  "a stop". They agree today — **zero strangers across 34 screen-visits, asserted** — and the
  agreement is the check. The duplication is the fog. Likewise `covering()` names the two covering
  surfaces by hand; a third would have to be added by a person. (CL-12)
- **The 215 B margin now rests on a provisional word.** After CL-6, Hindi's `दिशा-निर्देश` is the
  longest of the 42 at 34 B and took that entry to 233 B, making Hindi second-tightest behind Thai's 215. **A correction from a Hindi speaker to a shorter phrase buys headroom back; one that lengthens
  Thai spends it.** The owner ruled the 126 drafts ship as drafts **knowing this**.
- **A byte tripwire is now selecting among translations.** The natural French and Catalan phrasings
  for _opening hours_ carry an apostrophe, which `escapeHtml` spends 5 B on; both use the typographic
  `’` instead, with a test keeping the straight quote out. **So "the correct word" and "the word that
  fits the budget" can differ.** Recorded as the sharpest form of the review-pass question the owner
  has already ruled on. (CL-5)
- **`force: true` on any `sr-only` control is a scroll-position lottery**, not a workaround with a
  cost. One such pattern exists today (`HoursQuestion`'s day modes) and both walkers now press the
  label. The next `sr-only` control someone drives is the one to watch. (#302)

## The byte account

**#272 wrote the account before any of it was built and it came out exact at every step**, which is
worth recording because it is rare:

|                                                        | cost                                                   | headroom  |
| ------------------------------------------------------ | ------------------------------------------------------ | --------- |
| `origin/main` @ `42b7e66`, `MAXIMAL` in Thai, 26,277 B | —                                                      | 347 B     |
| CL-5 hidden `<h2>` + `aria-labelledby`                 | +84 B                                                  | 263 B     |
| CL-6 hidden span in the address anchor                 | +48 B                                                  | **215 B** |
| CL-7 `lang="en"` marking                               | **+0 B** in the table (20 B on a page that falls back) | 215 B     |

**The tripwire did not move**: `size.test.ts` still reads `26 * 1024`, its note states 215 B rather
than the ~6 KB it once claimed, and it asserts across every language. CL-7's 20 B is pinned as an
**exact figure rather than a bound**, because the failure worth catching is the marking spreading —
put it on the day cells and it is twenty bytes a row, in the tightest language, against 215 B.

## Checks run for this audit

On `origin/main` @ `7eb62d6`, in a clean detached worktree: `pnpm test` — **995 renderer + 926
builder, all green**. `pnpm test:e2e` — **43 passed in 1.1 m**, the whole five-file browser tier
including all six known-bad controls, and printing the figures §7.12 quotes rather than leaving them
to be taken on trust:

```
§7.12(2) at 390:  17 screens, 133 tab stops, a focus ring painted on every one
§7.12(2) at 1440: 17 screens, 144 tab stops, a focus ring painted on every one
§7.12(3) at 390:  17 screens, 159 controls, 133 reachable — the review list 2 of 13
§7.12(3) at 1440: 17 screens, 159 controls, 144 reachable — the review list 13 of 13
§7.12(5) at 390:  … 13 under the 44px floor — 1× the `inline` weight; 12× §7.2's bar header
```

`pnpm lint`, `pnpm typecheck` and `pnpm format:check` green. **The one figure that did not match its
line is the last one** — see [#319](https://github.com/mandyMooreFan/linkpage/issues/319).

---

## For whoever picks up next

**The map closes.** What it leaves behind, in the order a successor would want it:

1. [#319](https://github.com/mandyMooreFan/linkpage/issues/319) — the one word in §7.12 that does not
   match its check. Cheapest thing on this list and the only one inside the promise.
2. [#305](https://github.com/mandyMooreFan/linkpage/issues/305) — §7.2's bar header, already named
   inside the promise and asserted exactly, so it cannot be forgotten. **Fixing it makes #319 moot**,
   which is the right dependency to notice before writing either.
3. [#318](https://github.com/mandyMooreFan/linkpage/issues/318) — the builder's own screens, the
   sweep's three findings and its 11 undecided contrasts.
4. **CL-16 with CL-15 as its companion** — the one open architectural question, which
   [#261](https://github.com/mandyMooreFan/linkpage/issues/261) called the first thing a successor
   should pick up, and which #272 deliberately left as such.
5. **A real screen-reader pass.** §7.12's bound is worded so it still has something to prove, and
   this audit confirms nothing crept past it.
6. [#312](https://github.com/mandyMooreFan/linkpage/issues/312) – [#317](https://github.com/mandyMooreFan/linkpage/issues/317),
   the routed fog above.
