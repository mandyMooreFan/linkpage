# The list and its layers, walked by keyboard and read from the accessibility tree

Resolves [#264](https://github.com/mandyMooreFan/linkpage/issues/264) on
[Map: what the builder promises about accessibility](https://github.com/mandyMooreFan/linkpage/issues/261).
Companion to [the wizard walk](./wizard-keyboard-walk.md).

Driven in Chromium through the repo's own Playwright, names and roles from the browser's tree over
CDP. Reached by importing a project through the real file input, at **390×844 and 1440×900**.
Covered: the list as arrived and opened, a row open, the menu, §7.8's replace confirmation, §7.9's
refusal notice, and §7.7's download sheet.

---

## The headline: `aria-modal` is honest, and I expected it not to be

[#264's own ticket text](https://github.com/mandyMooreFan/linkpage/issues/264) said this was the
sharpest thing in the walk, because [#265](https://github.com/mandyMooreFan/linkpage/issues/265)
proved **no automated checker verifies that an `aria-modal="true"` declaration is true**, and a
false one is worse than a missing one. It is not false.

```
sheet attrs: { role: 'dialog', ariaModal: 'true', inertOnRest: false }

Tab  x10 from inside:  Close > Download index.html > Download …json > Close > …  (never leaves)
Shift+Tab x4:          …json > Download index.html > Close > …json               (never leaves)
```

**The sheet holds keyboard focus in a real trap**, forwards and backwards, indefinitely. For a
Tab user the modality is genuine.

**What is true, and is a judgement rather than a defect:** the content behind is **not `inert`**,
and a programmatic focus call lands on a row behind the sheet. So the sheet enforces modality with
a *focus trap* where the drawer ([#255](https://github.com/mandyMooreFan/linkpage/issues/255))
enforces it with **`inert`** — two mechanisms for one idea, in one product. A trap holds Tab; `inert`
also holds find-on-page, programmatic focus, and assistive technology that navigates by its own
cursor rather than by the tab order.

---

## Findings

### B-1 — The replace confirmation is a fork the keyboard can walk away from

§7.8's confirmation is `role="group"`, carries **no `aria-modal`**, and nothing around it is `inert`.

```
tab from inside: Open the file > Cancel > Download <-- ESCAPED > Business name <-- ESCAPED > …
                 focus escaped the layer on 6 of 8 presses
Escape from inside it: still present
```

The product already treats this as the errand the owner is on — [#228](https://github.com/mandyMooreFan/linkpage/issues/228) steps the bar's Download *down* for it, and
[#200](https://github.com/mandyMooreFan/linkpage/issues/200) gave *Open the file* the fill. But
nothing holds the keyboard there: two stops and you are back in the list with the fork still
unanswered and a file still waiting.

**Graded as a judgement, not a conformance failure.** It claims no modality, so it is not lying, and
"a fork leaves on one of its own buttons" is a defensible reading — Escape would have to mean
*Cancel*, and choosing that silently is its own decision.

### B-2 — The preview iframe has no focus indicator, at either width

Second sighting; [the wizard walk](./wizard-keyboard-walk.md) recorded it as A-3. It is a tab stop
at both widths, correctly named **"Your page"**, and the only stop in either walk with no ring.
Chromium owns iframe focus behaviour, so **recorded, not claimed**.

### B-3 — A correction to the wizard walk's A-2

[#263](https://github.com/mandyMooreFan/linkpage/issues/263) reported flatly that *Escape does not
close the progress bar's topic list*. Measured again here against both focus positions, that is
too broad:

| Escape pressed with focus… | topic list | the menu |
|---|---|---|
| **on the toggle** | **stays open** (`aria-expanded="true"`) | closes |
| inside the panel | closes | closes |

So the bar handles Escape on the panel and not on the toggle — **and the toggle is exactly where
focus sits after opening it by keyboard**, so the natural sequence (Enter, then Escape) does
nothing. The menu handles both. **The bar is the outlier, not the product.** The finding is real
and narrower than #263 stated.

---

## Confirmations

**[#255](https://github.com/mandyMooreFan/linkpage/issues/255)'s `inert` holds — behaviourally, which is what its own test could not show.** §7.12's
commitment 3 is graded *guarded at the attribute* because **jsdom does not implement `inert`**. In a
real browser:

| | 390×844, page over the list | 1440×900, side by side |
|---|---|---|
| focusable on the page | 16 | 16 |
| outside the drawer | 15 | 15 |
| **still reachable** | **2** — *Edit your page*, *Download* | **13** — all of them |
| tab stops | 3 | 14 |

Thirteen controls behind the cover are genuinely out of reach at phone width, and all of them are
in reach at desktop where nothing covers anything. That is §7.12's commitment 3 **observed**, and
[#255](https://github.com/mandyMooreFan/linkpage/issues/255)'s rule — *what is on the glass is in
reach, and what is not, is not* — working exactly as written, with no width consulted about it.

**The menu is correctly marked up.** `aria-expanded`, `aria-controls` resolving to the panel, and
`hidden={!open}` on the panel. (I first reported this as a missing `aria-expanded`; I had read the
attribute off the `[data-menu]` **wrapper `<div>`** instead of the `<Button>` inside it. See the
method note.)

**§7.9's refusal notice is announced.** `role="alert"`, carrying *"This file appears to be damaged."*
plus the technical detail.

### That last one sharpens the wizard's A-1 considerably

[#263's A-1](https://github.com/mandyMooreFan/linkpage/issues/263) found that an invalid colour
raises **no live region anywhere on the page** and no text at all. This walk shows **the product
already owns the mechanism** — §7.9 announces a bad import through `role="alert"`.

So A-1 is not *"the builder has no way to announce a problem."* It is *"the builder has one, built
for §7.9, and the wizard's invalid states do not use it."* That is a much smaller and more
actionable change, and it belongs in [the change list](https://github.com/mandyMooreFan/linkpage/issues/267) that way.

---

## On method, again

Two more instruments produced false findings here before being caught, on top of the wizard walk's
four:

5. **`aria-expanded` read off a wrapper.** `[data-menu]` is a `<div>`; the attribute is on the
   `<Button>` inside it. Reported as "the menu exposes no state" until checked against the source.
6. **"Present in the DOM" is not "open."** The menu panel stays in the DOM with `hidden`, so a
   presence check said Escape did nothing when it had closed it. Only reading `aria-expanded` and
   the `hidden` attribute gave the right answer — which then also corrected #263's A-2.

Six across the two walks. Every one first read as a finding about the product. **A walk needs the
same rule as a guard: prove the instrument can see the thing before believing it when it reports
nothing wrong** — and prefer the attribute the component actually sets over a proxy for it.
