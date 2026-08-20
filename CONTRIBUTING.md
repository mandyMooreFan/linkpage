# Contributing to linkpage

Thanks for looking. This is a small, deliberately narrow project, and the fastest way to
have a good time here is to read the two short sections at the top before you write code.

> **Status: design phase.** The v1 spec is still being written on the
> [wayfinder map](../../issues/1). The repo builds and tests, but there is no product yet —
> `packages/renderer` renders a placeholder and `packages/builder` is a shell. If you want
> to influence the shape of v1, comment on an open issue rather than opening a PR.

## Who this tool is for

A small-business owner with very little technical knowledge who needs one page: their name,
some link buttons, their hours, their address, their phone number, their socials. They will
use this once, get a file, and put it somewhere.

That user is the tie-breaker for every design argument. **When a change trades
comprehensibility for power, comprehensibility wins.** A feature that is obvious to a
developer and puzzling to a florist is a bug here.

## What will be rejected

Not because the ideas are bad — because they contradict a constraint the project is built
on. Please don't open a PR for these:

|                                                            | Why                                                                                                |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Anything needing a server, an account, or a login          | There is no backend and there never will be. That is what makes this free to run and free to fork. |
| Click analytics or visitor tracking                        | Requires somewhere to record events.                                                               |
| Contact or lead-capture forms                              | A form POST needs a server. `mailto:` and `tel:` links are the substitute.                         |
| Multi-page sites                                           | The line between a link page and a website builder. One page, one file.                            |
| Custom domain / DNS setup                                  | Owned by whichever host the user picks, not by an export tool.                                     |
| Deploying on the user's behalf                             | The tool _explains_ how to get the file online. It doesn't integrate with hosts.                   |
| `<script>` in the exported page                            | See the invariants below. This one is enforced by CI.                                              |
| A multi-file export (`dist/`, separate CSS, linked images) | The whole promise is one file you can email or drag onto a host.                                   |

If you think one of these is wrong, the place to argue is an issue, not a PR — several of
them were decided deliberately and the reasoning is written down on the map.

## The three invariants

`packages/renderer` produces the file the user ships. Three properties of it are enforced by
tests in `packages/renderer/src/invariants.test.ts`, and a PR that weakens a test to make a
feature fit will be closed:

1. **The export contains no `<script>` tag.** Zero JavaScript, as a rule and not a target.
   A script-free page can't break, can't be flagged by a host, renders instantly, and
   survives being emailed around or pasted into someone's CMS. The cost is real and
   accepted: the hours block cannot show a live "open now" indicator, because that needs the
   visitor's clock. It renders as a static table instead.
2. **The export references nothing outside itself.** No external URLs and no relative paths
   for anything the browser must _fetch_ — images, fonts, stylesheets. Those get inlined as
   `data:` URIs. Ordinary links to other sites (`<a href="https://…">`) are fine; that's the
   entire point of a link page. The test is whether the file still renders correctly when
   opened from a desktop with the network off.
3. **`packages/renderer` declares no dependencies.** Its `dependencies` block is empty and
   stays empty.

That third one is why this is a pnpm workspace rather than a folder of files. npm would
hoist React into one flat `node_modules`, so an `import { useState } from "react"` inside
the renderer would quietly resolve and work. pnpm's isolated store makes it fail at build
time — a package can only import what it declares. The boundary is mechanical, not
aspirational.

**Careful:** pnpm deletes empty blocks when it rewrites `package.json`. If you run
`pnpm add` inside `packages/renderer`, put `"dependencies": {}` back before committing.

## Architecture in one paragraph

`render(project) → string` is a pure function from a project object to the complete text of
an `index.html`. It is the artifact contract, so it stays stable and stays dependency-free.
The builder is React chrome around it: it holds one `Project` in state, and previews by
dropping `render(project)` into a `srcdoc` iframe. **The preview is the export** — the same
string, not a simulation of it — so WYSIWYG holds by construction rather than by discipline,
and the UI framework can be replaced in five years without touching the export format.

```
packages/renderer   plain TypeScript, zero dependencies  →  the artifact contract
packages/builder    React + Vite, GitHub Pages           →  replaceable chrome
```

## Getting set up

You need **Node 22.12 or newer** (`.nvmrc` pins the active LTS, 24) and pnpm via Corepack:

```bash
corepack enable          # one time; ships with Node
git clone https://github.com/mandyMooreFan/linkpage.git
cd linkpage
pnpm install
pnpm dev                 # builder at http://localhost:5173
```

Everything CI runs, you can run:

```bash
pnpm lint          # eslint
pnpm typecheck     # tsc across both packages
pnpm test          # vitest
pnpm build         # renderer tsc emit + builder vite build
pnpm format        # prettier --write .
pnpm test:e2e      # the one Playwright end-to-end; needs a browser (see below)
```

## Tests

Testing is weighted onto the renderer, because it's a pure JSON→string function — the most
testable shape there is — and because it defines the artifact contract. Per-block snapshot
tests plus the three invariant guards live there.

