# Builder app — design audit findings

**Asset for issue [#174](https://github.com/mandyMooreFan/linkpage/issues/174)** (audit the builder
app) of the **design-audit map [#171](https://github.com/mandyMooreFan/linkpage/issues/171)**.
Audited **2026-08-24** against `main` @ `ef15616`.

**55 findings**, plus a list of checks that passed and a statement of what the audit did not reach.
Both of the owner's seed complaints are **confirmed**, each with a structural cause rather than a
one-screen slip: [B-4](#b-4) and [B-14](#b-14) respectively.

## What was audited, and how

- **The standard:** the seven-section checklist from
  [#173](https://github.com/mandyMooreFan/linkpage/issues/173),
  `docs/audit/tailwind-audit-checklist.md` (branch `audit/173-tailwind-checklist`).
- **The evidence:** the baseline captures from
  [#172](https://github.com/mandyMooreFan/linkpage/issues/172) — 30 desktop screens at 1440×900 and
  32 mobile at 390×844 (branch `audit/172-baseline-screens`) — read alongside the builder source.
- **The scope:** `packages/builder` only. The generated link page is
  [#175](https://github.com/mandyMooreFan/linkpage/issues/175)'s and is not judged here.
- **Both widths** were covered, as the map's Notes require — but not evenly. Every file in
  `packages/builder` was read; **5 of the 62 captures** were viewed directly. See Group 8 for which,
  and "What is still owed" for the gap this leaves.

## The constraint every finding is written under

`SPEC.md` §7.4 fixes the builder's visual language as **paper**: a warm off-white ground, one ink,
hairline rules, and **structure from space rather than from containers** — nothing elevated, nothing
carded, type the only decoration. It also settles, with reasons, that there is **no dark mode**, and
that paper carries **one deliberate exception**: §7.2's progress bar keeps the standard grey-track /
coloured-fill vocabulary.

The map's Notes say **"tighten the current look, don't replace it."** So every checklist item that
presumes cards, shadows, boxed inputs, dark-mode token pairs or Tailwind's indigo is applied **by
principle only**, expressed in the builder's own tokens (`--color-ink`, `--color-ink-quiet`,
`--color-rule`, `--color-ground`, `--color-surface`, `--color-notice`, and the `tap` utility).

**No finding below proposes replacing paper.** Where a free Tailwind pattern is genuinely better
than what is there, it is called out as a pattern swap and argued; everywhere else the fix is a
tightening.

One further rule from the same section is used as a standard in its own right: **"Controls are React
components, not repeated utility strings and not `@apply`."** A duplicated control class string is
therefore a spec violation, not merely an untidiness.

## What this document is not

Per [#176](https://github.com/mandyMooreFan/linkpage/issues/176), the findings are **not agreed and
not prioritized** — that is the review session's work, and the map's "Not yet specified" explicitly
defers the severity scheme to it. Findings are grouped by area and numbered only so the review can
walk them one at a time. Nothing here has been changed in the product.

---

## How to read the numbering

Findings are grouped by theme and numbered `B-n` (builder). The grouping is for the review's
convenience only — it is **not** a severity ordering. Each finding gives the screen or component,
the checklist item it violates, the evidence as it exists on `ef15616`, and a suggested fix.

Where two independent passes (source and screens) found the same thing, it is recorded once.

---

# Group 1 — Systemic: the component layer has leaked

These are the findings that generate the others. `SPEC.md` §7.4 requires that **"controls are React
components, not repeated utility strings and not `@apply`"**, and that rule has quietly stopped
holding in several places. Fixing this group is what makes most of the rest one-line changes rather
than sweeps.

## B-1 Four pre-Tailwind BEM classes are still in the markup, and none of them is defined anywhere

- **Screens:** `flow/questions/LogoQuestion.tsx:97` (`question__hint`); `list/LinkButtons.tsx:152`
  and `list/StyleStep.tsx:217` (`question__escape`); `list/Advanced.tsx` (`field`, `field__label`);
  plus further `question__hint` uses in `list/Advanced.tsx`, `list/LinkButtons.tsx`,
  `list/StyleStep.tsx`.
- **Checklist:** §6 — "Stick to the theme tokens; arbitrary values need a written reason."
- **Evidence:** `theme.css` is the builder's only stylesheet (`main.tsx` imports it and nothing
  else) and defines none of these four classes; grepping the built
  `dist/assets/index-Cq2Qe5gs.css` for `question__hint` returns nothing. They are leftovers from the
  pre-Tailwind `flow.css` / `list.css` era that `theme.css`'s own header describes. **Elements
  carrying them render entirely unstyled** — Tailwind's preflight has already zeroed button padding
  and background, so `question__escape` renders as bare inherited text with no tap floor, no
  underline and no padding, and `question__hint` renders quiet asides at full-strength `text-ink`.
- **Why it leads the list:** this is not untidiness. Two of the product owner's escapes
  ("No buttons for now", "Just the one colour") are among the unstyled elements, which is seed
  finding (b) in its most literal form — those buttons are not merely mismatched, they have **no
  styling at all**.
- **Suggested fix:** one commit. Replace `question__hint` with `Field`'s own hint spec
  (`text-sm text-ink-quiet`), `question__escape` with `<Button weight="quiet">`, and `field` /
  `field__label` with `flex flex-col` / `block text-base font-medium`. Then the strings are gone and
  cannot be reached for again.

## B-2 The input recipe exists in 13 places, and the copy that owns the placeholder is dead code

- **Screens:** `ui/TextInput.tsx:17` vs `ui/TextField.tsx:15-16`, plus inline copies at
  `SectionQuestions.tsx:109,123,192,203`, `LinkQuestions.tsx:132`, `HoursQuestion.tsx:334`,
  `TimeBox.tsx:91`, `list/List.tsx:475`, `list/StyleStep.tsx:200`, `list/Advanced.tsx:83`,
  `list/LinkButtons.tsx:83,92`.
- **Checklist:** §6 — "Repeated elements are pixel-identical … unexplained divergence fails."
  `Button.tsx`'s own header states the same rule: "a repeated string is the same decision copied
  until one copy is wrong."
- **Evidence:** the two component copies are character-identical **except one token**.
  `TextInput.tsx` has `placeholder:text-ink-quiet/60`; `TextField.tsx`'s `INPUT_CLASS` does not.
  `TextInput` has **zero call sites** anywhere in `src` — the component that owns the placeholder
  rule is dead, and the string it was meant to centralise is pasted verbatim 13 times.
- **Consequence:** `placeholder:` appears exactly once in the whole builder, in dead code. So all
  seven live placeholders — `https://` (four fields), `#c2185b`, `What would the button say?`, and
  the palette-role overrides — render at the **user-agent default**, not an app token.
- **Why it matters beyond tidiness:** SPEC §7.4 deliberately moved the exact-colour field's example
  _out of the hint and into the placeholder_ so it would stop reading as instruction. That decision
  depends on the placeholder being visibly lighter than a typed value. Unstyled, `#c2185b` reads at
  full strength and looks like an answer the owner already gave.
- **Suggested fix:** route every input through one component and delete `INPUT_CLASS` and the
  inline copies. Give the surviving class `placeholder:text-ink-quiet` — **not** `/60`, see B-24.

## B-3 The three `Button` weights are hand-copied at ten call sites, several already drifted

- **Screens:** `LogoQuestion.tsx:64`, `LinkQuestions.tsx:146`, `SectionQuestions.tsx:218`,
  `preview/Preview.tsx:89-97`, `list/LinkButtons.tsx:144-150`, `list/List.tsx:211-218,590-597`,
  `list/LinkButtons.tsx:126-133`, `list/Advanced.tsx:49-56`, `open/ReplaceConfirm.tsx:104-110`.
- **Checklist:** §6 — "every button variant (§4) uses the same class string / token set."
- **Evidence:** `WEIGHT.secondary` is reproduced verbatim at three sites and near-verbatim at four
  more (`Preview.tsx` drops `self-start` and `text-base`; the tick-on rows use `py-3` not `py-2`;
  the menu item uses `px-3` and no border). `WEIGHT.quiet` is reproduced twice, and one copy —
  "Remove" at `LinkQuestions.tsx:112` and `list/LinkButtons.tsx:126` — **omits `tap`**, so it
  breaks §7.6's 44px tap floor while sitting in a row beside two 44px arrow buttons.
  `open/ReplaceConfirm.tsx:104` invents a **fourth weight** that matches neither `secondary` (it has
  no border) nor `quiet` (it has no underline).
- **Suggested fix:** route all ten through `<Button>`. Where a genuinely different shape is needed —
  a full-width two-line pressable row, a menu item, an inline mid-sentence link — add a **named**
  weight to `ButtonWeight` rather than an eleventh anonymous string.

---

# Group 2 — The field's spacing ladder (seed finding (a))

The product owner's first complaint was that helper text touches the field. It does, and the cause
is structural rather than a one-screen slip.

## B-4 `Field` renders label, hint and control with gaps of zero

- **Screen:** `flow/questions/Question.tsx:369-394`, the `Field` component — the anatomy behind
  _every_ text answer in the builder (Name, Tagline, Web address, Phone, Email, Address, directions
  URL, social platform and URL, hours note, exact colour, "Something else").
- **Checklist:** §1 — "A label and its control are one group: gap of `mt-2` (8px) between them,
  **never 0**"; §5 — helper text "never touching the control".
- **Evidence:** the wrapper is `<div className="flex flex-col" data-field>` with **no `gap`**.
  Inside it the label is `block text-base font-medium` with no bottom margin, the hint is
  `mt-1 block text-sm text-ink-quiet` with **nothing below it**, and then `{children}` — the
  control — carries **no margin at all**. So label→control is **0px**, and hint→control is **0px**.
  The only thing holding them apart is the input's own `py-2`. The message slot is `mt-1` — 4px,
  half the checklist's minimum.
- **This is seed finding (a).** It is present in every state, but it is most visible on re-edit,
  because that is when the field is full and the text above it is at full length.
- **Suggested fix:** `flex flex-col gap-2` on both `data-field` wrappers, and drop the individual
  `mt-1`s so the container owns the ladder. Do **not** put the margin on the input class — per B-2
  that string is pasted 13 times.

## B-5 `Field` puts the hint above the control — explanation before input

- **Screen:** `Question.tsx`, `Field` — `hintText` is emitted between the `<label>` and `{children}`
  in both return branches. Live callers: `SectionQuestions.tsx:120`
  ("Optional. From your maps app's share button."), `HoursQuestion.tsx:331` ("Bank holidays,
  seasonal changes."), `ColourQuestion.tsx:148` ("From a designer or a brand guide.").
- **Checklist:** §5 — "Order is always label → control → helper/error … the reading order of a
  field is name, input, explanation — **never explanation first**."
- **Suggested fix:** move `{hintText}` below `{children}` in both branches. `aria-describedby`
  already wires the association, so nothing about the accessibility contract changes.

## B-6 Field-to-field spacing is 16px, below the 24–32px band

- **Screen:** `Question.tsx:171` — `<div className="flex flex-col gap-4 font-sans">{children}</div>`.
- **Checklist:** §1 — "Field-to-field spacing is 24–32px … between-field gap ≈ 3–4× the within-field
  gap."
- **Evidence:** with B-4's 0px within-field gap the ratio is undefined; even after fixing B-4 it
  would be 16 ÷ 8 = 2×, short of the 3–4× the checklist asks for.
- **Suggested fix:** `gap-6` (24px). With B-4's `gap-2`, the ladder becomes a clean 8 / 24.

## B-7 The heading block is no further from the form than the fields are from each other

- **Screen:** `Question.tsx:137-171` — the `<form className="flex flex-col gap-4">` sequence
  (preamble → h1/h2 → hint → field stack).
- **Checklist:** §1 — "the spacing ladder within a page is monotonic — intra-group < inter-field <
  inter-section."
- **Evidence:** the form's `gap-4` gives 16px between every child. The preamble's `-mb-2` and the
  hint's `-mt-2` correctly tighten the title group to 8px — **these two negative margins are right**
  and should be left alone. But nothing widens the gap _out_ of that group: hint → first field is
  16px, identical to field → field, so the heading block and the form read as one undifferentiated
  stack.
- **Suggested fix:** `mt-4` on the children stack. The ladder becomes 8 (title group) < 24
  (field-to-field) < 32 (heading → form).

## B-8 `Back` gets the same 16px as an intra-form gap

- **Screen:** `Question.tsx:186-194`.
- **Checklist:** §1 — "Section-to-section spacing is larger still."
- **Evidence:** the shell's ladder runs 8 → 16 → 40 → 32 → **16**, the last step being
  `<Button weight="quiet" className="mt-4 text-ink-quiet">Back</Button>`. The most separate element
  on the screen gets the intra-form value.
- **Suggested fix:** `mt-8`.

## B-9 The Advanced panel's first sentence touches the button that reveals it

- **Screen:** `list/Advanced.tsx:58-62`.
- **Checklist:** §1/§5 — helper text ≥ 8px below its control, in every state. **This is seed
  finding (a) in a second location.**
- **Evidence:** the panel `<div id={panelId} hidden={!open} className="flex flex-col gap-4">` is a
  sibling of the disclosure button inside a container that is **not** a flex parent, and the panel
  has no `mt-*`. Preflight zeroes the paragraph margin, so the text opens at **0px** below the
  "Advanced colours" button.
- **Suggested fix:** `mt-4` on the panel div.

## B-10 Advanced's ten colour fields invert the ladder

- **Screen:** `list/Advanced.tsx:74-95`.
- **Checklist:** §1 — label→control never 0; between-field ≈ 3–4× within-field.
- **Evidence:** `<ul className="… gap-3 …">` gives 12px between fields, while each
  `<li className="field">` → `<label className="field__label">` → input has **0px** within (both
  classes undefined, per B-1, so the label is an unstyled inline element). Within-field 0px,
  between-field 12px — against a sibling `StyleStep` that uses `gap-6` for the same relationship.
- **Suggested fix:** `flex flex-col` on the `<li>`, `block text-base font-medium` on the label,
  `gap-6` on the `<ul>`.

## B-11 The same hint string produces 4px in one place and 12px in another

- **Screens:** `list/StyleStep.tsx:170-172`, `list/List.tsx:426-431` and `:467-471`, against
  `Question.tsx:355-360`.
- **Checklist:** §6 — pixel-identical siblings; §1 — monotonic ladder.
- **Evidence:** the canonical hint is `mt-1 block text-sm text-ink-quiet` inside a **gapless**
  container → 4px. The copies land in `gap-2` containers where `mt-1` is additive → **12px**; one
  lands in a gapless label → 4px. Same string, three offsets.
- **Suggested fix:** route all three through `Field`, or drop `mt-1` from the copies in gapped
  containers and let the container own it.

## B-12 Hours day rows: row padding equals internal gap

- **Screen:** `flow/questions/HoursQuestion.tsx:215-219`.
- **Checklist:** §1 — "row padding ≥ 4–5× the internal title→meta gap"; "prefer white space over
  borders for separation."
- **Evidence:** rows are `flex flex-col gap-2 border-b border-rule py-2` in a `<ul>` with no gap.
  Row padding 8px, internal gap 8px — a **1×** ratio against the checklist's ≥4×, with seven rows
  stacked behind hairlines.
- **Suggested fix:** `py-4`, keeping the hairline.

## B-13 `ColourQuestion`'s answer line is equidistant between the group it reports on and the field below

- **Screen:** `flow/questions/ColourQuestion.tsx:138`.
- **Checklist:** §1 — related items closer than unrelated ones.
- **Evidence:** `<p className="text-base">Your colour: …</p>` is a bare child of the `gap-4` stack,
  so it sits 16px below the swatch grid it describes and 16px above the "Or type your exact colour"
  field. Nothing says which it belongs to.
- **Suggested fix:** `-mt-2`, matching the codebase's own grouping idiom, pulling it to 8px under
  the grid.

---

# Group 3 — Button hierarchy (seed finding (b))

The product owner's second complaint was that secondary buttons neither stand out nor match the
button design. Three separate causes were found, and the first is the largest.

## B-14 The escape uses `quiet`, when a paper-native `secondary` already exists

- **Screen:** every declinable step — `flow/questions/Question.tsx:180` renders
  `<Button weight="quiet" data-escape>` for "We don't need one", "We don't have one",
  "No buttons for now", "Leave this one out", "Not on my page", "We don't have a place to visit",
  "We're not on social", "We don't have set hours".
- **Checklist:** §4 — "Secondary = clear but not prominent: outline/soft treatment … same
  radius/padding/typography as primary. **Catches seed finding (b)** … A button that is neither
  solid-primary nor this secondary recipe fails."
- **Evidence:** `quiet` is
  `tap self-start bg-transparent py-2 font-sans text-base underline underline-offset-4` — no fill,
  no border, no radius, no horizontal padding. A `secondary` weight **already exists** and is
  paper-native: `tap self-start rounded-sm border border-rule bg-transparent px-4 py-2 font-sans
text-base`. The escape is using the wrong one, so a real choice reads as a footnote link.
- **Suggested fix:** `weight="secondary"` on the escape. That gives it the hairline outline and the
  shared radius and padding, differing from primary only in fill — exactly the checklist's secondary
  recipe, adding nothing paper does not already have. **The fix is already in the codebase.**
- **Note:** `Back` is also `quiet`, and that is correct — Back genuinely is tertiary. Making the
  escape secondary also stops the escape and Back reading as the same kind of thing, which today
  they do.

## B-15 Two of the escapes have no styling at all

- **Screens:** `list/LinkButtons.tsx:152` ("No buttons for now"), `list/StyleStep.tsx:217`
  ("Just the one colour").
- **Checklist:** §4 — the secondary recipe; §6 — "a one-off secondary button style is exactly this
  kind of divergence."
- **Evidence:** `<button type="button" className="question__escape">` — an undefined class (B-1).
  These are not mismatched buttons; after preflight they are bare inherited text.
- **Suggested fix:** `<Button weight="secondary">`, together with B-14 so all eight escapes agree.

## B-16 The three weights do not share one padding or type spec

- **Screen:** `ui/Button.tsx:16-23`.
- **Checklist:** §4 — "siblings in one action row share height, radius, and weight"; §6 — "all
  buttons on a screen share one padding/radius/type spec per size variant."
- **Evidence:**

  | weight      | horizontal padding | type size         | alignment    | disabled state |
  | ----------- | ------------------ | ----------------- | ------------ | -------------- |
  | `primary`   | `px-5`             | _(none declared)_ | `shrink-0`   | yes            |
  | `secondary` | `px-4`             | `text-base`       | `self-start` | **no**         |
  | `quiet`     | _(none)_           | `text-base`       | `self-start` | **no**         |

  `primary` inherits its size from the surrounding `font-serif` chain rather than declaring one, and
  `px-5` vs `px-4` puts a primary and a secondary 2px apart per edge for no stated reason. Radius is
  consistently `rounded-sm`, which is fine.

- **Suggested fix:** `px-4` and an explicit `text-base` on `primary`, so the three differ only in
  fill, border and underline.

## B-17 Two disabled buttons have no disabled affordance

- **Screens:** `LogoQuestion.tsx:62-69` ("Choose a file", `disabled={busy}`),
  `LinkQuestions.tsx:144-151` ("Add", `disabled={typed.trim() === ""}`).
- **Checklist:** §4 — "Hover and focus are defined for every button."
- **Evidence:** `primary` is the only weight carrying a disabled treatment. `secondary` has none, so
  the "Add" button — disabled on every screen load, since the box starts empty — looks exactly like
  an enabled one.
- **Suggested fix:** add `disabled:cursor-default disabled:border-rule disabled:text-ink-quiet` to
  `WEIGHT.secondary`, and route the two call sites through the component (B-3).

## B-18 The Download sheet has two solid primaries

- **Screen:** `download/DownloadSheet.tsx:291-308`, `SaveButton`, rendered at lines 258 and 277.
- **Checklist:** §6 — "One primary action per view"; §7 (download screen) — "'Open page' as the one
  primary, 'Download' secondary … **exactly one primary**".
- **Evidence:** both instances render `weight="primary"`, so "Download index.html" and
  "Download …linkpage.json" are two `bg-ink` fills about 200px apart on the same sheet.
- **Suggested fix:** give `SaveButton` a `weight` prop — primary for section one (the page, which is
  what they pressed the button for), secondary for section two. The prose in section two already
  does the persuading.

## B-19 The list screen shows two solid primaries whenever a row is open

- **Screen:** `list/List.tsx:156-163` (the pinned Download) plus the `weight="primary"` Save inside
  every question a row mounts (`Question.tsx:174`); `LangRow` at `List.tsx:488` is a third instance.
- **Checklist:** §6 — "exactly one solid brand-colored button visible at a time."
- **Suggested fix:** step the bar's Download down while a row is open —
  `weight={open === null ? "primary" : "secondary"}`. In that moment the important action is Save;
  Download is not going anywhere.

## B-20 `ReplaceConfirm` makes the escape primary and the real action secondary

- **Screen:** `open/ReplaceConfirm.tsx:89-111`.
- **Checklist:** §4 — destructive/confirmation weighting.
- **Evidence:** `<Button weight="primary" ref={escape}>Download my work first</Button>` sits above
  `<Button weight="secondary" onClick={onOpen}>Open the file</Button>`. The fork's subject carries
  the lower weight; the optional backup carries the fill.
- **Suggested fix:** a judgement call for the review, not an obvious defect — the component's
  docblock argues for the arrangement on the grounds that focus lands on the safe branch. Worth
  noting that focus order and visual weight are independent, so the safe-focus argument does not by
  itself require the fill. Either confirm it as a deliberate exception or swap the two weights,
  keeping `ref={escape}` where it is.

## B-21 Four spellings of the same link-style role

- **Screens:** `ui/Button.tsx:22` (`quiet`), `Question.tsx:191` (`Back`, with a `text-ink-quiet`
  override), `LinkQuestions.tsx:110-117` (`Remove`), `PresetQuestion.tsx:65-68` (`Open it.`).
- **Checklist:** §4 tertiary recipe; §6 pixel-identical.
- **Evidence:** the escape gets full ink; Back gets `text-ink-quiet` via a one-site override, with
  no rule saying which role gets which. `Remove` and `Open it.` both **omit `tap`**, breaking the
  44px floor, and `Open it.` uses `p-0` where the token version has `py-2`.
- **Suggested fix:** decide once whether the tertiary colour is ink or ink-quiet and bake it into
  `WEIGHT.quiet`. If an inline mid-sentence link genuinely must not carry the tap floor (`Open it.`
  sits inside a sentence), add a named `inline` weight rather than a fifth hand-written string.

## B-22 Reorder arrows restate the tap constant as a magic number

- **Screen:** `list/LinkButtons.tsx:108-124`, the ↑ / ↓ buttons.
- **Checklist:** §6 — theme tokens; "Icons stay near their drawn size."
- **Evidence:** `tap min-w-11 rounded-sm border border-rule bg-transparent text-lg
disabled:text-rule`. `min-w-11` is 2.75rem — the exact number `@utility tap` exists to hold once.
  `text-lg` is otherwise used only for text inputs. `disabled:text-rule` is discussed at B-25.
- **Suggested fix:** add `@utility tap-square { min-height: 2.75rem; min-width: 2.75rem; }` to
  `theme.css` and use it, dropping `min-w-11` and stepping the glyph to `text-base`.

---

# Group 4 — Colour and contrast

Measured against the actual token values in `theme.css`. These are the findings with objective
pass/fail thresholds rather than judgement.

## B-23 The input underline fails WCAG non-text contrast — 1.31:1 against a required 3:1

- **Screen:** every text control in the builder.
- **Checklist:** §3 — "interactive component boundaries and focus indicators ≥ 3:1 against adjacent
  colors ([WCAG 2.2 SC 1.4.11])."
- **Evidence:** the control's boundary is `border-b border-rule`. Measured: `--color-rule` `#e2d9cb`
  on `--color-ground` `#faf7f2` = **1.31:1**; on `--color-surface` `#ffffff` = **1.40:1**. In paper
  the underline _is_ the control — there is no fill, no box and no other boundary — so this is the
  whole perceivable extent of the field, and it sits at under half the required ratio.
- **Suggested fix:** split the token by job rather than darkening every hairline. Keep
  `--color-rule` for **decorative** separators (row dividers are not interactive-component
  boundaries, so SC 1.4.11 does not bind them) and add a control-boundary token used only by the
  input underline. Blending the existing rule hue toward ink, **`#948d83`** is the first step that
  reaches 3:1 on ground (**3.07:1**) while keeping the warm cast. One new token, one class; the line
  stays a hairline, it just becomes visible.

## B-24 The placeholder colour, once revived, would fail at 2.49:1

- **Screen:** `ui/TextInput.tsx:17` — `placeholder:text-ink-quiet/60`.
- **Checklist:** §3 — "≥ 4.5:1 body"; §5 — "Placeholder is lighter than entered text" (lighter, not
  unreadable).
- **Evidence:** `--color-ink-quiet` at 60% composited over `--color-ground` gives `#a49e95` =
  **2.49:1**. It affects nothing today because the component is dead (B-2) — but the moment B-2 is
  fixed it becomes the placeholder for all seven live placeholder strings. At 80% it is 3.64:1,
  still short of 4.5:1. At full strength it is **5.60:1** and passes.
- **Why full strength is right here:** SPEC §7.4 uses the placeholder to carry the exact-colour
  field's _example_, so it conveys information and must meet the body threshold. It stays visibly
  lighter than the entered value regardless, because the value is `text-ink` at 16.02:1.
- **Suggested fix:** `placeholder:text-ink-quiet`, no opacity modifier.

## B-25 A disabled control is rendered in the hairline colour, so it vanishes rather than reads as unavailable

- **Screen:** `list/LinkButtons.tsx:110` and `:119`, the ↑ / ↓ arrows — `disabled:text-rule`.
- **Checklist:** §2 — "At most 2–3 text colors for content"; §3 — shades carry hierarchy on one hue.
- **Evidence:** `--color-rule` on `--color-ground` is **1.31:1**. Two other disabled controls in the
  builder use a different vocabulary entirely (`primary`'s `disabled:bg-rule disabled:text-ink-quiet`
  and the menu item's `disabled:text-ink-quiet`).
- **Suggested fix:** `disabled:text-ink-quiet disabled:border-rule`. One disabled vocabulary, and
  `--color-rule` goes back to being only a rule.

## B-26 The progress bar's track is nearly invisible on the ground — 1.16:1

- **Screen:** `flow/ProgressBar.tsx`, the bar on every wizard step.
- **Checklist:** §3 — non-text contrast for parts needed to understand state.
- **Evidence:** `--color-progress-track` `#e5e7eb` on `--color-ground` `#faf7f2` = **1.16:1**. The
  fill against the track is fine (`#4f46e5` on `#e5e7eb` = 5.08:1), but the _track_ is what says how
  much is left. SPEC §7.4 buys the paper exception specifically to get the standard "rounded grey
  track with a coloured fill" vocabulary — and at 1.16:1 the track half of it is not delivered.
- **Suggested fix:** darken `--color-progress-track` until the unfilled remainder reads as a track.
  Note it is a **cool** grey on a warm ground, which is part of why it disappears; a warm-tinted
  track would also sit better under paper.

## B-27 The scrim is the one colour in the tool that is not a Paper token

- **Screen:** `download/DownloadSheet.tsx:198` — `bg-black/40`.
- **Checklist:** §6 — "a value outside … `--color-*` is off-system by definition"; §3 — "every
  color used is a ramp member, not an ad-hoc hex."
- **Evidence:** `theme.css` declares six colours and pure black is not among them; `--color-ink` is
  a warm `#1f1b16`. A neutral-black veil over a warm off-white ground reads cold against every other
  surface in the tool.
- **Suggested fix:** `bg-ink/40`.

## B-28 Note, not a violation: the disabled primary sits at 4.28:1

- **Screen:** `ui/Button.tsx`, `disabled:bg-rule disabled:text-ink-quiet`.
- **Evidence:** `--color-ink-quiet` on `--color-rule` = **4.28:1**, just under the 4.5:1 body
  threshold. WCAG 2.2 SC 1.4.3 **exempts inactive controls**, so this passes as written.
- **Why it is recorded:** Continue spends real time disabled in this flow — it is disabled until the
  answer is present — so it is read more than a typical disabled control. Worth a deliberate
  decision rather than an accident.

---

# Group 5 — Type

## B-29 Text inputs are a size step larger than their own labels

- **Screens:** every input — `list/List.tsx:475`, `list/StyleStep.tsx:200`, `list/Advanced.tsx:83`,
  `list/LinkButtons.tsx:83,92`, and the flow's inputs via `TextField`.
- **Checklist:** §2 — "Hierarchy is made with weight and color before size"; §5 — control spec at
  `text-base`.
- **Evidence:** every input is `text-lg` (18px) while its label is `text-base font-medium` and its
  hint is `text-sm`. `text-lg` is used for exactly two things in the builder: these inputs and the
  reorder arrow glyphs. Nothing else is 18px, so the entered value outranks the row title, the
  section legends and the summary lines.
- **Suggested fix:** `text-base`. The value is already distinguished from the label by weight and by
  the underline — §2's preferred instruments.

## B-30 Two sizes for the same "one quiet line" role

- **Screen:** `Question.tsx:156` (preamble), `:166` (question hint), `:357` (field hint).
- **Checklist:** §2 — "no orphan sizes"; §6 — pixel-identical.
- **Evidence:** the component's own doc comment calls the preamble "one quiet line above the title"
  and the hint "One quiet line under the title" — the same role, in the same file, at two sizes:
  preamble `text-sm`, question hint `text-base`, field hint `text-sm`. At `text-base` the question
  hint is also the same size as a `Field` label, separated from it only by weight.
- **Suggested fix:** `text-sm` on the question hint. `text-ink-quiet` already carries the
  de-emphasis, which is what §2 asks for.

## B-31 `ProgressBar` shows the same labels at two sizes

- **Screen:** `flow/ProgressBar.tsx:115-120` (header) vs `:148-151` (topic list).
- **Checklist:** §2 — weight and colour before size; §6 — pixel-identical.
- **Evidence:** the header row is `text-sm`; the list row for the same unit carries **no size
  class**, so it inherits `text-base`. Open the drawer and "Opening hours" appears twice, 14px above
  and 16px below. The `done` marker inside those rows _is_ `text-sm`, so one row mixes 16px and
  14px while its header twin is uniformly 14px.
- **Suggested fix:** `text-sm` on the `<ul>` at `:132`. The `font-medium` / `text-ink-quiet` pair
  already carries current-versus-done.

## B-32 Two `<h3>` specs and three serif-heading leading/tracking specs

- **Screens:** `download/DownloadSheet.tsx:209,225,267`, `list/Advanced.tsx:97`,
  `list/List.tsx:183,202`.
- **Checklist:** §2 — "one size step per hierarchy level is enough"; §6 — pixel-identical.
- **Evidence:** `text-2xl leading-tight` (no tracking) / `text-3xl leading-tight tracking-tight`
  (both) / `text-xl` (neither) / `m-0 font-serif text-base` — the last being a heading at **body
  size with no weight bump**, sitting above rows of the same size, distinguished from surrounding
  prose only by the serif face.
- **Suggested fix:** one recipe per level — `text-3xl leading-tight tracking-tight` (page title),
  `text-2xl leading-tight tracking-tight` (row and sheet title), `text-xl leading-tight` (section) —
  and promote Advanced's `<h3>` to the section recipe.

## B-33 `--color-notice` text has three type specs for one semantic role

- **Screens:** `list/List.tsx:379`, `list/LinkButtons.tsx:75`, `download/DownloadSheet.tsx:247`.
- **Checklist:** §2 — "At most two font weights in the UI"; §6 — pixel-identical.
- **Evidence:** `text-sm text-notice` / `text-sm font-semibold text-notice` / `text-notice`
  (inheriting `text-base`). The `font-semibold` is the **only** occurrence in the audited scope;
  with `font-medium`, the default 400 and `<strong>`'s 700, the sheet and list carry four weights
  against the checklist's two. `DownloadSheet.tsx:104-105` states the intent outright: the marks are
  "derived from the same place §7.4's row marks come from, so the two surfaces cannot disagree about
  the same string" — they agree about the string and disagree about its type.
- **Suggested fix:** `text-sm text-notice` at all three. The colour is the emphasis.

---

# Group 6 — Consistency: radius, focus, selection, tokens

## B-34 Three different treatments for the same "this option is selected" role

- **Screens:** `ColourQuestion.tsx:115` (swatches), `PresetQuestion.tsx:128` (preset rows),
  `HoursQuestion.tsx:235` (Open/Closed/Not shown), plus `list/List.tsx:213` (tick-ons),
  `list/List.tsx:442` (languages), `list/StyleStep.tsx:179` (swatches).
- **Checklist:** §6 — "One radius per component class"; "Repeated elements are pixel-identical."
- **Evidence:** the same `aria-pressed` / `has-checked` semantics in five visual languages: an
  offset outline; a border recolour **plus** an inset box-shadow; a solid ink fill; weight only
  (`aria-pressed:font-medium`); and a ring.
- **Suggested fix:** one pressed vocabulary. Since `outline` is already owned by the focus ring
  (B-35), use a border/ring treatment for selection everywhere — `aria-pressed:border-ink` where a
  border already exists, an inset ring on the borderless swatches — and drop the bracket shadow.

## B-35 The selection outline collides with the global focus ring

- **Screens:** `ColourQuestion.tsx:113-126`, `list/StyleStep.tsx:179`.
- **Checklist:** §6 — "One focus style app-wide … no mix of `ring-*`, browser-default outlines, and
  custom glows"; §5 — "one focus treatment across every control and button."
- **Evidence:** the swatch's selected state is
  `aria-pressed:outline-2 aria-pressed:outline-offset-2 aria-pressed:outline-ink`. `theme.css`'s
  base layer declares `:focus-visible { outline: 2px solid var(--color-notice); outline-offset:
2px; }`. **Same geometry, same element, different colour.** The selection utility sits in
  `@layer utilities` and the focus rule in `@layer base`, so on a swatch that is both pressed and
  keyboard-focused the ink outline wins and the focus ring is silently lost — on the one control
  where a keyboard user most needs to know where they are.
- **Suggested fix:** differentiate by geometry, not colour: give selection an **inset** ring
  (`-outline-offset-4`, or a `ring-*` inside the swatch) and leave the +2px offset outline
  exclusively to `:focus-visible`.

## B-36 Two focus treatments fire on every input, and only one is keyboard-only

- **Screens:** every input, against `theme.css`'s base layer.
- **Checklist:** §6 — one focus style app-wide.
- **Evidence:** the input class ends `focus:border-ink`. Tailwind's `focus:` maps to `:focus`, so it
  fires on mouse press too, while the global ring is `:focus-visible`. A keyboard user therefore
  gets **both** — an ink underline recolour _and_ a notice-red offset outline; a mouse user gets
  only the first. Separately, `TextInput`'s doc comment says the underline "thickens on focus", but
  `focus:border-ink` changes colour only — comment and code disagree.
- **Suggested fix:** `focus-visible:border-ink`, so the recolour and the ring are one keyboard-only
  event; and correct the comment to say "recolours".

## B-37 `shadow-lg` on the menu panel is the only elevation in the builder

- **Screen:** `list/List.tsx:585`.
- **Checklist:** §6 — "One shadow ladder, used sparingly"; §1 — prefer space or a background shift
  over borders. `theme.css` states the language directly: "Nothing is elevated and nothing is
  carded; type is the only decoration."
- **Evidence:** grepping `shadow-` across every `.tsx` in the builder returns this line and two
  `aria-pressed:shadow-[inset_…]` faux-borders — nothing else. This is not an argument for adding
  shadows elsewhere; it is the one place that contradicts the stated language.
- **Suggested fix:** drop `shadow-lg`. The panel already separates itself three ways —
  `bg-surface` against `bg-ground` (§1's sanctioned background shift), `border border-rule`, and
  `z-10`. If it still does not read as lifted, §1's remedy is more space, not a shadow.

## B-38 Two overlay surfaces, two radii

- **Screens:** `list/List.tsx:585` (menu panel, `rounded-sm`) vs `download/DownloadSheet.tsx:201`
  (sheet, `rounded-t-2xl … wide:rounded-2xl`).
- **Checklist:** §6 — "One radius per component class … mixed siblings fail."
- **Evidence:** every other radius in the builder is `rounded-sm` or `rounded-full` (circles).
  `rounded-2xl` (1rem) appears exactly once and is 8× the radius of everything it sits above.
- **Suggested fix:** pick one step for the two overlay surfaces and share it.

## B-39 Bracket values with no written reason

- **Screens:** `PresetQuestion.tsx:128` (`aria-pressed:shadow-[inset_0_0_0_1px_var(--color-ink)]`),
  `DownloadSheet.tsx:201` (`max-h-[92dvh]`, `max-w-[34rem]`, `wide:max-h-[88dvh]`),
  `Preview.tsx:100` (`wide:h-[min(80dvh,46rem)]`).
- **Checklist:** §6 — "arbitrary values need a written reason … each hit needs a justification
  comment or a token."
- **Evidence:** none of these carries a comment. `max-w-[34rem]` (544px) is a hand-written near-twin
  of the list column's `max-w-lg` (512px) — precisely the drift `theme.css` warns about when it made
  `--breakpoint-wide` a single token: "which `flow.css` and `preview.css` used to agree on by
  hand … there is only one of it."
- **Not findings:** `[view-transition-name:flow-content]` and `transition-[width]` are plumbing with
  no utility equivalent, and `w-[min(100%,27.5rem)]` at `Preview.tsx:113` **does** have its
  arithmetic written out at `Preview.tsx:16-19`. The twelve `BRAND_SWATCHES` hexes are content — the
  owner's choosable palette — not design tokens, and carry an extensive justification.
- **Suggested fix:** `max-w-lg` on the sheet so it shares the list's measure; promote `27.5rem` to a
  `--container-page` token; replace the inset shadow per B-34; and either comment the `dvh` numbers
  or collapse the 92/88 pair to one value.

## B-40 Alignment: `self-start` fights `items-center`, and the drawer does not line up with its header

- **Screens:** `HoursQuestion.tsx:300-322`; `flow/ProgressBar.tsx:110` vs `:141`.
- **Checklist:** §6 — "Alignment is consistent per context."
- **Evidence:** (a) a `flex flex-wrap items-center` row contains `<Button>`s whose `secondary`
  weight carries `self-start`, overriding the parent — so "Copy these times" sits on a different
  baseline from the "to weekdays" / "to every day" buttons it introduces. (b) the progress bar
  button is flush at `p-0` while every topic row below it is `px-1`, so the drop-down list is inset
  4px from the header it drops from.
- **Suggested fix:** (a) drop `self-start` from `WEIGHT.secondary` and add it at the column call
  sites that need it; (b) `px-0` on the topic rows, keeping `py-2`.

---

# Group 7 — Screen-level layout

## B-41 An opened row is not separated from the collapsed rows around it

- **Screen:** `list/List.tsx:385`, `RowItem`'s body.
- **Checklist:** §1 — "Related items sit closer together than unrelated items"; "the spacing ladder
  within a page is monotonic."
- **Evidence:** the body is `border-t border-rule pb-4 font-sans`. For an open _Opening hours_ row:
  the question's own fields are 16px apart, its Save button is 24px from the controls above it, and
  the boundary from that Save button to the next, entirely unrelated row is `pb-4` (16px) + hairline
  - `py-4` (16px) = **32px**. So the inter-section gap is only 1.3× the largest intra-section gap,
    and the boundary marker is the _identical_ hairline that separates two one-line collapsed rows. A
    600px form and a 78px summary row are delimited the same way.
- **Measurement that passed, for contrast:** the collapsed rows themselves are healthy — `py-4`
  with a `gap-0.5` label/summary pair is an 8:1 ratio, comfortably above the checklist's ≥4× floor.
  The problem is only what happens when a row opens.
- **Suggested fix:** make the open row's own boundary the widest gap on the screen, using space
  rather than a container: `border-t border-rule pt-6 pb-12`. 48px matches the checklist's section
  step and is unambiguously larger than the form's internal 16/24.

## B-42 The open row's heading touches the hairline above it, and only 3 of 10 editors compensate

- **Screen:** `list/List.tsx:385`, against the ten editors `editor(id)` mounts.
- **Checklist:** §1 — label/heading grouping; §6 — pixel-identical field anatomy.
- **Evidence:** the body div has `border-t` and **no `pt-*`**. Three editors add their own top
  margin (`StyleStep.tsx:72`, `LinkButtons.tsx:64`, `List.tsx:425` — all `mt-4`); the seven flow
  questions render with no top offset, so their `<h2 className="text-2xl …">` sits flush against
  the 1px rule.
- **Suggested fix:** put the offset on the container once (the `pt-6` of B-41) and delete the three
  `mt-4`s. One owner of the row's top gap instead of four.

## B-43 Four different specs for "a hairline-separated row"

- **Screens:** `list/List.tsx:187,357` (review rows, `py-4`); `list/List.tsx:442` (languages,
  `py-2`); `list/LinkButtons.tsx:73` (link rows, `py-3`); `list/Advanced.tsx:100-103` (contrast
  readings, `py-1`).
- **Checklist:** §1 — "List rows breathe symmetrically … row padding ≥ 4–5× the internal title→meta
  gap"; §6 — "every list row uses the same class string."
- **Evidence:** the language rows have the **identical** two-line label+meta structure as the review
  rows, at half the padding (8px/2px = 4:1, at the floor). The contrast readings are `py-1` — 4px of
  padding with a hairline on every row, dense enough that the rules dominate, the inverse of the
  stacked-list anchor.
- **Suggested fix:** one row spec. Give the language rows `py-4` and move their `border-b` to
  `divide-y divide-rule` on the `<ul>` to match the review rows; give the readings `py-2` and drop
  the border entirely — a two-column `justify-between` row separated by 8px of ground needs no rule
  (§1: "prefer white space over borders"; §6: "borders are the last resort").

## B-44 The list header's ladder is flat

- **Screen:** `list/List.tsx:148` (bar), `:178` (arrival line), `:183` (`<h1>`), `:187` (`<ul>`),
  `:202` ("Anything else?").
- **Checklist:** §1 — related items closer than unrelated; monotonic ladder.
- **Evidence:** the Menu/Download bar → arrival line → `<h1>` gaps are both `mt-4`, so the status
  line is equally grouped with the button bar and with the title it belongs to; and when
  `arrived === false` the `<h1>` sits 16px below a row of buttons — the biggest conceptual break on
  the screen getting the smallest gap. Downstream, `h1 → ul` is `mt-6` while the identical
  relationship at `:202` is `mb-3`.
- **Suggested fix:** 32px on the bar-to-content break, 8px between the arrival line and the `<h1>`
  so they read as one block, and `mb-6` at `:202`. The ladder becomes 32 / 8 / 24 / 24.

## B-45 `Hosting` stacks two margins and introduces an off-ladder step

- **Screen:** `download/Hosting.tsx:43-44`.
- **Checklist:** §1 — every margin a multiple of the base unit; section spacing.
- **Evidence:** `<div className="mt-5">` immediately containing `<p className="mt-2">` = 28px, in a
  sheet whose every other step is `mt-2`, `mt-3`, `mt-4` or `mt-8`. `mt-5` appears nowhere else.
- **Suggested fix:** `mt-8` on the wrapper, dropping the inner `mt-2`. §8's guidance is a
  sub-section and deserves the sheet's own section step.

## B-46 `Hosting`'s two lists diverge, and one loses its lead-in emphasis

- **Screen:** `download/Hosting.tsx:50` vs `:73`.
- **Checklist:** §6 — pixel-identical siblings.
- **Evidence:** `gap-3 … [&_strong]:text-ink` versus `gap-2` with the `[&_strong]` rule dropped — so
  the second list's bold lead-ins ("**Free does not always mean allowed.**") render in
  `--color-ink-quiet`, the same colour as the body they are meant to lead.
- **Suggested fix:** `gap-3` and `[&_strong]:text-ink` on both.

## B-47 Two hand-rolled copies of `Panel tone="notice"`

- **Screens:** `LogoQuestion.tsx:91-95`, `PresetQuestion.tsx:114-118`.
- **Checklist:** §6 — pixel-identical.
- **Evidence:** `Panel.tsx:23` renders `border-s-2 ${edge} ps-3 font-sans`. Both call sites
  reproduce it inline with an extra ad-hoc `mt-2` that stacks on the parent `gap-4`, producing a
  one-off 24px offset found nowhere else in the ladder. `Panel` is never imported in either file.
- **Suggested fix:** `<Panel tone="notice">` at both sites — it already takes `className` — and let
  the parent gap do the spacing.

## B-48 On a phone the list opens with its primary action covered

- **Screen:** `preview/Preview.tsx:58` and `:75`, reached from `list/List.tsx:226`.
- **Checklist:** §4 — "the highest-contrast fill on the page belongs to the single primary action";
  a screen whose primary is not on it fails the per-screen check.
- **Evidence:** `const open = choice ?? (onList || roomy);` — on the list the drawer defaults open
  at _every_ width, and when open it is `fixed inset-0 z-20 h-dvh bg-surface`. Below the `wide:`
  breakpoint that covers the whole viewport, so the first screen after a run has exactly one control
  (the outline "Edit your page" button) and **zero primaries** — while the arrival line it is
  covering says "Your page is ready. Look it over, then download it." The `bg-ink` Download the
  owner has just been told to press is underneath.
- **Note:** the page-first landing is deliberate — #172's own README records it as intended
  behaviour — so this is not an argument against it. The finding is that the instruction and the
  button it names are on opposite sides of an opaque surface.
- **Suggested fix:** keep the page-first landing and carry Download into the drawer header at narrow
  widths — a primary slot in the header row at `Preview.tsx:78`, shown when `onList && open`.

---

# Group 8 — Confirmed in the rendered screens

**Coverage, stated plainly:** the source findings above were read against the whole of
`packages/builder`. The _visual_ pass did _not_ cover all 62 baseline captures. A screen-by-screen
sweep was attempted and did not deliver a usable report, so what follows is a focused pass over
**five** screens chosen because they carry the largest claims:
`desktop/08-flow-tagline-revisited-via-back`, `desktop/25-list-reedit-tagline`,
`desktop/28-download-sheet-full`, `mobile/01-flow-preset-empty`, `mobile/23-list-arrived`.
Findings below are only for screens actually viewed. **A full visual sweep of the remaining
captures is still owed** — see "What is still owed" at the end.

## B-49 Seed finding (a), confirmed on screen

- **Screens viewed:** `desktop/08-flow-tagline-revisited-via-back`,
  `desktop/25-list-reedit-tagline`.
- **What is visible:** in the re-edit case the "Tagline" label sits directly on top of its input
  with no measurable gap — the only separation is the input's own padding, exactly as B-4 predicts
  from the code. In `25-list-reedit-tagline` the opened question also runs straight into the
  collapsed row above it: the row above's value, a hairline, and then the `<h2>` about 20px later,
  against ~27px of padding above each collapsed row's own label. The opened editor is more cramped
  against its surroundings than the closed rows are against each other, which is B-41 and B-42 seen
  from the front.
- **Verdict: CONFIRMED**, and the cause is structural rather than one screen's spacing.

## B-50 Seed finding (b), confirmed on screen

- **Screens viewed:** `desktop/08-flow-tagline-revisited-via-back`,
  `desktop/25-list-reedit-tagline`.
- **What is visible:** "We don't need one" renders as a small underlined sentence, left-aligned,
  with no border, no fill and no padding — directly beneath a full-width solid dark "Continue" (or
  "Save"). Next to it, "Back" is the _same_ underlined treatment, one step greyer. So the screen
  offers three actions in two visual weights, and the two that are underlined are a real branch of
  the flow and a navigation control respectively.
- **Verdict: CONFIRMED.** The complaint that it "doesn't stand out and doesn't match the button
  design" is accurate on both counts, and B-14's fix (use the existing `secondary` weight) resolves
  both — it gains the hairline outline and it stops looking like Back.

## B-51 Two solid dark buttons visible at once on the list, confirmed

- **Screen viewed:** `desktop/25-list-reedit-tagline`.
- **What is visible:** the pinned "Download" (solid dark, top right) and the open row's "Save"
  (solid dark, mid-column) are both on screen simultaneously. This is B-19 seen directly.
- **Nuance worth carrying into the review:** the _download sheet's_ two primaries (B-18) are **not**
  both visible at once — in `desktop/28-download-sheet-full` the second one is below the sheet's
  scroll. B-18 is real in the code and still worth fixing, but it is a weaker instance than B-19,
  which is a genuine side-by-side collision.

## B-52 The mobile landing shows the instruction and hides the button it names

- **Screen viewed:** `mobile/23-list-arrived`.
- **What is visible:** the screen carries the line "Only you can see this. To share it, download the
  file and put it online." and, below it, the generated page filling the viewport. The only control
  is an outline "Edit your page". There is no Download button anywhere on the screen.
- **Verdict: CONFIRMED** — this is B-48 from the front, and seeing it makes the case sharper than
  the code does: the sentence and the button it refers to are on opposite sides of an opaque
  surface.

## B-53 "Edit your page" wraps to three lines on a phone

- **Screen viewed:** `mobile/23-list-arrived`.
- **Checklist:** §4 — one padding/type spec per size variant; §1 — action rows.
- **What is visible:** the button renders as three stacked words — "Edit / your / page" — inside a
  tall narrow box, because it is squeezed against the right edge by the status line beside it. It is
  the first control the owner meets after finishing a run, and it is the least resolved-looking
  thing on the screen.
- **Suggested fix:** let the header row wrap so the button keeps its natural width, or shorten the
  label at narrow widths. This is a layout fix, not a new button style.

## B-54 The only right-aligned element on the mobile flow is "See the page"

- **Screen viewed:** `mobile/01-flow-preset-empty`.
- **Checklist:** §6 — "Alignment is consistent per context … no screen mixes centered headings with
  left-aligned bodies without intent."
- **What is visible:** the preamble, heading, hint, all six preset rows and the "Already have a
  project file?" line are left-aligned on one margin. "See the page" alone sits flush right at the
  bottom, on no shared edge with anything above it.
- **Suggested fix:** either align it to the same left margin as the column, or make its right
  alignment deliberate and consistent across every flow screen at narrow widths. Worth putting to
  the owner rather than deciding in the audit — it may be an intended thumb-reach affordance.

---

# Group 9 — Pattern swaps

Most of the checklist's §7 patterns are card-, box- or indigo-based and are already better served by
paper's own vocabulary, so they have been applied **by principle** throughout the findings above
rather than swapped in. Exactly one is worth swapping.

## B-55 `https://` should be a leading add-on, not a placeholder

- **Screens:** every link-URL field — `SectionQuestions.tsx:128,208`, `LinkQuestions.tsx:262`,
  `list/LinkButtons.tsx:97`.
- **Checklist:** §5 — "Inline affordances follow the free input-group pattern: leading add-on text
  inside the field's single wrapper — useful for the wizard's URL fields (`https://` prefix)"; §7
  lists the free input group as a wizard pattern.
- **Evidence:** today `https://` is a **placeholder**, so it disappears the moment the owner types.
  Someone pasting `example.com/menu` gets no signal that the scheme is expected — and per B-2 the
  placeholder is not currently distinguishable from a typed value anyway.
- **Why this one survives paper:** the free input group's _structure_ is a quiet prefix sitting
  inside the control's own boundary. Paper's boundary is the underline rather than a rounded box, so
  what is borrowed is the prefix, not the box: a `text-ink-quiet` `https://` on the same ruled line,
  before the typed text, permanently. Nothing gains a card or a fill.
- **Seam:** `Field` already accepts `htmlFor` precisely so a row holding more than one control can
  name which one the label belongs to. No caller passes it today, so this would be its first use.
- **Suggested fix:** render the URL fields as a composite on one underline — quiet `https://`
  prefix, then the input.

---

# Checks that passed

Recorded so the review does not re-raise them, and so a later effort can see what was actually
verified rather than assumed.

- **Contrast of the text roles.** `--color-ink` on ground **16.02:1**; `--color-ink-quiet` on ground
  **5.60:1**; `--color-notice` on ground **7.95:1**; the primary button (ground on ink) **16.02:1**;
  the focus ring (notice on ground) **7.95:1**. All pass comfortably. The contrast problems in
  Group 4 are confined to **non-text** boundaries and one dead placeholder.
- **Font weights.** Exactly two in the flow — default 400 and `font-medium` (500) — with nothing
  below 400, as §2 requires. (The list and sheet reach four; that is B-33.)
- **The spacing scale itself.** Every gap, padding and margin audited is a `--spacing` multiple. The
  only half-step is `gap-0.5` (2px) at `PresetQuestion.tsx:128`; it is legal, but it is the only one
  in the builder and it is tighter than the checklist's `mt-1` anchor for a title→meta pair.
- **The collapsed review rows.** `py-4` with a `gap-0.5` label/summary pair is 8:1, well above §1's
  ≥4× floor. These are the healthiest component on the screen.
- **One primary per wizard step.** `Question.tsx:174` is the only `weight="primary"` in the flow and
  renders at most once per step. The two-primary problems are on the list and the download sheet
  (B-18, B-19).
- **The tap floor.** `tap` is present on every control except the four in B-3 and B-21.
- **Radius.** Consistently `rounded-sm`, with `rounded-full` used only for actual circles. The one
  exception is the download sheet (B-38).
- **The negative margins are correct.** `-mb-2` on the preamble and `-mt-2` on the question hint
  tighten the title block to 8px. They are good grouping, not cramping, and should be left alone —
  the problem is the absence of a compensating widening at the group's _edge_ (B-7).
- **The brand swatch hexes are content, not tokens.** The twelve values in `ColourQuestion.tsx` are
  the owner's choosable palette and carry a written justification. Not a token violation.
- **No dark mode, no cards, no elevation.** Verified as deliberate and argued in SPEC §7.4; the only
  contradiction found in the code is the single `shadow-lg` at B-37.

---

# What is still owed

Recorded so the review knows the audit's reach, and so nothing is quietly assumed to have been
checked.

- **A full visual sweep of the baseline captures.** 5 of the 62 screens were viewed directly (listed
  at the head of Group 8). The other 57 — most of the wizard's per-step empty/filled pairs, the
  logo, colour, links, hours, contact, address and social steps, the menu, the replace confirmation,
  and nearly all of the mobile set — were audited **through their source** but not looked at. The
  source pass is the stronger instrument for the systemic findings (Groups 1–7) and the weaker one
  for cramping, wrapping and per-screen balance, which is exactly what B-53 and B-54 turned out to
  be. A second visual pass is likely to add findings of that kind and is unlikely to overturn the
  ones recorded here.
- **The live site was not driven.** The audit used `main` @ `ef15616` and #172's captures of the
  deployed build at that commit. Nothing was clicked in a browser, so hover states, focus rings in
  motion, the view transitions of §7.11 and any real reduced-motion behaviour are unverified.
- **`scripts/review-shots.mjs` is the tool for the after-half.** SPEC §7.4 records that the
  builder's look is checked by people on purpose, with a before-and-after set captured for any
  change that moves it. Whatever the review agrees should be built, that script is how it gets
  shown — it produces every screen at both of §7.6's sizes.
