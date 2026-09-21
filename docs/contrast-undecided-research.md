# Why the contrast checker cannot decide — eleven screens, read one at a time

The research ticket for [#415](../../issues/415), under [Map: what the beta left unjudged](../../issues/414).
Answers the question [#318](../../issues/318) recorded and stopped at: **`color-contrast` comes back
_undecided_ on eleven of the builder's seventy-six screens, and nobody has looked at why.**

Measured on `main` @ `a22503a`, with `axe-core` 4.13.0, Chromium via Playwright, both of §7.6's
sizes. The historical comparison below was measured on `b96e8df`. Nothing here is a verdict on a
colour and nothing here is a fix; [#416](../../issues/416) is where the judging happens.

## The short answer

**It is not one cause. It is four, on eleven screens — and a fifth has arrived since the question
was asked.**

**And the first hypothesis was wrong.** #415 named the known shape to look for first: a control
painting `rgba(0, 0, 0, 0)` once left the sweep's own contrast control undecided, so a transparent
background was the thing to test. It was tested. **Not one of the eleven screens is undecided for
that reason.** Every element named below does have `background-color: rgba(0, 0, 0, 0)` of its own
— so does almost every element in the builder, because the ground colour is painted once on
`<main>` — and axe is untroubled by it: on nine of the eleven screens it walks that transparency
without a word and names an opaque ancestor, and then stops for a reason of its own. **What stops
it is geometry, in three different ways** — and on the other two screens, a single arrow
character.

| axe's reason            | what it means                                               | screens | nodes |
| ----------------------- | ----------------------------------------------------------- | ------- | ----- |
| `elmPartiallyObscured`  | the element painting the background does not cover the text | 2       | 101   |
| `bgOverlap`             | something is painted on top of the text                     | 6       | 21    |
| `elmPartiallyObscuring` | the text's own lines sit over different things              | 5       | 7     |
| `nonBmp`                | the text is a single symbol, not words                      | 2       | 4     |

(Screens overlap between rows: `62-menu-file-refused` and `63-menu-replace-confirm` carry two
reasons each.)

## First, a correction to the count

**On `a22503a` it is not eleven screens. It is fifty-five.**

```
  Undecided — axe could not tell either way. Not findings, and not clean either:
    color-contrast — on 55 of 76
    frame-tested — on 25 of 76
```

The forty-four extra are **every wizard screen, at both sizes**, and they are new. Run the same
measurement on `b96e8df` — the commit immediately before [#383](../../issues/383) gave the wizard's
exits row its sticky plate — and the figure is **exactly eleven of seventy-six, on exactly the
eleven screens this ticket is about**, with the same four reasons and, bar one node, the same node
counts.

| commit                  | screens with `color-contrast` incomplete | reasons                                                                           |
| ----------------------- | ---------------------------------------- | --------------------------------------------------------------------------------- |
| `b96e8df` (before #383) | **11 of 76**                             | `nonBmp` 4, `elmPartiallyObscured` 101, `bgOverlap` 20, `elmPartiallyObscuring` 7 |
| `a22503a` (today)       | **55 of 76**                             | the same, plus `pseudoContent` 120                                                |

So #318's reading was right when it was taken, and the eleven screens it names are still the eleven.
A fifth cause has been added on top of them since, by a change that shipped after the question was
written. It is described last, because it is not what #415 asked — but it is now four fifths of the
undecided readings, and #416 cannot ignore it.

⚠️ **One node differs between the two runs**: `desktop/63-menu-replace-confirm` reports seven
`bgOverlap` nodes today against six then — the open confirmation covers one more row of the review
list. Whether that is a real change between the commits or run-to-run variation in where the walk
leaves the page, **I did not determine**.

---

## 1. `elmPartiallyObscured` — the language row, 101 of the 133 nodes

**Screens:** `desktop/52-08-lang` (51 nodes), `mobile/52-08-lang` (50).
**Elements:** the name and the sample-hours line inside each `<button lang="…">` — `.text-base`
and `.text-sm.text-ink-quiet` — for every language that is scrolled out of sight.

This one reading is **101 of the 133 undecided nodes on the eleven screens**, and it is the least interesting
of the four.

The language list is its own scroll box: `ul` with `max-h-[calc(4*4.875rem+5px)] overflow-y-auto`,
**317px tall over 3,317px of content — 42 languages, four of them in view.** Measured on the
desktop screen as the sweep leaves it:

|                                                       |                                                       |
| ----------------------------------------------------- | ----------------------------------------------------- |
| the list's box                                        | 317px tall, `scrollHeight` 3,317px, `scrollTop` 553px |
| `<main>` (the one element painting the ground colour) | 1,731px tall, bottom edge at viewport y = 1,536       |
| the document                                          | `scrollHeight` 1,731px — the same as `<main>`         |
| the first clipped row's bottom edge                   | viewport y = **1,540**                                |
| language spans below `<main>`'s bottom edge           | **51**                                                |

The rows the list has scrolled past are still laid out, at their real positions, **four pixels
below the bottom of the only element in the page that paints a background — and below the bottom
of the document itself.** `<html>` and `<body>` are `rgba(0, 0, 0, 0)`; the ground colour lives on
`<main>`. axe walks the stack, reaches `<main>`, finds an opaque colour, checks whether that
element's box encloses the text rect, finds it does not, and stops with `elmPartiallyObscured` and
`contrastRatio: 0`.

**Reproduced.** Scroll the _list_ — not the page — so that same row comes into the list's own
visible band, and axe decides:

```
as it stands:          incomplete  {"contrastRatio":0,"messageKey":"elmPartiallyObscured"}
after listScrollTop 553 → 1287, the row's bottom moves from y=1540 to y=806
scrolled into the band: pass  {"fgColor":"#6b6257","bgColor":"#faf7f2","contrastRatio":5.59}
```

A span above `<main>`'s bottom edge on the same screen, untouched, reads `pass … 16.02:1`.

⚠️ **The remedy that looked obvious does not work, and the record should say so.** Giving `<html>`
the ground colour changes nothing: `<main>` is still the first element in the stack with an opaque
background, and axe stops at the first one. Measured, both before and after: `incomplete`.

**What this means for #416:** these 101 nodes are one situation, not 101. The colours involved are
`#1f1b16` and `#6b6257` on `#faf7f2` — 16.02:1 and 5.59:1 — the same two pairs the four visible
rows of the same list already report as passes.

## 2. `bgOverlap` — the menu is open, and the page is behind it

**Screens:** `61-menu`, `62-menu-file-refused`, `63-menu-replace-confirm`, at both sizes.
**Elements:** the landing page's own text, underneath the open menu — the quiet line
`p[data-arrival]` _"Your page is ready. Look it over, then download it."_, the `<h1>` carrying the
business name, and on the two taller panels the review list's row labels and summaries.

The menu panel is `div … class="absolute top-[calc(100%+0.25rem)] …"` with
`background-color: rgb(255, 255, 255)`. Asked what is painted at the quiet line's centre point, the
browser answers with the panel's contents first and the paragraph third:

```
button.tap.w-full[bg=rgba(0,0,0,0)]  <  div#…absolute[bg=rgb(255,255,255)]  <  p.font-sans.text-sm  <  …
```

axe's rule is blunt and correct: if the topmost thing over a text rect is not the text's own
element, it will not guess — `bgOverlap`.

**Reproduced.** Hide the two elements measured to be over the paragraph, change nothing else:

```
as it stands:        incomplete  {"contrastRatio":0,"messageKey":"bgOverlap"}
hidden: button.tap.w-full, div#…absolute
with it out of the way: pass  {"fgColor":"#6b6257","bgColor":"#faf7f2","contrastRatio":5.59}
```

**This is the checker being right rather than confused.** The text genuinely is behind an opaque
white panel; it is not on screen to be read at all. The same paragraph on the same landing screen
with the menu closed (`50-arrive`, desktop) reports `pass` at 5.59:1 without any intervention.

## 3. `elmPartiallyObscuring` — two lines of one paragraph, over two different things

**Screens:** `62-menu-file-refused` and `63-menu-replace-confirm` at both sizes, and
`mobile/50-arrive`. Seven nodes in all.
**Elements:** `p[data-refusal-message]` _"This doesn't look like a linkpage file."_;
`div[data-replace] > p` and its `<strong>` _"You're working on Ada & Sons Bakers. Opening this file
will replace it."_; and on the phone the landing note `p.m-0.mr-auto` _"Only you can see this. To
share it, download the file and put it on the web."_

These paragraphs wrap. axe evaluates a background **per text rect** and refuses if the rects
disagree. The refusal message is two lines, and its two stacks differ four layers down:

```
line 1:  p.m-0 < div.font-sans < div.border-s-2 < div#…absolute[bg=#fff] < h1.font-serif < div.mt-8.flex < div.mx-auto < main …
line 2:  p.m-0 < div.font-sans < div.border-s-2 < div#…absolute[bg=#fff] <                                  div.mx-auto < main …
```

The first line of the message happens to sit over the landing page's `<h1>`; the second does not.
Everything that differs is **beneath** the opaque white panel that is the nearest painted background
for both lines — but axe compares the whole stack, not the part that can still affect the colour,
and declines.

**Reproduced, on the second attempt.** Hiding the `<h1>` alone changes nothing, because its wrapper
`div.mt-8.flex` is also only in the first line's stack. Hide the wrapper — everything that differs,
all of it under the panel — and axe decides:

```
as it stands:                         incomplete  {"contrastRatio":0,"messageKey":"elmPartiallyObscuring"}
made invisible: div.mt-8 flex flex-col gap-2
with the differing elements gone:     pass  {"fgColor":"#1f1b16","bgColor":"#ffffff","contrastRatio":17.12}
```

`#ffffff` is the panel's own colour, unchanged by the experiment — so 17.12:1 is what this message
is actually painted at.

**The phone's landing note is the same mechanism with a different cast.** On the desktop that
paragraph is one line and reads `pass … 5.59:1`. At 390px it wraps to two, and the second line's
stack picks up `button.tap.w-fit < div.relative < div.flex.items-center` — the Menu button. The
boxes do intersect: measured at 390×844, the second line occupies x 12–131, y 30–46, and the Menu
button x 20–114, y 20–70.

⚠️ **That overlap is by design, and the record should not read as if a defect had been found.**
`Preview.tsx` opens the preview as `fixed inset-0 z-20 h-dvh bg-surface` on a narrow screen — an
opaque full-screen panel over the landing page, with the Menu button behind it, which is why the
note's background resolves to `#ffffff` (5.98:1) once the stacks are made to agree rather than to
the page's `#faf7f2`. **Whether anything about that reads wrong to a person, I did not determine**;
it is a layout question for a walk, not a contrast question.

## 4. `nonBmp` — an arrow is not words

**Screens:** `desktop/52-03-links`, `mobile/52-03-links`. Four nodes.
**Elements:** `button[aria-label="Move … up"] > span[aria-hidden="true"]` and its `down` twin —
the `↑` and `↓` inside the link row's reorder buttons.

Nothing geometric here at all. The `color-contrast` rule takes `ignoreUnicode: true` by default and
declines to judge an element whose entire visible text is symbol characters. `↑` is U+2191, and
axe's own test agrees:

```
{"text":"↑","codepoints":["U+2191"],"hasUnicodeNonBmp":true,"hasUnicodeEmoji":false}
```

**Reproduced.** Replace the arrow with a letter and re-run, touching nothing else:

```
as it stands:                 incomplete  {"messageKey":"nonBmp"}
with the arrow → a letter:    pass  {"fgColor":"#1f1b16","bgColor":"#faf7f2","contrastRatio":16.02}
```

The glyph is drawn in `#1f1b16` on `#faf7f2` like every other mark on the screen. **This is axe
declining a class of content, not axe failing to resolve a colour** — and it is the one of the five
where "undecided" carries no information about this product whatsoever.

## 5. `pseudoContent` — the new one: the wizard's sticky exits row

**Screens:** all 22 wizard screens at both sizes, 44 in all. 120 nodes.
**Elements:** three per screen — `Back`, the escape (_"We don't need one"_ and its siblings), and
`Continue`.

[#383](../../issues/383) gave the exits row a plate so it stays readable while the form runs on
under it:

```
sticky bottom-4
before:absolute before:inset-x-0 before:top-0 before:-bottom-4 before:-z-10 before:bg-ground
after:pointer-events-none after:absolute after:inset-x-0 after:bottom-full after:h-4 after:-z-10
  after:bg-linear-to-t after:from-ground after:to-transparent
```

axe walks a text element's ancestors looking for a `::before` or `::after` that is positioned,
painted and **larger than a quarter of the element's own area**; finding one, it will not judge the
text. Measured on the desktop wizard:

|                      |                                                                    |
| -------------------- | ------------------------------------------------------------------ |
| the `Back` button    | 88.84 × 50 = **4,442 px²**, so axe's threshold is 1,111 px²        |
| the row's `::before` | 512 × 66 = **33,792 px²**, `background-color: rgb(250, 247, 242)`  |
| the row's `::after`  | 512 × 16 = **8,192 px²**, a `linear-gradient` from the same colour |
| together             | **41,984 px² — 38 times the threshold**                            |

**Reproduced.** Set `content: none` on the row's two pseudo elements and nothing else:

```
as it stands:                  incomplete ×2  {"messageKey":"pseudoContent"}
with ::before/::after removed: pass  {"fgColor":"#1f1b16","bgColor":"#faf7f2","contrastRatio":16.02}
                               pass  {"fgColor":"#faf7f2","bgColor":"#3730a3","contrastRatio":9.29}
```

**And the numbers are the real ones.** The plate paints `rgb(250, 247, 242)` and `<main>` paints
`rgb(250, 247, 242)` — the same colour, measured on the same screen — so taking the plate away does
not change what is behind the text. `Back` is 16.02:1 and `Continue` is 9.29:1 either way.

## The eleven screens, element by element

`main` @ `a22503a`. Node counts are axe's, deduplicated by nothing — 51 language rows is 51 nodes.

| screen                            | reason                  | elements                                                                                                     | nodes |
| --------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------ | ----- |
| `desktop/52-03-links`             | `nonBmp`                | the two move arrows, `span[aria-hidden]` in `button[aria-label="Move …"]`                                    | 2     |
| `desktop/52-08-lang`              | `elmPartiallyObscured`  | 25 language names (`.text-base`), 26 sample-hours lines (`.text-sm.text-ink-quiet`, two of them `dir="rtl"`) | 51    |
| `desktop/61-menu`                 | `bgOverlap`             | the landing's quiet line, `p[data-arrival]`                                                                  | 1     |
| `desktop/62-menu-file-refused`    | `elmPartiallyObscuring` | `p[data-refusal-message]`                                                                                    | 1     |
|                                   | `bgOverlap`             | `p[data-arrival]`, `h1`, one row label                                                                       | 3     |
| `desktop/63-menu-replace-confirm` | `elmPartiallyObscuring` | `div[data-replace] > p` and its `strong`                                                                     | 2     |
|                                   | `bgOverlap`             | `p[data-arrival]`, `h1`, three row labels, two row summaries                                                 | 7     |
| `mobile/50-arrive`                | `elmPartiallyObscuring` | the landing note, `p.m-0.mr-auto`                                                                            | 1     |
| `mobile/52-03-links`              | `nonBmp`                | the two move arrows                                                                                          | 2     |
| `mobile/52-08-lang`               | `elmPartiallyObscured`  | 25 language names, 25 sample-hours lines                                                                     | 50    |
| `mobile/61-menu`                  | `bgOverlap`             | `p[data-arrival]`                                                                                            | 1     |
| `mobile/62-menu-file-refused`     | `elmPartiallyObscuring` | `p[data-refusal-message]`                                                                                    | 1     |
|                                   | `bgOverlap`             | `p[data-arrival]`, `h1`, one row label                                                                       | 3     |
| `mobile/63-menu-replace-confirm`  | `elmPartiallyObscuring` | `div[data-replace] > p` and its `strong`                                                                     | 2     |
|                                   | `bgOverlap`             | `p[data-arrival]`, `h1`, two row labels, two row summaries                                                   | 6     |

**Seven distinct pieces of text account for all eleven screens**: the language list's rows, the two
move arrows, the landing's quiet line and heading, the review list's row labels and summaries, the
import refusal message, the replace confirmation, and the phone's landing note.

## What each reading would be, if it could be read

Every figure below is axe's own, reported after the one measured obstruction was removed, with the
element's colours untouched. **They are not a verdict** — #416 decides what to do about them — and
two of them come with a caveat stated above.

| text                                 | fg on bg               | ratio   | needs |
| ------------------------------------ | ---------------------- | ------- | ----- |
| wizard `Back` and the escapes        | `#1f1b16` on `#faf7f2` | 16.02:1 | 4.5:1 |
| wizard `Continue`                    | `#faf7f2` on `#3730a3` | 9.29:1  | 4.5:1 |
| the move arrows                      | `#1f1b16` on `#faf7f2` | 16.02:1 | 4.5:1 |
| language names                       | `#1f1b16` on `#faf7f2` | 16.02:1 | 4.5:1 |
| language sample-hours lines          | `#6b6257` on `#faf7f2` | 5.59:1  | 4.5:1 |
| the landing's quiet line (menu open) | `#6b6257` on `#faf7f2` | 5.59:1  | 4.5:1 |
| the import refusal message           | `#1f1b16` on `#ffffff` | 17.12:1 | 4.5:1 |
| the phone's landing note             | `#6b6257` on `#ffffff` | 5.98:1  | 4.5:1 |

## What this does not settle

- **The `bgOverlap` readings are not about colour at all.** The text is behind an opaque panel and
  is not on screen. The figure above is what it reads when the menu is closed. **Whether a screen
  that hides its own heading behind a menu panel is worth a finding, I did not determine** — that is
  a walk's question.
- **The `<h1>` and row labels covered by the open menu differ by one node between the two commits
  measured.** Cause not determined; see the warning above.
- **`mobile/50-arrive`'s box overlap is real and deliberate** — an opaque full-screen preview over
  the landing page. Whether it looks right to a person is not something a contrast check can say
  and not something this research looked at.
- **The four causes on the eleven screens have not been traced to when each first appeared.** Only
  the fifth was bisected, because it was the one that made the count disagree with the question.
- **Nothing here was measured on a real phone.** The mobile figures are Chromium at 390×844 with
  `isMobile`, which is what the sweep uses.

## One observation about the instrument

`a11y-sweep.mjs` prints undecided readings as **rule ids and a count and nothing else** —
`color-contrast — on 55 of 76`. Violations get `nodeLines()`: the selector and the markup, capped at
eight. Undecided gets neither, so the report that correctly refuses to call undecided a pass also
gives a reader no way to go and look. Every table in this document needed a script that re-walks the
same route to recover detail the sweep had already had in its hands and thrown away. **Filing that
is the owner's call, not this ticket's.**

## Reproducing

```
pnpm a11y                 # both sizes, 76 screens; --size desktop|mobile to narrow
```

The per-node detail is not in that output. It was recovered by re-walking the same route
(`flow.mjs` + `list-route.mjs`) and keeping `results.incomplete` in full rather than mapping it to
rule ids, then, for each reason, making the one change the mechanism predicted and re-running axe
over the single element. Those scripts were scratch work for this document and are **not committed**;
the mechanism each one tests is `axe-core`'s own, in `axe.js` — `colorContrastEvaluate` and
`findPseudoElement` for reason 5, `textIsEmojis` for reason 4, `_getBackgroundStack` for reasons 2
and 3, `fullyEncompasses` for reason 1.
