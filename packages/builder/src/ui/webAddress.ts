import { linkHref } from "@linkpage/renderer";

/**
 * The value half of the permanent `https://` prefix (design change 10, finding B-55).
 *
 * `https://` used to be a **placeholder**, so it vanished the moment the owner typed and someone
 * pasting `mysite.com/menu` got no signal that a scheme was expected. It is a prefix now, sitting
 * on the same ruled line before the box. **What that changes is the value, not only the picture**
 * — a prefix drawn beside a field that still holds the whole address reads
 * `https://https://mysite.com` the first time anyone pastes, which is the same defect with a
 * costume on.
 *
 * So the field is a **composite over one string**: this module says what the line reads (a scheme
 * and a rest) and what a change to the box means for the stored value. Three rules, and each one
 * is a decision rather than an implementation detail:
 *
 * **1. The stored value keeps its scheme.** Nothing is migrated and nothing is re-written on
 * open. `project.json` holds whole addresses, §7.9 decision 4 already stores them *mended*
 * (`mysite.com` stores as `https://mysite.com`), and the renderer builds every `href` from that
 * string. A field that stored the rest and re-attached a scheme at export would be a second
 * opinion about what the owner's address is, and §5.2 has exactly one. **Existing projects
 * therefore need no upgrade**: an address already carrying `https://` simply shows it on the
 * line instead of in the box, and one carrying anything else shows what it carries.
 *
 * **2. A scheme in the box is absorbed by the prefix.** Pasted whole from a browser's address
 * bar — the thing every hint on these screens tells the owner to do — or typed out character by
 * character, `https://` ends up on the line and the box holds the rest. Any of §5.3's four safe
 * schemes, not just `https://`: `linkHref` deliberately leaves an http-only owner alone, and a
 * prefix hard-coded to `https://` would render that owner's field as
 * `https://http://legacy.example`. **The prefix shows what the value carries, and what the field
 * expects only when the value carries nothing.**
 *
 * **3. Nothing is invented.** Where there is no scheme, one is added only where `linkHref` would
 * add it — its host gate, imported rather than re-spelt so the builder and the page cannot
 * disagree about what an address becomes. `@mybakery` and `/menu` stay exactly as typed, so
 * §7.9's mark still has the owner's own text to point at, and an empty box is an empty answer
 * rather than a bare `https://` that would sail past every `url.trim() === ""` gate in the flow.
 *
 * It lives beside the field rather than in `flow/topics.ts` because it is the *field's* model —
 * what the box holds and what typing in it means — and not the project's. What the project does
 * with the string it is handed is unchanged.
 */

/** What the line reads before the owner has told us otherwise. */
export const EXPECTED_SCHEME = "https://";

/**
 * A scheme the line may show, and the whole reason the prefix is not a constant.
 *
 * These are §5.3's four safe schemes, written here because the renderer keeps its own list
 * private; `webAddress.test.ts` holds them against `safeUrl` so the two cannot drift in silence.
 * Anything else — `javascript:` above all — stays in the box in full, where it is visible and
 * where invariant 1 will refuse it, rather than being tucked behind a prefix that makes it look
 * like an ordinary address.
 */
const SHOWN_SCHEME = /^(https?:\/\/|mailto:|tel:)/i;

/** The two the host gate is about. An email address is not a host and never becomes one. */
const WEB_SCHEME = /^https?:\/\//i;

/** One web address, split into what the line shows and what the box holds. */
export interface WebAddress {
  /** On the line, before the box: the scheme the value carries, or the one the field expects. */
  readonly scheme: string;
  /** In the box: everything after it. */
  readonly rest: string;
}

/** What the field draws for a stored value. */
export function splitWebAddress(value: string): WebAddress {
  const carried = SHOWN_SCHEME.exec(value)?.[0];
  if (carried === undefined) return { scheme: EXPECTED_SCHEME, rest: value };
  return { scheme: carried, rest: value.slice(carried.length) };
}

/**
 * What the value becomes when the box now reads `typed`.
 *
 * `previous` is the value the field was showing, and it is here for one case only: an address
 * that already carried a scheme keeps it while the box still looks like a host, so editing the
 * path of `http://legacy.example` does not quietly upgrade it. Edit far enough that the box stops
 * looking like a host and the scheme is dropped rather than kept over nonsense — the same trade
 * `linkHref` makes, and the same escape: typing `http://` again puts it straight back.
 */
export function typedWebAddress(previous: string, typed: string): string {
  if (typed === "") return "";

  const pasted = SHOWN_SCHEME.exec(typed)?.[0];
  if (pasted !== undefined) {
    // Absorbed. A box holding nothing *but* a scheme is still an unanswered field.
    return typed.length === pasted.length ? "" : typed;
  }

  const carried = SHOWN_SCHEME.exec(previous)?.[0];
  if (carried !== undefined && !WEB_SCHEME.test(carried)) return carried + typed;

  /*
   * `linkHref` is asked the *question* — would you put `https://` on the front of this? — rather
   * than used for its answer, and the question has to be asked that precisely: it hands back a
   * half-typed `https:/` unchanged, because that already carries a scheme, and merely checking
   * for a result would then prepend a second one.
   *
   * Its answer is not the value for a second reason: it trims, and the owner may be in the
   * middle of typing. Eating a space as it is typed is mending under their fingers, which is the
   * told-off feeling §7.9 decision 4 exists to remove; the trim belongs to the mend on leaving
   * the box, where it already is.
   */
  const trimmed = typed.trim();
  const looksLikeHost = linkHref(trimmed) === `${EXPECTED_SCHEME}${trimmed}`;
  if (carried !== undefined) return looksLikeHost ? carried + typed : typed;

  return looksLikeHost ? `${EXPECTED_SCHEME}${typed}` : typed;
}
