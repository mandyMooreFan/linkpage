# Generated link page — design audit findings

**Asset for issue [#175](https://github.com/mandyMooreFan/linkpage/issues/175)** (audit the
generated link page) of the **design-audit map
[#171](https://github.com/mandyMooreFan/linkpage/issues/171)**. Audited **2026-08-24** against
`main` @ `ef15616`.

**9 findings**, plus a substantial list of checks that passed. One of them —
[R-1](#r-1-every-colour-role-is-derived-against-ground-and-one-shape-renders-them-against-surface) —
is a genuine WCAG failure in shipped combinations, measured and reproduced.

## What was audited, and how

- **The standard:** the checklist from
  [#173](https://github.com/mandyMooreFan/linkpage/issues/173), applied **by principle only** — its
  own Constraint 2 says the renderer is judged on spacing ratios, type hierarchy and contrast,
  never on class names.
- **The scope:** `packages/renderer` — `stylesheet.ts`, `chrome.ts`, `palette.ts`, and the parts of
  `render.ts` that decide what sits on what. The builder app is
  [#174](https://github.com/mandyMooreFan/linkpage/issues/174)'s and
  [#178](https://github.com/mandyMooreFan/linkpage/issues/178)'s, in a separate document.
- **The evidence:** the four exported pages and their captures from
  [#172](https://github.com/mandyMooreFan/linkpage/issues/172) (`centred-classic-light`,
  `colourblock-modern-dark`, `floatingcard-friendly-light`, `ruledleft-classic-dark`), viewed at
  both widths, read alongside the source — plus contrast measured from the real emitted
  `:root` blocks, and one derivation probe run against the actual `derivePalette` across eight
  brand colours.

## The constraint every finding is written under

**No finding proposes a Tailwind class or block.** The renderer is dependency-free and ships one
hand-written stylesheet, so every fix below is expressible in its own token stylesheet or in the
palette derivation that feeds it.

Two further rules from `SPEC.md` are treated as fixed, not as things to audit:

- **§3.2 — shapes and pairings carry structure, never a palette.** No finding asks a shape to pick
  a colour.
- **§6.2 — the column is `min(100%, 25rem)` and is load-bearing.** §5.2 makes the preview _be_ the
  export and §7.6 drops the desktop preview on the strength of it. No finding asks to widen it.

**The advanced tier is deliberately outside the readability guarantee** and is therefore not
audited. §3.3 says so outright — "a typed hex is inside this guarantee; the advanced tier is
outside it" — and §3.4 makes opening the panel "the acknowledgement that the readability guarantee
no longer applies", reporting contrast with "no refusal, no auto-correction, no export gate". So
`applyOverrides` laying hand-set colours over the derived palette **without a contrast check is
correct**, and is recorded under checks that passed rather than as a finding.

## What this document is not

Per [#176](https://github.com/mandyMooreFan/linkpage/issues/176) the findings are **not agreed and
not prioritized**. Numbering is `R-n` and exists so the review can walk them one at a time.
Nothing was changed in the product.

---

## R-1 Every colour role is derived against `ground`, and one shape renders them against `surface`

**This is the one finding here with a measured pass/fail threshold behind it, and it fails.**

- **Where:** `palette.ts` `derivePalette`, against `chrome.ts`'s `floatingCard` shape.
- **Checklist:** §3 — "Text meets WCAG contrast: ≥ 4.5:1 body … interactive component boundaries
  and focus indicators ≥ 3:1 against **adjacent colors**"
  ([SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)). The operative
  word is _adjacent_.
- **The mechanism.** Every target in `derivePalette` is computed against `ground`:
  `INK_ON_GROUND = 7`, `MUTED_ON_GROUND = 4.5`, `FILL_ON_GROUND = 3`, and the step-back rule asks
  `contrastRatio(brand, ground) >= FILL_ON_GROUND`. But `floatingCard` sets
  `.lp-page{background:var(--lp-surface)}`, and `.lp-links`, `.lp-link` and `.lp-social` are all
  inside `.lp-page`. So in that shape the link buttons and the social links are **not adjacent to
  `ground` at all** — they sit on `surface`.
- **Why dark mode is where it bites.** `groundFor` puts light mode at `ground` L=0.982 and
  `surface` L=1.0, so surface is _lighter_ than ground and a dark fill gains contrast — harmless.
  Dark mode is the reverse: `ground` L=0.178, `surface` L=0.232, so surface moves **toward** the
  brand-derived colours and contrast drops.
- **Confirmed on a real exported page.** The failing combination is not in #172's capture set, so
  it was **generated**: rendering the `POPULATED_DARK` fixture with `shape: "floatingCard"` emits a
  page whose stylesheet carries
  `.lp-page{…;background:var(--lp-surface)}` and whose `:root` holds `--lp-fill:#c2185b` and
  `--lp-accent-text:#3d8c40`. Measured against that page's own `--lp-surface:#231b1c`:
  **the buttons are 2.87:1 (need 3.0)** and **the social links are 4.04:1 (need 4.5)**. Against
  `--lp-ground` the same two roles measure 3.22 and 4.53 — i.e. they pass, which is exactly the
  problem: the derivation is checking the backdrop the page does not use.
- **The measurement.** From the emitted `:root` of the captured dark pages (brand `#c2185b`):

  | pair                              | vs `ground` | vs `surface` | target          |
  | --------------------------------- | ----------- | ------------ | --------------- |
  | `--lp-fill` (button)              | 3.22        | **2.87**     | 3.0 (SC 1.4.11) |
  | `--lp-accent-text` (social links) | 4.51        | **4.02**     | 4.5 (SC 1.4.3)  |

- **And it is not one unlucky brand.** Running the real `derivePalette` in dark mode across eight
  representative brand colours (`#c2185b`, `#1976d2`, `#2e7d32`, `#f9a825`, `#6a1b9a`, `#00897b`,
  `#e64a19`, `#455a64`): **`buttonFill` falls under 3:1 against surface for 3 of 8**, and
  **`accentInk` falls under 4.5:1 against surface for 7 of 8**. The near-universal accent failure
  has a clean cause — `toContrast` stops the instant it clears the target, so `accentInk` lands at
  4.50–4.54 against ground for almost every brand and therefore at ~4.02 against surface. **There
  is no headroom by construction.**
- **The tests mirror the gap exactly.** `palette.test.ts` asserts `buttonFill` and `accentInk`
  against `p.ground` only; its single surface assertion is `ink` on surface. Nothing ever checks the
  roles the one shape that changes the backdrop actually renders against.
- **Suggested fix, in the renderer's own terms.** Derive the brand-carried roles against the
  **worst-case backdrop of `{ground, surface}`** rather than against `ground` alone. In dark mode
  that is `surface`; in light mode it is `ground`, so the light-mode output is unchanged. Because
  the two grounds are close, the cost is a barely perceptible strengthening of the fill in the
  three shapes that did not need it, in exchange for the guarantee actually holding in all four.
  Extend `palette.test.ts` to assert every role against both backdrops so the gap cannot reopen.
- **Note on scope:** the panels are fine. `.lp-panel` is `surface` in the base, but its contents are
  `--lp-ink` and `--lp-ink-muted`, which clear their targets against surface comfortably (14.84 and
  8.89 in dark). The contact rows are safe for the same reason — `.lp-row` overrides `a`'s colour to
  `--lp-ink`. **The exposure is exactly the two brand-derived roles in `floatingCard`.**

## R-2 Nothing on the page has a hover or active state

- **Where:** the whole stylesheet. `:hover`, `:active` and `transition` appear **nowhere** in
  `packages/renderer/src`.
- **Checklist:** §4 — "**Hover and focus are defined for every button**: fill shifts one shade on
  hover … _Principle:_ hover = one ramp step."
- **What this means in practice:** the generated page's entire purpose is pressing link buttons. On
  any pointer device, a visitor gets no feedback that a button is interactive until they click it.
  Focus _is_ handled — `a:focus-visible{outline:2px solid var(--lp-accent-text);outline-offset:3px}`
  is a single, correct, page-wide rule — so this is a gap rather than a philosophy: keyboard users
  are served and mouse users are not.
- **`SPEC.md` does not argue against it.** "hover" appears nowhere in the spec, so unlike no-dark-mode
  or the decorative hairline, this is not a decision that was taken and defended — it is simply
  absent.
- **Suggested fix:** one rule, but it needs a role to move to. The palette has no "one step along"
  colour, and §3.2 forbids the stylesheet inventing one, so the principled version is a derived
  `--lp-fill-hover` produced by the machinery `palette.ts` already has (`withLightness` /
  `toContrast`), one step toward the ink. Whatever it becomes must keep §3.3 true: the hover fill
  still needs 3:1 against its backdrop and its ink still needs 4.5:1 on it — and per R-1, "its
  backdrop" means the worst case of ground and surface.

## R-3 The hairline's justification does not hold in `floatingCard`, the one shape where it does the work

- **Where:** `palette.ts`'s `rule` derivation against `chrome.ts`'s `floatingCard`.
- **Checklist:** §1 — "Prefer white space (or a background change / shadow) over borders for
  separation … where hairlines are right (lists), use the lightest ramp step."
- **The reasoning as written:** `rule` is deliberately not held to 3:1, and the comment gives a good
  reason — "what makes a section identifiable is `surface` differing from `ground`, not the line
  around it; a border at 3:1 would read as a heavy box on a screen this design keeps calm."
- **Why it does not hold in one shape:** `floatingCard` sets `.lp-panel{border:0;border-top:1px
solid var(--lp-rule);background:none}`. Inside the card every panel is the _same_ surface, so
  there is no `surface`-versus-`ground` shift left to identify a section — **the hairline is the
  only divider**, at 1.44:1 in light and 1.13:1 in dark. The token's rationale is shape-dependent;
  the token is global.
- **Not a WCAG failure:** a divider between static blocks is not an interactive component boundary,
  so SC 1.4.11 does not bind it. This is a hierarchy point, not a compliance one.
- **Suggested fix:** the checklist's own preferred remedy is space rather than a stronger line.
  `floatingCard` already sets `.lp-page{gap:1.25rem}`, which is _less_ than the base's `1.75rem` —
  so the shape both removes the background shift and tightens the spacing that would have replaced
  it. Restoring the wider gap inside the card, and letting the hairline stay decorative, resolves
  it without making any line heavier.

## R-4 The spacing ladder has orphan steps, and spacing is the one system not tokenised

- **Where:** `stylesheet.ts` `BASE` and the `SHAPE_RULES` deltas.
- **Checklist:** §1 — "_Principle (renderer):_ every spacing value in the token stylesheet is a
  multiple of one base unit; no one-off pixel values."
- **The evidence.** Most values sit on a clean `0.25rem` (4px) grid: `0.25`, `0.5`, `0.75`, `1`,
  `1.25`, `1.75`, `2.5`, `3`, `3.5`, `9`. Off that grid: **`0.625rem` (10px)** — used four times,
  for the link stack gap, the rows gap, the row's internal gap and the hours mark's bottom margin —
  plus **`1.125rem`** (panel inline padding), **`0.375rem`** (named-social gap), **`0.875rem`**
  (`ruledLeft` inset) and **`0.125rem`** (`ruledLeft` panel padding). Reading the sheet as a 2px
  grid makes them legal but makes the ladder meaningless.
- **The structural half.** `:root` emits the ten colour roles, `--lp-gutter`, `--lp-radius` and five
  type tokens — but **no spacing tokens at all**. Every other spacing value is a literal in `BASE`.
  So the page has a real, deliberate colour contract and type contract, and its spacing ladder
  exists only implicitly, spread across roughly twenty literals with nothing holding them together.
  That is why the four orphans could appear without anything noticing.
- **Suggested fix:** name the ladder. A small `--lp-space-*` set (or even one `--lp-unit` the rules
  multiply) turns the ladder into the same kind of contract the colours already have, and makes a
  future 10px an obvious outlier rather than an invisible one. Then pull `0.625` → `0.5` or `0.75`,
  `1.125` → `1` or `1.25`, and `0.375` → `0.25` or `0.5`.
- **Recorded as passing, since it is the more important half:** the ladder is **monotonic** where it
  counts — 28px between page sections, 12px inside the header, 10px inside a list. Intra-group is
  reliably smaller than inter-section, which is what §1 actually asks for.

## R-5 The hours mark is promoted by size and demoted by colour at the same time

- **Where:** `.lp-hours-mark{display:block;margin:0 0 0.625rem;color:var(--lp-ink-muted);font-size:1.125rem}`.
- **Checklist:** §2 — "**Hierarchy is made with weight and color before size** … secondary text is
  distinguished by colour or lighter weight, not by dropping size steps."
- **What is visible:** the element is the hours panel's identifying mark. It is set **larger** than
  body text (18px against 16px) and **quieter** than body text (`--lp-ink-muted`). The two signals
  point in opposite directions, so it reads neither as a heading nor as a caption.
- **Suggested fix:** pick one instrument. Either keep it at body size and let the muted colour make
  it a quiet mark, or give it `--lp-ink` and let the size make it a heading. Not both at once.

## R-6 The hours icon sits alone on its own line, unlike every other icon on the page

- **Where:** `.lp-hours-mark` as `render.ts` emits it — a `<span>` containing only the clock SVG,
  `display:block`.
- **Checklist:** §6 — "Icons stay near their drawn size — if a big slot needs a small icon, enclose
  it in a colored shape"; §1 — related items closer than unrelated.
- **What is visible in all four captures:** every other icon on the page is inline beside the text
  it belongs to — the phone glyph beside the number, the envelope beside the address, the pin beside
  the street. The clock is the exception: it occupies a full line of its own above "Mon", with
  nothing beside it and 10px under it, so it reads as an orphaned glyph rather than as the section's
  mark.
- **Suggested fix:** either set it inline with the first row the way the contact rows do, or give it
  the enclosing treatment §6 describes so a lone small glyph in a wide slot looks deliberate.

## R-7 The type sizes are literals too, and two of the five are used exactly once

- **Where:** `stylesheet.ts` — `1rem` (body), `1.625rem` (`.lp-name`), `1.375rem`
  (`.lp-social-link`), `1.125rem` (`.lp-hours-mark`), `0.875rem` (`.lp-note`, `.lp-social-name`).
- **Checklist:** §2 — "_Principle (renderer):_ the token stylesheet's sizes form a single ratio-ish
  ladder … no orphan sizes."
- **Assessment, honestly:** the ladder is _broadly_ fine — 14 / 16 / 18 / 22 / 26 gives ratios of
  about 1.14, 1.13, 1.22, 1.18, which is a coherent progression, and five sizes is modest for a
  whole page. Two points stand: `1.375rem` and `1.125rem` are each used once (the social glyph and
  the hours mark), and — as with R-4 — **the sizes are literals while the pairing's `--lp-font`,
  `--lp-head-weight`, `--lp-head-track` and `--lp-line` are tokens**. The type _system_ is
  tokenised; the type _scale_ is not.
- **Suggested fix:** if R-4's ladder is tokenised, take the sizes with it. That also gives the
  one-off `1.125rem` somewhere principled to land, which resolves half of R-5.

## R-8 Nothing mediates the backdrop behind the owner's logo when a shape or mode changes it

- **Where:** `.lp-logo{display:block;width:auto;max-width:100%;height:auto;max-height:9rem}` — no
  background, no padding, no radius — against `colourBlock`'s filled header and dark mode's ground.
- **Checklist:** §3 — "No grey text on colored backgrounds … on a colored surface, de-emphasize
  with a background-derived colour" (the same principle, applied to imagery); §6 — icons and marks
  should sit on a deliberate plate rather than an accidental one.
- **What is visible:** the walk's logo is artwork on a near-white plate, which is how most small
  businesses are handed their logo. In `centred-classic-light` it disappears into the near-white
  ground and looks intentional. In **`colourblock-modern-dark`** the same file becomes a hard white
  slab sitting on the brand fill, and in **`ruledleft-classic-dark`** a bright rectangle on a nearly
  black page. Three shapes and two modes move the backdrop behind an image the renderer cannot
  change, and the stylesheet says nothing about it.
- **Suggested fix, and its limit:** the renderer cannot fix someone's logo, but it can stop the
  accident from reading as one. Giving `.lp-logo` `border-radius:var(--lp-radius)` alone makes the
  slab agree with the rest of the page's geometry; going further, a deliberate `--lp-surface` plate
  with padding under the logo in the shapes and modes where the backdrop is dark turns an accident
  into a decision. Worth putting to the owner — it is a taste call about how much the tool should
  intervene in the owner's own artwork.

## R-9 In light mode the focus ring is the same colour as the button it surrounds

- **Where:** `a:focus-visible{outline:2px solid var(--lp-accent-text);outline-offset:3px}` against
  the light-mode palette.
- **Checklist:** §6 — "One focus style app-wide"; §3 — focus indicators ≥ 3:1 against adjacent
  colours.
- **The mechanism:** when the brand carries the fill (the common case — 5 of 8 probed brands),
  `buttonFill`, `brand` and `accentInk` are all the brand's own hex. In the captured light palette
  all three are `#c2185b`. So focusing a filled link button draws a **2px ring of exactly the
  button's own colour**, separated from it by a 3px gap of ground.
- **Not a failure:** the ring is drawn on the ground, and `#c2185b` on `#fdf7f8` is 5.55:1, well
  past the 3:1 SC 1.4.11 asks. It is legible.
- **But it is weak as an indicator:** a ring the same colour as the thing it marks reads as a halo
  or a rendering artefact rather than as "this is where you are". The dark palette does not have
  this problem — there `accentInk` is lightened to `#df3b72` and the ring is visibly distinct.
- **Suggested fix:** a judgement call for the review rather than an obvious defect. If it is worth
  changing, the cheapest honest fix is to draw the ring in `--lp-ink` on filled controls, which is
  already guaranteed 7:1 against the ground and is unambiguously not the button's colour.

---

# Checks that passed

Recorded so the review does not re-raise them, and because several are strong enough that the
correct audit outcome is to say so plainly.

- **The palette derivation is genuinely rigorous, and it is the best thing in either package.**
  Contrast targets are enforced _by construction_ rather than checked after the fact: body text is
  pushed to **7:1** (AAA, not merely AA), muted text to 4.5 with the comment "muted is never a
  licence to fail", button ink to 4.5 on its fill, and the step-back rule moves the _fill_ while
  honouring the owner's typed hex exactly. Measured on the real emitted palettes, every one of
  those targets is met against `ground` in both modes. R-1 is a gap in **which backdrop** the
  targets are measured against — not in the rigour of the mechanism.
- **The advanced tier having no contrast check is correct**, not an oversight — §3.3 places it
  outside the guarantee and §3.4 specifies "reports contrast and nothing else — no refusal, no
  auto-correction, no export gate". `applyOverrides` implements exactly that.
- **`colourBlock` correctly moves the tagline off `--lp-ink-muted`.** Muted ink is derived against
  the ground, and on the filled header it would fail; `.lp-header .lp-tagline{color:inherit}` keeps
  §3.3 true inside a shape that moved the text. This is precisely the class of bug R-1 describes,
  found and fixed in the one place the author was looking.
- **`ruledLeft` uses `--lp-fill` rather than `--lp-rule` for its axis**, with the reasoning written
  out: that rule identifies a section, so it needs the 3:1 the step-back guarantees and the
  decorative hairline deliberately does not. The distinction between a decorative line and a
  load-bearing one is understood here.
- **Measure.** The column is `min(100%, 25rem)` — about 50 characters at the default text size,
  inside the checklist's 65–75 ceiling. The choice of `rem` over `px` is argued for low-vision
  readers and is correct.
- **Tap targets.** Link buttons are `min-height:3rem` (48px) and social links are a square
  `2.75rem` (44px) — both at or above the floor, before padding.
- **One focus treatment, page-wide**, on `:focus-visible` rather than `:focus`, with an
  `outline` rather than a `ring` so it never reflows. The builder's own equivalent is muddier
  (see B-36 and B-58 in the builder document); the renderer's is a single clean rule.
- **Logical properties throughout.** Nothing names `left`, `right`, `margin-left` or
  `padding-right`; `text-align:end` and `border-inline-start` are used so a page with `dir="rtl"`
  lays out correctly without a second stylesheet.
- **The contact rows are safe on `surface`** because `.lp-row` and `.lp-address` override the
  generic `a` colour to `--lp-ink`. This is why R-1's exposure stops at two roles rather than
  running through the whole page.
- **Determinism.** The corner slider is rounded to three decimals before it reaches the string
  specifically so the export stays byte-identical (§6.7), and nothing in the renderer reads a clock
  or a random source.
- **The spacing ladder is monotonic** where it matters — 28px between sections, 12px within the
  header, 10px within a list — even though R-4 finds orphan steps inside it.
- **Both modes and all four shapes were viewed**, and the pages are markedly more resolved than the
  builder that produces them. That is the right way round for a tool whose output is the product.

# What is still owed

- **Only 4 of the 24 combinations exist as captures**, and none of them is a _screenshot_ of the
  failing one. Four shapes × three pairings × two modes is 24; #172 captured four. The combination
  R-1 fails on — **`floatingCard` + dark** — was generated during this audit and its emitted CSS and
  palette measured directly (see R-1), so the finding does not rest on arithmetic alone. What is
  still missing is a rendered **image** of it; the HTML exists and only needs a browser pointed at
  it. The other 19 combinations are unexamined, though R-1's cause is structural rather than
  combination-specific.
- **Nothing was driven in a browser**, so the focus ring in motion, and how the page behaves at very
  large default text sizes (the case `rem` was chosen for), are unverified.
- **No long-content stress test.** Every capture uses one short business name, one tagline, two link
  buttons, one day of hours and one social account. How the page holds a 60-character business name
  at `1.625rem`, ten link buttons, or seven days of hours is untested — and §7.4 records that a
  carded direction was rejected in the builder precisely because it clipped a long hours row, so
  the project already knows long content is where layouts break.
