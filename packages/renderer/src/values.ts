/**
 * The defensive readers the renderer reads `project.json` through.
 *
 * **The renderer is total and never throws** (`SPEC.md` §4.7). It cannot hold a schema library
 * (§5.1), so instead of validating up front it reads every field through one of these: each
 * takes `unknown`, and a missing, wrong-typed or unrecognised value comes back as absent
 * rather than as an exception. That is what keeps a hand-edited file a slightly wrong page
 * instead of a blank `srcdoc` preview (§5.2).
 *
 * **Nothing here ever calls `String(value)`.** Coercion would turn "wrong type" into "some
 * text we invented", which is the opposite of §4.4's rule, and it is reachable: an object with
 * a throwing `toString` is a canary in `invariants.test.ts` precisely so this stays true.
 */

/**
 * A plain object, or `undefined`.
 *
 * Arrays and `null` are not records. A null-prototype object is — `JSON.parse` can produce one
 * with `__proto__` in the source text, and it reads like any other object.
 */
export function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

/** The array, or an empty one. A non-array is absent, and absent is "nothing to render". */
export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * A non-empty string with its surrounding whitespace removed, or `undefined`.
 *
 * Trimming is the one normalisation this file does, because a field holding `"   "` is a field
 * the owner left blank, and rendering it produces an empty element with a name that implies
 * content.
 */
export function asText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * One of `allowed`, or `fallback`.
 *
 * This is §4.4's rule for the preference half of the enum families: `shape`, `type`, `mode`,
 * `clock` and `weekStart` hold a preference with no authored content behind them, so an
 * unrecognised value renders as the default. The original survives in `project.json` through
 * the builder's raw-object merge (§4.5), so a newer version restores the choice intact.
 */
export function asEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

/** A finite positive integer, or `undefined`. Used for the logo's intrinsic dimensions. */
export function asPositiveInt(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const rounded = Math.round(value);
  return rounded > 0 ? rounded : undefined;
}
