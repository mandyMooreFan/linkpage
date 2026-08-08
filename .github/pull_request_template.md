## What this changes

<!-- One or two sentences. Link the issue this came from — for anything beyond a typo or an
     obvious bug fix, there should be one. -->

Closes #

## What a business owner gets out of it

<!-- If the honest answer is "nothing directly, it's a developer-facing cleanup", say that.
     It isn't disqualifying, it just gets weighed differently. -->

## Checklist

- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` are green
- [ ] No new dependency in `packages/renderer` (its `dependencies` block is still empty)
- [ ] Nothing added to the exported page that needs JavaScript or a network fetch
- [ ] No existing test was weakened to make this fit
