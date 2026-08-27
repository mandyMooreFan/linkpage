# What an automated accessibility check can and cannot assert here

Resolves [#265](https://github.com/mandyMooreFan/linkpage/issues/265) on
[Map: what the builder promises about accessibility](https://github.com/mandyMooreFan/linkpage/issues/261).

Everything below was **measured in this repo**, not quoted. Versions: `axe-core` 4.13.0 (105 rules),
Chromium via the repo's own `@playwright/test`, builder built with `vite build` and served with
`vite preview`, exported pages rendered straight from `packages/renderer`. Two commits were used:
`3fef3f5` (before the file-picker and drawer fixes landed) and `42b7e66` (current `main`).

---

## 1. The headline

**23 of the 55 WCAG 2.2 A+AA success criteria have at least one axe rule. 32 have none.**

Counted from `axe.getRules()` and its own `wcag*` tags, against the WCAG 2.2 A+AA list (31 Level A +
24 Level AA; 4.1.1 Parsing was removed in 2.2).

**With at least one rule (23):** 1.1.1 1.2.1 1.2.2 1.3.1 1.3.4 1.3.5 1.4.1 1.4.2 1.4.3 1.4.4 1.4.12
2.1.1 2.2.1 2.2.2 2.4.1 2.4.2 2.4.4 2.5.3 2.5.8 3.1.1 3.1.2 3.3.2 4.1.2

**With no rule at all (32):** 1.2.3 1.2.4 1.2.5 1.3.2 1.3.3 1.4.5 **1.4.10** 1.4.11 1.4.13 **2.1.2**
2.1.4 2.3.1 **2.4.3** 2.4.5 2.4.6 **2.4.7** **2.4.11** 2.5.1 2.5.2 2.5.4 2.5.7 3.2.1 3.2.2 3.2.3
3.2.4 3.2.6 **3.3.1** 3.3.3 3.3.4 3.3.7 3.3.8 4.1.3

And **"has a rule" is not "is covered."** 4.1.2 Name, Role, Value has 29 rules; 1.3.1 Info and
Relationships has 12 and is one of the broadest criteria in the standard. A rule tests one mechanical
thing, not a criterion.

### Why that list is worse than it looks for *this* project

Every accessibility defect this repo has actually found sits in the **32 with no rule** — except
contrast, which is the one class axe covers well:

| What was found | Criterion | axe rule? |
|---|---|---|
| [#254](https://github.com/mandyMooreFan/linkpage/issues/254) file pickers were dead tab stops | 2.4.3 Focus Order | **none** |
| [#255](https://github.com/mandyMooreFan/linkpage/issues/255) drawer left the list reachable behind it | 2.4.11, 2.1.2 | **none** |
| [#244](https://github.com/mandyMooreFan/linkpage/issues/244) address row forced sideways scroll | 1.4.10 Reflow | **none** |
| [#246](https://github.com/mandyMooreFan/linkpage/issues/246) bar still moved under `reduce` | 2.3.3 (AAA) | **none** |
| [#188](https://github.com/mandyMooreFan/linkpage/issues/188) focus must be visible | 2.4.7 Focus Visible | **none** |
| the Tailwind audit's contrast failures (R-1, item 1.1) | 1.4.3 Contrast | **yes** |

**A checker would have caught the contrast work and none of the rest.**

---

## 2. What it did on the real product

### The builder, before the fixes (`3fef3f5`, phone width)

Walked screen by screen. On the two screens carrying a clipped file input:

```
screen 0: What kind of business is this?   axe: 0 violations   focusable: 9,  sub-pixel: 1  <input type=file> 1x1
screen 3: Do you have a logo?              axe: 0 violations   focusable: 15, sub-pixel: 1  <input type=file> 1x1
```

**Zero violations on both, with the dead tab stop sitting in the DOM.** Reduced to a fixture and
re-run with the input labelled the way the app had it: still **0 violations**. The defect is entirely
invisible to the checker.

### The exported page, current `main`

All four shapes × both modes × two viewports — the full set §6.8's claim covers:

```
floatingCard / framed / plain / ruledLeft, light and dark, @390 and @1440
  -> 16 of 16: violations=0, passes=14, incomplete=0
```

**Clean.** That is genuine and worth having; it is also a much smaller statement than "meets WCAG 2.2 AA".

### Isolated patterns

Fixtures reproducing each pattern, WCAG A+AA tags. A control group ran first so the harness had to
prove it could find anything at all:

| Pattern | Result |
|---|---|
| *control:* missing form label | **caught** (`label`) |
| *control:* low contrast text | **caught** (`color-contrast`) |
| *control:* image with no alt | **caught** (`image-alt`) |
| link with no accessible name | **caught** (`link-name`, 12 nodes) |
| `aria-hidden` on a focusable link | **caught** (`aria-hidden-focus`, 12 nodes) |
| **1×1 clipped file input, labelled, in the tab order** | **missed** |
| **opaque layer covering still-focusable content** | **missed** |
| **`aria-modal="true"` over content that is still reachable** | **missed** |
| **`outline: none` on every control in every state** | **missed** |
| **positive `tabindex` ladder that fights reading order** | **missed** under WCAG tags |
| colour as the only cue for a required field | **missed** |
| animation ignoring `prefers-reduced-motion` | **missed** |
| every heading element removed | **missed** under WCAG tags |

The `aria-modal` result deserves its own line. **axe does not check whether an `aria-modal="true"`
declaration is true.** A dialog can claim the rest of the page is unavailable while every control
behind it is still tabbable, and the checker passes it. That is worse than a missing attribute,
because the page is now actively lying to assistive technology — and it is exactly the shape
[#255](https://github.com/mandyMooreFan/linkpage/issues/255) had to reason its way to by hand.

### A note on tags, which is a trap

`tabindex` and `heading-order` are tagged **`best-practice`, not WCAG**. Running WCAG-only tags —
the obvious choice for a project whose promise names WCAG — silently drops **30 of axe's 105 rules**.
Measured on the same fixture: positive `tabindex` gives `0` violations under WCAG tags and `1`
(`tabindex`) once `best-practice` is included.

**Choosing the honest tag set is a decision, not a default**, and it belongs in the promise.

---

## 3. The empty-run problem, which is the real risk

This map's predecessor had three guards return empty and pass. An accessibility checker fails the
same way, and it would be sitting under a published promise.

```
the real exported page      violations=0  passes=14  inapplicable=49
an empty document           violations=0  passes= 4  inapplicable=59
```

**A page that never loaded reports zero violations and looks exactly like a clean pass.** Worse,
`passes > 0` is not a liveness check either — an empty document still scores 4 passes.

Mutation-testing the real page shows what a live check looks like, and also caught two of my own
mutants doing nothing at all:

| Mutation | Result |
|---|---|
| strip every `lang` attribute | **red** — `html-has-lang` |
| wash the ink out to near-background | **red** — `color-contrast` |
| empty every link button's contents (12 nodes) | **red** — `link-name` ×12 |
| `aria-hidden` on every link (12 nodes) | **red** — `aria-hidden-focus` ×12 |
| ~~strip the logo's `alt`~~ | **void** — `MAXIMAL` renders no `<img>` and no `alt` at all |
| ~~empty the links by regex~~ | **void** — the `<a>` wraps an `<svg>`; the regex never matched |

The two void rows are the point. Both first read as *"axe missed this"*, and both were the mutation
failing to happen. **A mutation test has to assert that it mutated something** — the same rule as the
guard it is testing, one level up.

### What the check must assert about itself

1. **A named element it expects was actually tested** — assert a specific rule reports a specific
   node count, not merely that violations are zero.
2. **`passes` and `inapplicable` against known figures** (14 / 49 for the exported page today), so a
   page that fails to render moves both and fails.
3. **At least one mutant is verified red in the same suite**, with the mutation asserted to have
   changed the DOM.

---

## 4. Recommendation

**Use `axe-core` (already proven here), driven by Playwright, which the repo already has.** No new
runtime dependency reaches shipped code — `axe-core` is a devDependency injected into the page under
test. Add `@axe-core/playwright` or inject `axe.min.js` with `addScriptTag`, as done for this study.

**Run it in two places, because they are different jobs:**

- **The exported page — in CI, as an assertion.** It is a single self-contained file rendered from a
  fixture, deterministic, and already clean at 16/16. This is cheap, stable, and directly guards the
  only formal claim the project makes (§6.8). **Do this one first.** It costs little and it turns a
  prose promise into a test.
- **The builder — hand-run, like `pnpm shots`.** A live app with layers, a long wizard, and states
  reachable only by driving it. Getting to the list took more than sixty steps in this study. A CI
  job that walks it will be slow and flaky, and — per §1 — would not have caught a single one of the
  builder's real defects. **Wire it as an alias next to `shots`, not a gate.**

**Tag set:** WCAG A+AA **plus** `best-practice`, with any rule the project consciously rejects
disabled by name and a comment saying why. WCAG-only silently drops 30 rules including `tabindex`.

**What the promise may say, given all of the above:**

> The exported page is checked in CI by axe-core against WCAG 2.2 A and AA, and passes with no
> violations in every shape and mode. That check covers **23 of 55** A/AA criteria and does not
> examine focus order, focus visibility, reflow, keyboard traps, or whether an `aria-modal`
> declaration is true — those rest on a hand-driven walk of the accessibility tree.

**What it must not say:** that the product "meets WCAG 2.2 AA because the check is green." On this
evidence that sentence would be false — the check is green today on a page whose criteria it mostly
does not test, and it was green on a builder with a dead tab stop in it.
