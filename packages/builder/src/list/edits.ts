import type { Link } from "@linkpage/renderer";
import { addLink, type Topic } from "../flow/topics.js";
// Straight from the module rather than the barrel: this file has no need of a browser, and the
// barrel carries the `<img>`/`<canvas>` codec with it.
import { clearLogo } from "../logo/apply.js";
import type { Draft, DraftStyle } from "../project/index.js";

/**
 * The edits only the list can make. `SPEC.md` §7.4, §7.5, §7.1, §3.4.
 *
 * `topics.ts` is the door an *answer* comes through, and it only ever adds: it exists so that a
 * section with nothing in it cannot be written. This module is the other half of the same rule,
 * for the screen that holds what already exists —
 *
 * > **A ticked-but-empty section is not a state that exists.**
 *
 * — which cuts both ways. An owner who no longer has a phone number must be able to say so, and
 * the only coherent way to say it is that the section goes: `answerSection` would silently keep
 * the old value rather than write an empty one, so *editing a section down to nothing* is not
 * the removal. `removeTopic` is, and after it `hasContent` is false, which puts the topic back
 * among the things the flow can be re-entered for. **Removing and never having are the same
 * state**, in the file and on the screen, and `edits.test.ts` holds that as a round trip.
 *
 * The rest is §7.5's reordering and the style controls, and both are here for the same reason:
 * they are the only writes in the builder that are not answers to a question.
 */

/**
 * Drop a key, rather than setting it to `undefined`.
 *
 * The difference reaches the file: `writeDraft` deletes a key whose value is absent from the
 * draft, and an own property holding `undefined` is a different thing from a property that is
 * not there — one of them survives a `structuredClone` and a `Object.keys`, and the store
 * compares drafts. The one cast is the shape TypeScript cannot express: deleting a required key
 * makes the value an `Omit` of itself.
 */
function without<T extends object, K extends keyof T>(value: T, key: K): Omit<T, K> {
  const rest: Partial<T> = { ...value };
  delete rest[key];
  return rest as Omit<T, K>;
}

/**
 * Take a topic off the page.
 *
 * The inverse of the door in `topics.ts`, and it is written against the same predicate: every
 * branch below leaves the draft in a state `hasContent` reads as empty, which is what makes the
 * topic reappear among the tick-ons rather than needing the list to remember it went.
 *
 * `links` empties rather than deletes because §4.1 has no absent `links` — the section always
 * renders, with nothing in it.
 */
export function removeTopic(draft: Draft, topic: Topic): Draft {
  switch (topic) {
    case "tagline":
      return { ...draft, header: without(draft.header, "tagline") };
    case "logo":
      // #31's own door, which already knows a logo that is not there is nothing to remove.
      return clearLogo(draft);
    case "links":
      return { ...draft, links: [] };
    case "hours":
      return without(draft, "hours");
    case "contact":
      return without(draft, "contact");
    case "address":
      return without(draft, "address");
    case "social":
      return without(draft, "social");
  }
}

/**
 * The link buttons, in the order the owner put them (§7.5, §2.3).
 *
 * Rebuilt through `addLink` rather than assigned, so the list cannot write a button the flow
 * could not: **a button exists only once it has a URL** (§7.3), and one rule enforcing it means
 * a row being typed into is missing from the page until it has somewhere to point — which is
 * the rule, visible, rather than the rule quietly not applying on this screen.
 */
export function setLinks(draft: Draft, links: readonly Link[]): Draft {
  return links.reduce<Draft>((next, link) => addLink(next, link), { ...draft, links: [] });
}

/**
 * One entry moved up or down (§7.5).
 *
 * **Arrows, and no drag-and-drop, in v1 or planned.** Drag's advantage only appears at a length
 * this list never reaches, and its failure mode — a finger dragging inside a scrolling column
 * while the browser guesses between "move this" and "scroll the page" — is precisely wrong for
 * a phone-first editor. Two buttons per row are also the keyboard path, which drag would have
 * needed building anyway.
 *
 * Out of range is a no-op rather than a wrap: the first button has no up and the last has no
 * down. The screen disables those arrows, and the rule lives here as well so that it does not
 * depend on the screen being right.
 */
export function moved<T>(list: readonly T[], from: number, to: number): readonly T[] {
  if (from === to) return list;
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return list;

  const next = [...list];
  const [entry] = next.splice(from, 1);
  if (entry === undefined) return list;
  next.splice(to, 0, entry);
  return next;
}

/** One entry dropped. The order of the rest is untouched, which is the emphasis (§2.3). */
export function withoutAt<T>(list: readonly T[], at: number): readonly T[] {
  return at < 0 || at >= list.length ? list : list.filter((_entry, index) => index !== at);
}

/**
 * Change one or more of the six style controls (§3.1).
 *
 * Only what is named is written, so the advanced tier's object survives every touch of the six
 * — §3.4 requires it to be **persisted even when disabled**, and the way to keep that true is
 * never to rewrite `style` wholesale.
 */
export function setStyle(draft: Draft, patch: Partial<DraftStyle>): Draft {
  return { ...draft, style: { ...draft.style, ...patch } };
}

/** Clear the optional second colour. Absent, not empty: `""` is not a colour anybody chose. */
export function clearAccent(draft: Draft): Draft {
  return { ...draft, style: without(draft.style, "accent") };
}

/**
 * Turn the advanced tier on or off (§3.4).
 *
 * **The colours are not touched.** Switching the panel off and saving must not silently destroy
 * the owner's manual work, and switching it back on must return that work intact — which is why
 * this writes one boolean and why `derivePalette` reads the object only when it is enabled.
 */
export function setAdvancedEnabled(draft: Draft, enabled: boolean): Draft {
  return setStyle(draft, { advanced: { ...draft.style.advanced, enabled } });
}

/**
 * Set or clear one hand-set colour.
 *
 * A blank box is the absence of an override rather than an override of nothing, so the key goes
 * and the derivation is what shows through again — which is what makes the layer *losslessly
 * reversible* one role at a time as well as all at once.
 */
export function setOverride(draft: Draft, role: string, value: string): Draft {
  const colors = { ...draft.style.advanced.colors };
  if (value.trim() === "") delete colors[role];
  else colors[role] = value.trim();
  return setStyle(draft, { advanced: { ...draft.style.advanced, colors } });
}

/**
 * The page's language (§4.1).
 *
 * Filled from the browser at first run and never asked for, which is exactly why it is a row:
 * §4.3's rule is that a field defaulted on load is visible on the list, and a language guessed
 * from the browser is the one field v1 already guesses. A blank one is not an answer — WCAG 2.2
 * SC 3.1.1 wants `<html lang>` to say something.
 */
export function setLang(draft: Draft, lang: string): Draft {
  const value = lang.trim();
  return value === "" ? draft : { ...draft, lang: value };
}
