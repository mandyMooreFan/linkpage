/**
 * The guided flow. `SPEC.md` §7.1–§7.3, §7.6, §7.8, §7.9.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 * >
 * > **The flow re-enters for anything new; the list holds everything that already exists.**
 *
 * The wizard is not a first-run device that never returns — it is the mechanism for territory
 * the owner has not covered yet. An owner who skipped opening hours and comes back to add them
 * ticks the box, and the flow picks them up, walks them through hours, and puts them back on
 * the list. One mental model instead of two: **you never face a blank field you weren't walked
 * into.**
 *
 * **What a screen needs from here is four things:**
 *
 * ```tsx
 * const entry = flowEntry(snapshot.draft);          // null means the list owns the window
 * entry ? <Flow entry={entry} draft={snapshot.draft} … /> : <List … />
 *
 * uncoveredTopics(draft)                            // what the list offers to re-enter for
 * <Flow entry={{ kind: "add", topics: ["hours"] }} … />   // and how it does
 * ```
 *
 * **The layering, and the two rules it exists to make mechanical:**
 *
 * - `presets.ts` — §7.3's table, and nothing else. A preset selects which optional section
 *   steps run and which link suggestions appear; it touches no `style` field, writes no word
 *   that is a claim about the business, and **leaves no trace in `project.json`** — which is
 *   true because the chosen preset lives in `Flow`'s state and is never handed to a `Draft`.
 * - `topics.ts` — **the one door an answer passes through.** A section reaches a draft only
 *   with content in it, and a link button only with a URL, so **a ticked-but-empty section is
 *   not a state that exists** and nothing without a destination reaches the list, the file or
 *   the page. Not a rule a screen has to keep: there is no argument that makes the door write
 *   an empty one.
 * - `plan.ts` — **the seam.** Which screen owns the window, and which questions are left.
 * - `Flow.tsx` / `questions/` — one question per screen, with the page filling in beside it.
 */

export { Flow } from "./Flow.js";
export type { FlowProps } from "./Flow.js";

export { flowEntry, planSteps, uncoveredTopics } from "./plan.js";
export type { FlowEntry, Pick, PlanInput, Step } from "./plan.js";

export { findPreset, PRESETS } from "./presets.js";
export type { Preset, PresetId, Suggestion } from "./presets.js";

export {
  addLink,
  answerBrand,
  answerLang,
  answerName,
  answerSection,
  answerTagline,
  hasContent,
  SECTIONS,
  TOPIC_LABELS,
  TOPICS,
  WEEKDAYS,
} from "./topics.js";
export type { Section, SectionAnswer, Topic } from "./topics.js";

export { BRAND_SWATCHES, colourName, type Swatch } from "./questions/ColourQuestion.js";
