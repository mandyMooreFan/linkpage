/**
 * PROTOTYPE BRANCH — the scaffold shell has been swapped for the issue #5 variant switcher.
 *
 * On `main` this file renders the scaffold placeholder described in issue #9. Here it mounts
 * `src/prototype/`, which is throwaway: four editing-screen variants on one route, switchable
 * with `?variant=A|B|C|D`. When #5 resolves, the winner is rewritten properly and everything
 * under `src/prototype/` is dropped — it lives on this branch, not on `main`.
 */

import { Prototype } from "./prototype/Prototype.js";

export function App() {
  return <Prototype />;
}
