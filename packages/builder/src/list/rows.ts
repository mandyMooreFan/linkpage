import { hoursView, socialLabel, vocabulary, type Hours } from "@linkpage/renderer";
import { colourName } from "../flow/index.js";
import { uncoveredTopics } from "../flow/plan.js";
import { TOPIC_LABELS, TOPICS, type Topic } from "../flow/topics.js";
import type { Draft } from "../project/index.js";
import { rowMark } from "../project/unusable.js";
import { MODE_LABELS, SHAPE_LABELS } from "./labels.js";

/**
 * What the review list is a list *of*. `SPEC.md` §7.4, §7.1, §4.3.
 *
 * > **Every answer is a row.**
 *
 * And the corollary this module exists to make mechanical: **a row and an offer are the same
 * question answered two ways.** The list has two halves — the rows for what the page has, and
 * the tick-ons for what it has not — and if those two halves ever disagreed, the gap between
 * them would be exactly the half-filled row §7.1 built the whole two-screens rule to prevent.
 *
 * So they are not two lists. `uncovered` is `uncoveredTopics(draft)` — the flow's own function,
 * over `hasContent`, the door's own predicate — and `rows` is its complement over `TOPICS`. The
 * list has no opinion about what is filled in; it asks the flow, and it asks once.
 *
 * **Three rows are not topics.** The business name, _How it looks_ and the page's language are
 * not things an owner can decline, so they are not territory the flow can re-enter for and they
 * are always present. They are still rows, because §7.4 says every answer is one.
 *
 * **This is also all §4.3 needs.** "Any field defaulted during a version upgrade appears here as
 * an ordinary row" is not a feature anybody implements here: the rows are derived from the draft
 * as it stands, so a field an upgrade defaulted on load is on the list for the same reason a
 * field the owner typed is. There is nothing to remember to add, which is what keeps "loads
 * silently" from meaning "loads invisibly".
 */

/**
 * A row's identity. Every `Topic`, plus the three that are always there.
 *
 * The name is spelled `header.name`-ish rather than `name` because `name` is also a `Topic`-
 * adjacent word in the flow's vocabulary; keeping them distinct means a row id is never
 * accidentally a topic.
 */
export type RowId = Topic | "businessName" | "style" | "lang";

export interface Row {
  readonly id: RowId;
  /** What the row is, named as the thing rather than as the act (see `TOPIC_LABELS`). */
  readonly label: string;
  /**
   * The answer, in one line.
   *
   * Never empty on a row that is showing, which is a property rather than a convention: a
   * topic row exists only when `hasContent` says so, and the three that are always there are
   * always filled in.
   */
  readonly summary: string;
  /**
   * A colour to show beside the summary, when the row is about one (§7.4).
   *
   * Markup rather than a character in `summary`, because the dot **carries the colour for anyone
   * who can see it while the name carries it for anyone who cannot** — so it is decorative and
   * takes no accessible name of its own. A `●` in the string would be read aloud as a word.
   */
  readonly swatch?: string;
  /**
   * §7.9's mark: one quiet line saying this row holds something the page cannot use.
   *
   * **This is the decision that stops _never blocks_ from meaning _never notices_** (§7.9
   * decision 5). It is derived from the very functions the renderer uses, so the builder and the
   * page can never disagree about whether a target exists.
   */
  readonly mark?: string;
}

/** The list, in the order it is read: the page's own order (§2.1), then the two settings rows. */
export interface ListRows {
  readonly rows: readonly Row[];
  /** What the list offers to re-enter the flow for (§7.1). The complement of the topic rows. */
  readonly uncovered: readonly Topic[];
}

/** The three rows that are not topics, in the places they sit among them. */
const BUSINESS_NAME_LABEL = "Business name";
const STYLE_LABEL = "How it looks";
const LANG_LABEL = "Page language";