The builder gets tests only where the logic is genuinely tricky (undo/redo, `project.json`
import/export). **There is no coverage target and won't be one** — coverage targets on a
form UI generate busywork PRs.

### The one browser test

`packages/builder/e2e/download.e2e.ts` is the whole of it, and it stays that way. It presses
Download in a real browser, compares the bytes that land on disk to the `srcdoc` the preview
was showing, and then opens that file from `file://` with the network switched off. Those are
the three things jsdom cannot reach; everything else about the builder is tested without a
browser and should stay that way.

It is **not** part of `pnpm test`. Run it once, first time:

```bash
pnpm --filter @linkpage/builder exec playwright install --only-shell chromium
pnpm test:e2e      # builds the builder, serves dist, drives it
```

CI runs it as a separate job on one Node version, so the Node 24/26 matrix keeps its minute.
**A new browser test needs a reason no unit test can cover**, and if this one ever needs a
retry to be green, fix it or delete it — a flaky browser test costs more than the guarantee it
nominally protects, because every future change starts by suspecting itself.

## Hand-authored words — the places we actively want to be corrected

Three tables in this project are hand-authored, checkable only by a person looking at them, and
explicitly provisional: the words the exported page writes, the names of the languages the builder
offers, and the names we give our own colours. All three invite correction on the same terms.

### The words the exported page writes

The exported page writes eight translatable words of its own: the seven weekday abbreviations and
the word for a closed day. Everything else on it is the owner's text. Those eight live in
`packages/renderer/src/locale.ts`, keyed by language tag, and they are vendored rather than
produced by `Intl` — see SPEC.md §2.5 for why, and please read that before proposing `Intl`.

The abbreviations come from Unicode CLDR and can be checked against a version number. **The
word for a closed day cannot.** No locale database holds the word a shop puts on its door, so
each one is hand-authored here, and the only way to check it is to ask someone who speaks the
language. So:

- **If you speak one of the languages in that table and the closed word is not what a business
  in your language would write, please open a PR.** That is the single highest-value
  contribution this file can receive, and "I speak it and this is wrong" is sufficient
  justification — no issue needed first.
- **To add a language**, add its CLDR abbreviated weekday names and the closed word, and say in
  the PR where the closed word comes from. Adding or correcting a language is additive: it does
  not change `project.json`, so it is never a schema version bump (SPEC.md §4.8).
- **A language that is not in the table renders English**, deliberately. A visible limitation
  beats a guess — the wrong word in the owner's own language is worse than the honest foreign
  one.

`AM` and `PM` are the exception and are deliberately English on every page — SPEC.md §2.5 gives
the reason, which is CLDR's own data rather than convenience. Please read it before proposing a
translation for them.

### The names of the languages

The builder's page-language picker shows each language **in that language** — _Cymraeg_, _Ελληνικά_,
_日本語_ — beside the day abbreviations and closed word that choosing it puts on the page. Those
names live in `packages/builder/src/list/languages.ts`.

**They have the same status as the closed word above, and a wrong one costs more.** The closed word
is read on a finished page; an endonym is read by the owner _in order to choose_, so getting it
wrong can send someone to the wrong language.

- **If a language is not called that in its own language, please open a PR.** "I speak it and
  nobody writes it that way" is sufficient justification.
- **Names are builder chrome and are never translated**, and never reach `project.json`.
- A test holds this table against the renderer's vocabularies in both directions, so adding a
  language means adding both.

### The names of the twelve colours

The builder's colour field names its twelve swatches — _Crimson, Raspberry, Grape, Violet,
Cobalt, Teal, Forest, Olive, Amber, Rust, Cocoa, Slate_ — and quotes a hex the owner typed back
as a hex (SPEC.md §3.1). **These names have the same status as the closed word above.** There is
no database of what a colour is called, so each one is hand-authored, and the only way to check
it is for someone to look at the swatch and disagree.

- **If a name is wrong for the colour it sits on, please open a PR.** "That is not raspberry" is
  sufficient justification, exactly as with the closed word.
- **A name is never a schema change.** The names never reach `project.json`, which stores the
  hex, so changing one is not a version bump (SPEC.md §4.2).
- **Names are builder chrome and are not translated.** The builder has no localisation layer;
  `lang` belongs to the exported page. A swatch name sits with _Corner softness_, not with the
  eight words above.
- **Please do not propose computing them from the hex.** It was built and measured before being
  rejected, and SPEC.md §3.1 records why: brown, pink and navy are not hue bands.

## Proposing a change

1. **Open an issue first** for anything beyond a typo or an obvious bug fix. During the
   design phase especially, the decision probably belongs on the map rather than in code.
2. Branch from `main`, keep the change small, and make sure `pnpm lint typecheck test build`
   is green.
3. Describe what a _business owner_ gets out of the change in the PR body. If the answer is
   "developers get a nicer API", that's fine — say so, it just gets weighed differently.

Drive-by state-management refactors of the builder are the one PR type most likely to be
declined on sight. If you want to change how builder state works, open an issue and make the
case first.

## License

By contributing you agree that your contributions are licensed under the
[MIT License](./LICENSE).
