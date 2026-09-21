/**
 * What the checker could not decide, and why (`SPEC.md` §7.12; #421).
 *
 * **Separated from `a11y-sweep.mjs` so it can be tested**, the way `census.mjs`, `port.mjs` and
 * `stability.mjs` already are: the sweep itself opens a browser and walks 76 screens, and these
 * are pure functions over what axe handed back.
 *
 * **Why this module exists at all.** The report used to print an undecided reading as a rule id
 * and a count — `color-contrast — on 55 of 76` — and nothing else, while holding axe's element,
 * its own stated reason, and every node. #318 recorded *"nobody has looked at why"* and it stood
 * for a month; #415 answered it only by writing a throwaway script to re-walk the same route and
 * recover what this report had already been given and dropped. **A number with nothing beside it
 * is one nobody looks at twice**, which is also how the count went from 11 to 55 unseen.
 */

/** Matches `nodeLines`' cap, and for its argument: a wall nobody reads prints nothing. */
export const NODE_CAP = 8;

/**
 * Pluralise a count.
 *
 * It lives here because this is the module that made it shared — `a11y-sweep.mjs` had it inside
 * `report()` and the undecided printer needed it too, and a second copy is the failure
 * `controls.test.ts` exists to catch one layer down.
 */
export const one = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

/**
 * axe's own reason for giving up on a node, which is the thing worth grouping by (#421).
 *
 * It lives in `data.messageKey` on whichever of the three check arrays actually ran — `any` for
 * `color-contrast`, and not always `any` for other rules — so all three are searched rather than
 * the first one guessed at. A check that gives no key is reported under its own id, because
 * "undecided for a reason we did not print" is the failure this whole change exists to end.
 */
export function undecidedReason(node) {
  for (const check of [...(node.any ?? []), ...(node.all ?? []), ...(node.none ?? [])]) {
    if (check?.data?.messageKey) return check.data.messageKey;
  }
  return node.any?.[0]?.id ?? "no reason given";
}

/**
 * **There are no colours to print, and that was checked rather than assumed** (#421).
 *
 * The obvious thing to put beside the selector is the ratio, and it cannot be done: every one of
 * axe 4.13's undecided payloads is keys-only — `this.data({ messageKey: 'pseudoContent' })` and
 * its siblings — and not one of them carries `fgColor`, `bgColor` or `contrastRatio`. Checked
 * against its source and confirmed on a live run: 253 undecided elements across five reasons,
 * zero colours available. **That is what undecided means here** — axe stopped before it resolved
 * a background, so there is no number it is withholding. Getting one means removing the
 * obstruction and re-running, which is what #415 did by hand.
 *
 * A printer for colours was written before this was checked and is deliberately not kept: a
 * column that is always blank reads as a defect in the report rather than a fact about the
 * checker.
 */

/**
 * One undecided rule, broken down by why (#421).
 *
 * **Grouped by reason and not by screen**, because the reason is what a person can act on: the
 * fifty-five screens `color-contrast` could not judge are five reasons, and four of them turned
 * out to be axe correctly declining rather than anything wrong (#416).
 *
 * **Capped like `nodeLines`, and for the same argument** — a hundred and one clipped language
 * rows printed in full is a wall nobody reads, which is the same failure as printing nothing.
 */
export function undecidedLines(nodes, screensByNode, cap = NODE_CAP) {
  const byReason = new Map();
  for (const node of nodes) {
    const reason = undecidedReason(node);
    const entry = byReason.get(reason) ?? { count: 0, targets: new Set(), screen: undefined };
    entry.count += 1;
    entry.screen ??= screensByNode.get(node);
    entry.targets.add(node.target.join(" "));
    byReason.set(reason, entry);
  }

  const lines = [];
  for (const [reason, entry] of [...byReason].sort((a, b) => b[1].count - a[1].count)) {
    const where = entry.screen === undefined ? "" : `, e.g. ${entry.screen}`;
    lines.push(`      ${reason} — ${one(entry.count, "element")}${where}`);
    for (const target of [...entry.targets].slice(0, cap)) lines.push(`        ${target}`);
    if (entry.targets.size > cap) {
      lines.push(`        … and ${entry.targets.size - cap} more elements`);
    }
  }
  return lines;
}
