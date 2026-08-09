import type { IconName } from "@linkpage/renderer";
import { missingRequired, type Draft } from "../project/index.js";
import { findPreset, type PresetId } from "./presets.js";
import { hasContent, TOPICS, type Topic } from "./topics.js";

/**
 * **The seam.** Which screen the owner is on, and which questions the flow has left.
 * `SPEC.md` §7.1, §7.2, §4.6.
 *
 * > **The flow re-enters for anything new; the list holds everything that already exists.**
 *
 * The wizard is not a first-run device that never returns — it is the mechanism for territory
 * the owner has not covered yet. Everything about that rule is in this file, as two pure
 * functions and no state:
 *
 * - **`flowEntry(draft)`** decides which screen owns the window. `null` means the list. It has
 *   exactly two ways of saying "the flow", and they are the two moments §7.1 describes: there
 *   is no project at all, or there is one that is missing something required. The second is why
 *   an imported file with no `style.brand` walks the owner through the colour question "as if
 *   they had ticked a new section" (§4.6) instead of producing an error.
 * - **`planSteps(...)`** turns an entry into a list of screens. It is a function of the entry,
 *   the draft, the chosen preset and the links picked so far — and of nothing else, which is
 *   what lets the whole multi-screen sequence be tested without a DOM.
 *
 * **Re-entry is the same code path as first run.** Ticking _opening hours_ on the list a month
 * later builds `{ kind: "add", topics: ["hours"] }`, which plans the same hours step the flow
 * would have run on day one, and returns the owner to the list when it is answered. There is no
 * second wizard and no "edit hours" screen, because there is nothing for a second one to do.
 *
 * **The preset question is in the plan for the first moment only.** `kind: "add"` never
 * includes it, so it is one-time and unreachable once the list is reached (§7.3) — not because
 * a control is hidden, but because nothing constructs the step. While the flow is still
 * running, `Back` reaches it and re-choosing it re-plans, since a preset only ever selected
 * which questions come next.
 */

/**
 * How the flow was entered.
 *
 * The two constructors are not two modes of one screen; they are §7.1's two moments. The flow
 * behaves identically in both apart from the preset question, which only the first has.
 */
export type FlowEntry =
  /** There is no project. The flow **is** the empty state (§7.1), so it opens on the preset. */
  | { readonly kind: "empty" }
  /**
   * Territory the owner has not covered: a section ticked on the list, or a required field an
   * imported file did not have (§4.6). `topics` may be empty — the required questions are
   * planned from the draft, not named here.
   */
  | { readonly kind: "add"; readonly topics: readonly Topic[] };

/**
 * Which screen owns the window.
 *
 * `lang` is deliberately not a reason to run the flow. It is the one required field that is
 * not a question: §4.1 fills it from the browser's language at first run, so a file arriving
 * without one needs the caller's environment rather than the owner's attention (see
 * `answerLang`).
 */
export function flowEntry(draft: Draft | null): FlowEntry | null {
  if (draft === null) return { kind: "empty" };
  const missing = missingRequired(draft).filter((field) => field !== "lang");
  return missing.length > 0 ? { kind: "add", topics: [] } : null;
}

/**
 * What the list offers to re-enter the flow for (§7.1, §7.4).
 *
 * The same `hasContent` the door in `topics.ts` uses, asked of the whole draft. Sharing it is
 * what keeps the list's tick-boxes and the file's contents in agreement: a section the list
 * offers is a section the file does not have, because both sentences are the one predicate.
 */
export function uncoveredTopics(draft: Draft): Topic[] {
  return TOPICS.filter((topic) => !hasContent(draft, topic));
}

/**
 * A link button the owner has said they have, before they have said where it goes.
 *
 * This is the pick-list's currency and it is not a `Link`: it has no URL, and **a button
 * exists only once it has a URL** (§7.3). Nothing turns a pick into a link except the screen
 * that asks for the destination, so a pick-list is not a set of pre-created rows however long
 * the owner leaves it sitting there.
 */
export interface Pick {
  /** Unique within one run of the link step; the free entries get counted ids. */
  readonly id: string;
  readonly label: string;
  readonly icon?: IconName;
}

/** One screen. One question. */
export type Step =
  | { readonly id: "preset" }
  | { readonly id: "name" }
  | { readonly id: "tagline" }
  | { readonly id: "logo" }
  | { readonly id: "brand" }
  | { readonly id: "links" }
  | { readonly id: "linkUrl"; readonly pick: Pick }
  | { readonly id: "hours" }
  | { readonly id: "contact" }
  | { readonly id: "address" }
  | { readonly id: "social" };

export interface PlanInput {
  readonly entry: FlowEntry;
  /** The project as it was when the flow opened — not as it is now; see the note below. */
  readonly draft: Draft | null;
  /** `null` until step one is answered. Only ever set on a `kind: "empty"` entry. */
  readonly preset: PresetId | null;
  /** What the link step has collected so far. Empty until it is answered. */
  readonly picks: readonly Pick[];
}

/**
 * The screens, in order.
 *
 * **Planned against the draft the flow opened with, not the draft as it stands.** Answering
 * "what's it called?" must not delete the step that asked, or `Back` would walk into a hole —
 * so the caller holds the opening draft still and re-plans only when the preset or the picks
 * change. Both of those are answers about *what to ask*, which is exactly what a plan is.
 *
 * The order is fixed and it is the page's own (§2.1): what the page cannot do without, then
 * the buttons, then the four optional sections top to bottom. An owner watching the preview
 * fill in beside them sees it fill downwards.
 */
export function planSteps({ entry, draft, preset, picks }: PlanInput): Step[] {
  const steps: Step[] = [];

  if (entry.kind === "empty") {
    steps.push({ id: "preset" });
    // Nothing is planned past step one until step one is answered: the preset is what decides
    // which of the four optional steps exist at all.
    if (preset === null) return steps;
  }

  // Required, and collected here rather than reported (§4.6). A project that has them already
  // is not asked again — which is the whole difference between an import and a first run.
  if (draft === null || draft.header.name === undefined) steps.push({ id: "name" });

  const requested: readonly Topic[] =
    entry.kind === "empty"
      ? // A preset chooses among the four sections and nothing else (§7.3). The three that are
        // not sections are asked of everybody, because no business type makes a tagline, a logo
        // or a link button more or less likely.
        ["tagline", "logo", "links", ...findPreset(preset ?? "other").sections]
      : entry.topics;

  const wanted = (topic: Topic): boolean => requested.includes(topic);

  if (wanted("tagline")) steps.push({ id: "tagline" });
  if (wanted("logo")) steps.push({ id: "logo" });

  // After the header, because a colour is easier to judge against a page with the owner's own
  // words already in it — and before the buttons, because that is where it starts showing.
  if (draft === null || draft.style.brand === undefined) steps.push({ id: "brand" });

  if (wanted("links")) {
    steps.push({ id: "links" });
    // One screen per pick, in the order they were picked. Skipping one writes no button and
    // leaves the plan alone, so the count of screens does not change under the owner's feet.
    for (const pick of picks) steps.push({ id: "linkUrl", pick });
  }

  // Page order, and de-duplicated: a caller that asks twice for hours gets one hours step.
  for (const section of ["hours", "contact", "address", "social"] as const) {
    if (wanted(section)) steps.push({ id: section });
  }

  return steps;
}
