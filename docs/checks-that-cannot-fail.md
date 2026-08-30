# Checks that cannot fail — a sweep

The evidence ticket for [Map: the checks check, or say what they miss](../../issues/322).
Answers [#317](../../issues/317), which sighted one guard that reads right and does nothing and
asked whether the same shape is doing the same nothing elsewhere.

Measured on `main` @ `153077c`. Baseline: **1,921 tests green** (995 renderer, 926 builder) across
53 Vitest files, plus 5 Playwright end-to-ends. **2,396 `expect(` calls in total.**

## The short answer

**The habit is not in the test suite. The test suite is in good health.** What is unchecked is the
instrument layer itself — **1,942 lines of it, with no test of any kind** _(corrected below: this
counted test files, and the real figure is about 239 — see the end of this document)_ — and the line where
coverage stops is exactly the line where a browser starts.

## 1. #317's own line: a different diagnosis

#317 reports the guard as one that **cannot fail**, on the ground that jsdom maps no role to
`<input type="file">`. Mounted and measured, three markups:

| markup                                                          | `queryAllByRole("button")` | contains the input |
| --------------------------------------------------------------- | -------------------------- | ------------------ |
| **the historical #254 defect** — `aria-label`, no explicit role | 1                          | **false**          |
| an explicit `role="button"` on the input                        | 2                          | **true**           |
| today's shipped markup — `aria-hidden`, `tabIndex={-1}`         | 1                          | false              |

**The line can fail.** Put `role="button"` on the input and it goes red. What it cannot do is catch
the defect it is named for — a file input made into a second accessible button _by a name alone_,
which is precisely what #254 removed.

⚠️ **That is a different category from "cannot fail", and the distinction is the useful part of this
sweep.** A dead check is a nuisance. **A check that is alive, and aimed slightly to one side of the
defect it is named for, is what has actually cost this repository time** — the same shape as
`SPEC.md` §5.3's _a class string is not a rendered box_, which is [#305](../../issues/305): that
guard also worked, on a question adjacent to the one its name claimed.

**One further correction.** #317 says the line _"appears at all three file-dialog call sites."_ In
the source it appears **once** — `packages/builder/src/pickers.test.tsx:104`, inside a shared helper
the three call sites all invoke. The path in #317 (`src/flow/questions/pickers.test.tsx`) has not
existed since `be7aaff`. Runtime behaviour is as described; the source is one line, not three.

⚠️ **And the file it sits in is the opposite of careless.** Eight lines above, the same helper
guards its own vacuity explicitly:

```ts
if (driver === null) {
  // Nothing else is mounted here, so `not.toContain` above would pass over an empty list.
  // Said positively instead: this component renders one element, and it is not a stop.
  expect(document.querySelectorAll("input"), "one element, and it is the picker").toHaveLength(1);
  ...
}
expect(stops.length, "the screen has tab stops to be absent from").toBeGreaterThan(0);
```

**The rule this map exists to write is already being applied, by hand, in the very file that carries
the one decorative line.**

## 2. Is the vacuity shape a habit? Measured: no

133 loop sites assert over a non-literal source, across 70 distinct sources. Most iterate module
constants that cannot be empty. For the shared ones that could be, the known-bad case was run —
each emptied at its definition, whole suite re-run:

| mutant                  | tests failed | verdict                        |
| ----------------------- | ------------ | ------------------------------ |
| `VOCABULARIES = {}`     | **194**      | caught, loudly                 |
| `PRESETS = []`          | **76**       | caught, loudly                 |
| `TOPICS = []`           | **61**       | caught, loudly                 |
| `WEIGHT = {}`           | **45**       | caught, loudly                 |
| `SHAPES = []`           | 5            | caught                         |
| `MODES = []`            | 2            | caught                         |
| `SOCIAL_PLATFORMS = []` | **1**        | ⚠️ **caught by a single test** |

Supporting evidence that the good habit is already established: **52 non-emptiness assertions across
11 files**, and **zero** identical-operand tautologies in all 2,396 assertions.

⚠️ **But note what the numbers say underneath the verdicts.** `SHAPES` drives six assertion loops
and emptying it failed **five** tests; `MODES` drives five loops and failed **two**. The loops
themselves went quiet — _other_ tests caught the mutant. That is `census.mjs`'s own warning
(_a guard that only reports what some other line already noticed is not a guard_) holding for the
suite as a whole: **the corpus is defended, but not by the loops that iterate it.**

**`SOCIAL_PLATFORMS` is the one thin spot.** Every social platform the product knows about can
vanish and exactly one test notices.

## 3. The gated tier is exemplary, and already meets the standard

`focus-ring`, `reachability` and `tap-target` — the three walks §7.12's commitments 2, 3 and 5 rest
on — each assert, per screen, that the screen had anything on it at all; then assert whole-walk
floors (**≥ 16 screens, ≥ 100 tab stops, ≥ 140 controls**); then **carry their own control**: a test
that strips the focus ring, shrinks the boxes, or walks the route and confirms the check goes red.

**This is #287's _induced, not argued_ standard, in the tree, before #287 wrote it down.** Whatever
[#323](../../issues/323) settles, it is describing something three files already do.

## 4. Where the coverage actually stops

The instruments split cleanly in two, and the boundary is _does it need a browser_:

|                       | module             | lines     | test                                                          |
| --------------------- | ------------------ | --------- | ------------------------------------------------------------- |
| **Pure logic**        | `census.mjs`       | 189       | `census.test.mjs` (186)                                       |
|                       | `stability.mjs`    | 106       | `stability.test.mjs` (106)                                    |
|                       | `variants.mjs`     | 88        | `variants.test.mjs` (66)                                      |
|                       | `port.mjs`         | 30        | `port.test.mjs` (72)                                          |
|                       | **total**          | **413**   | **430**                                                       |
| **Needs a browser**   | `review-shots.mjs` | 885       | **none**                                                      |
|                       | `a11y-sweep.mjs`   | 690       | **none**                                                      |
|                       | `flow.mjs`         | 291       | **none**                                                      |
|                       | `serve.mjs`        | 76        | **none**                                                      |
|                       | **total**          | **1,942** | **0**                                                         |
| _Exercised by a gate_ | `axe.mjs`          | 128       | none of its own — but imported by `exported-page-a11y.e2e.ts` |

`screenshots.mjs` (125) is excluded: it captures the two README images and asserts nothing, by
design and by its own docstring.

⚠️ **`flow.mjs` is the load-bearing one.** 291 lines, no test, and imported by **both** hand-run
drivers — `review-shots.mjs:102` and `a11y-sweep.mjs:74`. It is the walker that decides which
screens either instrument ever sees.

**It is also where [#270](../../issues/270) happened.** From `be7aaff` every `pnpm shots` run printed
`! no project picker on the list — skipping the import screens`, exited 0, reported a cheerful
`70 shots →`, and two frames were absent from every set taken **for three months**. The fix for #270
was `census.mjs` — which is tested, 189 lines against 186. **The guard got a test; the thing it
guards did not.**

⚠️ **`axe.mjs` is the tell.** It is the only browser-touching module with any coverage, and it has
none of its own — it is covered because a **gate** imports it. **Coverage here is a side-effect of
being on the gated path.** The two instruments §7.4 and §7.12 hand to a person are off that path,
and have nothing.

## What this sweep did not do

**Stated, because a check that does not state its bound is this map's subject.**

- **8 known-bad cases were run against 2,396 assertions.** Seven emptied-collection mutants and one
  targeted probe. This is not a mutation-testing run and does not claim to be; it tested the shapes
  #317 named and the corpora most likely to carry them.
- **No end-to-end was mutated.** The three walks were read and found to carry controls; their
  controls were not themselves induced. Their green here is inherited from CI, not re-measured.
- **The 52 class-string assertions were counted, not judged.** §5.3 already ruled on the one that
  mattered (#305). Whether any of the remaining 51 makes a rendered-box claim from a class string is
  a per-site reading this sweep did not do.
- **`serve.mjs` and `axe.mjs` were not probed** beyond establishing what imports them.

---

## Correction, added on [#335](../../issues/335): the headline figure counted the wrong thing

**"1,942 lines of it, with no test of any kind" counted _test files_, and there are four ways an
instrument is held honest here.** Three of them are not test files. `SPEC.md` §5.3 now names all
four; measured against them, the genuinely unheld surface is **about 239 lines, not 1,942**.

| module             | lines | how it is actually held honest                                                     |
| ------------------ | ----- | ---------------------------------------------------------------------------------- |
| `a11y-sweep.mjs`   | 690   | **by a control** — `CONTROLS` and `emptyRun` run on _every_ invocation             |
| `review-shots.mjs` | 885   | **by delegation** — `census.mjs` and `stability.mjs`, both tested                  |
| `wizard.mjs`       | 222   | **by a gate** — the three walks run it every push (since [#332](../../issues/332)) |
| `axe.mjs`          | 128   | **by a gate**                                                                      |
| `flow.mjs`         | 163   | only indirectly, by the census naming a frame that never arrived                   |
| `serve.mjs`        | 76    | **nothing repeatable** — [#336](../../issues/336)                                  |

**The original claim is left standing above rather than edited away, and it should stay that way.**
This document's own subject is a check that reads right and reports on something adjacent to what
its name says. **That is exactly what its headline did**: it measured a filing convention and
reported it as a gap. A document about instruments that cannot see, quietly deleting the moment its
own instrument could not, would be a worse error than the miscount.

**What survives the correction.** Everything the sweep actually measured still stands — the seven
mutants and their failure counts, the zero tautologies in 2,396 assertions, the 52 non-emptiness
guards, the gated walks' controls, and the two categories of §1. **What did not survive is a
conclusion drawn from a count nobody had asked what it counted.**
