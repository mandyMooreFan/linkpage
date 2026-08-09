/**
 * The review list: the screen the owner lives on after the flow. `SPEC.md` §7.4.
 *
 * > **Every answer is a row, and the page sits beside it.**
 *
 * **What a screen needs from here is one component:**
 *
 * ```tsx
 * <List draft={draft} onChange={store.update} onAdd={(topic) => setRequest([topic])} />
 * ```
 *
 * `onAdd` is the seam back into the flow (§7.1) and is the only thing this screen cannot do for
 * itself: **the flow re-enters for anything new; the list holds everything that already
 * exists.**
 *
 * **The layering, and the rule each layer keeps:**
 *
 * - `rows.ts` — what the list is a list of. Derived from `uncoveredTopics`, so **the rows and
 *   the tick-ons are one partition of the topics** and the list has no second opinion about
 *   what is filled in. It is also all §4.3 needs: a field defaulted on load is a row because
 *   the rows are read off the draft.
 * - `edits.ts` — the writes that are not answers to a question. `removeTopic` is the mirror of
 *   the door in `topics.ts`: after it, `hasContent` is false, so **removing and never having
 *   are one state** rather than two.
 * - `contrast.ts` — the advanced tier's numbers. **Reports contrast and nothing else** (§3.4):
 *   there is no threshold, no verdict and no boolean in the return type to make one out of.
 * - `StyleStep.tsx` / `Advanced.tsx` — §3.1's six controls, with the disclosure at their foot.
 * - `LinkButtons.tsx` — §7.5's arrows, and the marked top slot that makes §2.3's
 *   emphasis-by-position visible instead of implicit.
 * - `List.tsx` — the screen. Rows open the *flow's own questions*, so editing hours a month
 *   later is the hours question rather than a second form that could drift from it.
 */

export { List } from "./List.js";
export type { ListProps } from "./List.js";

export { listRows, styleSummary, topicSummary } from "./rows.js";
export type { ListRows, Row, RowId } from "./rows.js";

export {
  clearAccent,
  moved,
  removeTopic,
  setAdvancedEnabled,
  setLang,
  setLinks,
  setOverride,
  setStyle,
  withoutAt,
} from "./edits.js";

export { formatRatio, readout, ROLE_LABELS } from "./contrast.js";
export type { Readout, Reading, Role } from "./contrast.js";
