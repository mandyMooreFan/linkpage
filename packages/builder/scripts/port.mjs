/**
 * The port a review-shots run serves on, derived from its label.
 *
 * Its own file because it is the one piece of `review-shots.mjs` worth asserting: the script
 * imports Playwright and takes minutes to run, and this is pure arithmetic that decides
 * whether two concurrent runs can see each other.
 *
 * **Why it is derived and not simply flagged.** The port was pinned at 4318 for every run,
 * which was fine while the map was walked one ticket at a time and quietly wrong the moment
 * it was not. `vite preview --strictPort` does exit when the port is taken, but the spawn
 * discards its output and the wait loop cannot tell *whose* server answered — so a second
 * concurrent run photographed the first run's branch and produced a before/after pair that
 * was byte-identical.
 *
 * That is the one wrong answer a review ritual must never give. It does not look like a
 * failure, it looks like "the change did nothing" — confidently wrong rather than broken, so
 * nobody goes looking. A `--port` flag alone would not have helped: it makes the safe path
 * something you have to know about, and the person who most needs it is the one who has not
 * been bitten yet. Deriving it means a run is private by construction.
 *
 * 4173 is outside the range by construction — the e2e owns that one, so both can run at once.
 */
export function portFor(label) {
  let h = 2166136261; // FNV-1a, enough to spread a handful of branch names
  for (let i = 0; i < label.length; i++) {
    h ^= label.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return 4400 + ((h >>> 0) % 400);
}