export function listRows(draft: Draft): ListRows {
  const uncovered = uncoveredTopics(draft);
  // The complement, computed rather than tested for a second time. This is the whole of the
  // "one opinion about what is filled in" claim, and `rows.test.ts` holds it as a partition.
  const covered = TOPICS.filter((topic) => !uncovered.includes(topic));

  const rows: Row[] = [
    { id: "businessName", label: BUSINESS_NAME_LABEL, summary: draft.header.name ?? "" },
    ...covered.map((topic) => {
      const mark = rowMark(draft, topic);
      return {
        id: topic,
        label: TOPIC_LABELS[topic],
        summary: topicSummary(draft, topic),
        ...(mark === undefined ? {} : { mark }),
      };
    }),
    { id: "style", label: STYLE_LABEL, summary: styleSummary(draft), swatch: draft.style.brand },
    { id: "lang", label: LANG_LABEL, summary: draft.lang ?? "" },
  ];

  return { rows, uncovered };
}

/** Joined with a middle dot, which reads as "and also" without claiming a grammar. */
function join(parts: readonly (string | undefined)[]): string {
  return parts.filter((part) => part !== undefined && part.trim() !== "").join(" · ");
}

/**
 * The hours row, with the times (§7.4).
 *
 * **Built from the renderer's own `hoursView`**, so the row and the page beside it cannot
 * disagree about which days are shown or how a time reads — the same discipline §7.10's box
 * follows, for the same reason.
 *
 * **Uncollapsed, and that is §2.3's decision rather than an oversight.** `Mon–Fri` would cost
 * nothing here — the builder has no localisation layer, no §6.5 budget and no determinism
 * guarantee — and was rejected on adjacency: the page preview sits beside this list, so a
 * collapsed row against five rows in the preview reads as the page being broken.
 *
 * Paper is what makes this affordable: §7.4 chose it partly because a carded direction clipped
 * this very row, and a summary that is allowed to wrap can hold seven days and a note.
 */
function hoursSummary(hours: Hours | undefined, lang: string | undefined): string {
  if (hours === undefined) return "";
  const view = hoursView(hours, vocabulary(lang));
  if (view === undefined) return "";

  const days = view.rows.map((row) =>
    row.intervals.length === 0
      ? `${row.label} ${view.closed}`
      : `${row.label} ${row.intervals.join(", ")}`,
  );
  return join([...days, view.note]);
}

/**
 * One line per topic, saying what the owner said.
 *
 * Deliberately the owner's own words wherever there are any — the labels of their buttons, the
 * lines of their address — rather than a count. A row reading "3 buttons" would make the list an
 * index of the page; §7.4 wants it to *be* the page's answers.
 */
export function topicSummary(draft: Draft, topic: Topic): string {
  switch (topic) {
    case "tagline":
      return draft.header.tagline ?? "";

    case "logo": {
      const logo = draft.header.logo;
      if (logo === null) return "";
      return logo.width > 0 && logo.height > 0 ? `${logo.width} × ${logo.height}` : "Added";
    }

    case "links":
      return draft.links.map((link) => link.label).join(", ");

    case "hours":
      return hoursSummary(draft.hours, draft.lang);

    case "contact":
      return join([draft.contact?.phone, draft.contact?.email]);

    case "address":
      return join([(draft.address?.lines ?? []).join(", "), draft.address?.directionsUrl]);

    case "social":
      // An unrecognised platform is the owner's own word and is shown as they wrote it
      // (§4.4): `socialLabel` answers `""` for anything it has no mark for.
      return (draft.social ?? [])
        .map((entry) => socialLabel(entry.platform) || entry.platform)
        .join(", ");
  }
}

/**
 * The style row's line: the colour the owner gave, and the two words that describe the rest.
 *
 * The brand colour is shown as they typed it (§3.3, "honoured exactly") rather than as the
 * derivation's version of it — the row reports the answer, and the page beside it reports what
 * was made of the answer.
 */
export function styleSummary(draft: Draft): string {
  const style = draft.style;
  // Three of the six controls, not all six (§7.4). The row's job is recognition, the page preview
  // sits beside it, and six parts is an inventory that wraps on the screen §7.6 calls primary.
  //
  // **Our name for one of ours, their code for one of theirs** (§3.1) — a typed hex is quoted back
  // rather than being told what it is called.
  return join([colourName(style.brand ?? ""), SHAPE_LABELS[style.shape], MODE_LABELS[style.mode]]);
}
