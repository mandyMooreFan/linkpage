# The wizard, walked by keyboard and read from the accessibility tree

Resolves [#263](https://github.com/mandyMooreFan/linkpage/issues/263) on
[Map: what the builder promises about accessibility](https://github.com/mandyMooreFan/linkpage/issues/261).

**Driven, not read off the source.** Built with `vite build`, served with `vite preview`, driven in
Chromium through the repo's own `@playwright/test`. Accessible names, roles and descriptions come
from the browser's own tree via CDP `Accessibility.getFullAXTree` / `getPartialAXTree` — not from
`innerText`, and not from the markup.

Covered: the landing screen and eight wizard steps, at **390×844 and 1440×900**, plus the progress
bar's toggle and topic list, plus the invalid-input state of the one field that rejects input.

Evidence, not judgement — findings are numbered, and whether each is worth acting on belongs to
[the change list](https://github.com/mandyMooreFan/linkpage/issues/267).

---

## Findings

### A-1 — A step that cannot be completed says nothing, to anyone

**The sharpest thing in this walk.** On *What's your colour?*, typing `zzzzzz` into *Or type your
exact colour*:

| | |
|---|---|
| `aria-invalid` | **not set** |
| `aria-describedby` | still points only at the hint, *"From a designer or a brand guide."* |
| live region (`aria-live`, `role="alert"`, `role="status"`) | **none anywhere on the page** |
| text that appeared on screen | **none** — diffed the step's full text before and after |
| the field's border colour | unchanged, `rgb(31, 27, 22)`, the same ink as a valid field |
| Continue | **silently becomes disabled** |

So the tool detects the error, refuses to advance on it, and **describes it to nobody** — sighted
or not. That alone is a product gap rather than an accessibility one, since everybody gets equally
little.

**The accessibility edge is sharper, and it is this:** a disabled button is **removed from the tab
order**. Confirmed across every step of this walk — Continue appears in *no* tab order until the
step is answered. A keyboard or screen-reader user therefore tabs the entire step, reaches the end,
wraps, and **never encounters Continue at all**. There is no disabled control to hear, no message
to read, and no cue that anything is wrong or that a next step exists.

Relevant: **SC 3.3.1 Error Identification** — an automatically detected error must be *described to
the user in text*. §7.9 is where the spec says failures appear; this path does not reach it.

### A-2 — Escape does not close the progress bar's topic list

Opened by keyboard (Enter on the bar's toggle) the list behaves correctly in every other respect —
see the confirmations below. Pressing **Escape leaves `aria-expanded="true"`** and the list open;
focus stays on the toggle.

**Graded honestly: a convention gap, not a conformance failure.** The list is a non-modal
disclosure that pushes content down rather than covering it, so no success criterion compels
Escape. It is still the key every user will try.

### A-3 — The preview iframe is a tab stop with no focus indicator *(observation, not a claim)*

At 1440×900 every screen carries exactly one stop more than at 390×844, and it is always the same
one: the preview `<iframe>`, 440×720, accessibly named **"Your page"**. Being named is correct and
good. It is also **the only stop in the entire walk where `:focus-visible` did not match** and no
indicator is painted.

Chromium makes scrollable iframes focusable on its own, and focus-indicator behaviour for them is
the browser's rather than the page's. **Recorded rather than claimed** — someone should decide
whether this is ours to fix.

---

## Confirmations the ticket asked for

**The file-picker fix holds.** Across both widths and all nine screens: **zero file inputs in any
tab order**, and no sub-pixel stop anywhere except the hours radios below. *Choose a file* is a
single named button at 137×44. [#254](https://github.com/mandyMooreFan/linkpage/issues/254) is good.

**`HoursQuestion.tsx`'s `sr-only` radio behaves differently from the file pickers — legitimately.**
The ticket asked me to check this rather than assume the class means one thing in three places. It
does not:

```
radio 1x1 name="Not shown"  clipped -> label 98x44 shows outline 2px
```

The radio is clipped to 1×1 and *stays* in the tab order, and the visible 98×44 label paints the
ring. That is the pattern [#188](https://github.com/mandyMooreFan/linkpage/issues/188) relies on,
working. Only **7** radios are tab stops though there are **21** — correct radiogroup behaviour,
one stop per group, arrows within.

**The nine focusable 0×0 buttons reported by [#265](https://github.com/mandyMooreFan/linkpage/issues/265) do not reproduce.** On current `main` the colour swatches are **48×48 named buttons** —
"Crimson", "Raspberry", "Grape"… That lead was a transient of a crude driver, as #265 suspected and
deliberately did not claim. **Closed.**

**The progress bar's topic list is correct.** Measured both ways:

| | closed | open |
|---|---|---|
| `hidden` attribute | `true` | `false` |
| computed `display` | `none` | `block` |
| topic buttons in the DOM | 9 | 9 |
| **topic buttons in the accessibility tree** | **0** | **9** |
| `aria-expanded` | `false` | `true` |

`aria-controls` resolves to a real element. Open, all nine are tab stops at 350×44. This is the
disclosure pattern done properly.

---

## Two things that make the promise stronger than it is written

[§7.12](https://github.com/mandyMooreFan/linkpage/issues/262) grades two of its commitments as
weaker than measurement. This walk measured them:

- **Commitment 2 — "a focus ring is defined for every control", graded *guarded at the stylesheet*.**
  Observed painted on **every stop of every screen at both widths**: `outline 2px`, with the
  clipped radios forwarding to their labels. Zero ring failures. The commitment is true in the
  browser, not only in `theme.css`.
- **Commitment 5 — "every pressable control carries the tap floor", graded *guarded at the class
  string*.** The link-buttons step renders 20×20 checkboxes — under the floor on their own box — but
  each has a **350×44 clickable label**, so the effective target is 350×44. Measured, not inferred.

Neither has a standing test in that form. Both are candidate change-list items: **the cheapest
upgrades available to §7.12.**

---

## On method, because it nearly went wrong four times

Every one of these first read as a finding and was the instrument:

1. **`innerText` is not an accessible name.** Text fields showed as *"NO ACCESSIBLE NAME"* because
   an `<input>` has no `innerText`. The browser's tree said `"Business name"`, `"Tagline"`. Switched
   to CDP for every stop.
2. **Deduping tab stops by name+size collapsed seven radios into two** and reported the hours step
   as having 2 stops. It has 12. Now deduped by element identity.
3. **An `outline` on a 1×1 box is not a visible ring.** The first pass reported the clipped radios
   as ringed. They are — on their labels — but the check had to be taught to look there.
4. **A field lookup by `aria-label` missed a field named by its `<label>`**, and reported the colour
   box as absent through four states.

The map's inherited rule is that a guard must prove it found something before it reports nothing
wrong. **The same applies to a walk**: an instrument that cannot see a control reports a clean
screen, and a clean screen is what you were hoping for.
