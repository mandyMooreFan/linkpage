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
```

## Tests

Testing is weighted onto the renderer, because it's a pure JSON→string function — the most
testable shape there is — and because it defines the artifact contract. Per-block snapshot
tests plus the three invariant guards live there.

The builder gets tests only where the logic is genuinely tricky (undo/redo, `project.json`
import/export). **There is no coverage target and won't be one** — coverage targets on a
form UI generate busywork PRs.

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
