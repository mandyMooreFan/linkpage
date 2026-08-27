import { hoursView, vocabulary, type Hours } from "@linkpage/renderer";
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
   * **What is there, in one line — not what it says** (§7.4, #253).
   *
   * One *line*, and it is one because of what it contains rather than because anything cuts it
   * off: a row holding a list of things reports how many. See `topicSummary`.
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
 * `n things`, with the singular kept.
 *
 * A list of one is an ordinary state on every row that counts — one link button, one account,
 * one day open — and `1 accounts` is the tell that a tool is talking to itself rather than to
 * the person reading it (§7.4's owner is not a developer).
 */
function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The hours row: **how many days the page says you are open** (§7.4).
 *
 * **Built from the renderer's own `hoursView`**, so the row and the page beside it cannot
 * disagree about which days there are — the same discipline §7.10's box follows, for the same
 * reason. The page's language still decides that reading, and no longer decides a word of this
 * row: what the row says is now the tool's own English, like every label around it.
 *
 * **It showed the times until [#245](https://github.com/mandyMooreFan/linkpage/issues/245), and
 * the argument that kept them has not changed — it has stopped reaching.** §2.3 refused to
 * collapse the row to `Mon–Fri` on *adjacency*: the page preview sits beside this list, and a
 * collapsed run against five rows in the preview reads as the page being broken. That objection
 * is about a **smaller copy** of the block next door. _Open 7 days_ is not a copy of the hours
 * block any more than `1200 × 400` is a copy of the logo, so nothing in the preview contradicts
 * it. The page's own rows are still never collapsed; §2.3's refusal is untouched.
 *
 * **Three states, because the block has three.** Days with times; days that are all *closed*,
 * which is a thing the owner said (§2.3) and not an absence; and — reachable only from a
 * hand-edited file (§4.5) — a note with no days under it at all.
 *
 * *No days open* rather than *closed every day*: an owner can mark Sunday closed and leave the
 * rest unspecified, and the page then claims nothing about Monday. The row must not either.
 */
function hoursSummary(hours: Hours | undefined, lang: string | undefined): string {
  if (hours === undefined) return "";
  const view = hoursView(hours, vocabulary(lang));
  if (view === undefined) return "";

  // The row is showing because *something* is in the block, and with no day in it this is what
  // that something is. `hoursView` only answers at all when there is a day or a note.
  if (view.rows.length === 0) return "Just a note";

  const open = view.rows.filter((row) => row.intervals.length > 0).length;
  return join([
    open === 0 ? "No days open" : `Open ${count(open, "day", "days")}`,
    // Said to be there, never quoted: the note is free text and the one thing on this row with
    // no ceiling on its length (§2.3 keeps it for what structure cannot model).
    view.note === undefined ? undefined : "a note",
  ]);
}

/**
 * One line per topic, saying **what is there rather than what it says** ([#253](https://github.com/mandyMooreFan/linkpage/issues/253), §7.4).
 *
 * A row whose answer is a **list of things** reports how many there are — *12 link buttons*,
 * *Open 7 days*, *11 accounts*. A row whose answer is **one short thing** still shows it: a
 * tagline is already a line, and already says what is there.
 *
 * **This is the logo row's rule applied to the other eight, not a new idea imported.** The logo
 * has always described what it holds — `1200 × 400`, or `Added` — because there was never
 * anything else it could say. Every other row concatenated the owner's own words, and with a
 * real project that produced a paragraph: at 390px, twelve button labels end to end made the
 * Link buttons row **fourteen lines**, seven days of times made Opening hours ten, and the first
 * screen held three rows of nine ([#245](https://github.com/mandyMooreFan/linkpage/issues/245)).
 * §7.4 wants the list read at a glance — *see every topic of your page at once and press the one
 * you want* — and that was gone before the owner had done anything unusual.
 *
 * **What it costs was stated and taken, so nothing here quietly puts words back to help.** You
 * can no longer spot a typo in a button label without opening the row. A row that needs its
 * answer visible is a change to this rule rather than a detail of it.
 *
 * **Nothing is cut off.** The row carries a different sentence; it does not carry a shortened
 * one. Trimming was offered and refused (#253) — a trimmed web address is unreadable, and a
 * clamp would hide [#244](https://github.com/mandyMooreFan/linkpage/issues/244) rather than fix
 * it.
 *
 * **A count is of what the row holds, not of what the page can use.** A button whose address
 * cannot become a target is still a button the owner added; it is `mark` — §7.9's quiet line —
 * that says it will not work. The summary and the mark are not two opinions about one thing.
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
      return count(draft.links.length, "link button", "link buttons");

    case "hours":
      return hoursSummary(draft.hours, draft.lang);

    case "contact":
      return join([draft.contact?.phone, draft.contact?.email]);

    case "address": {
      // **The address, and then that a link is there** (#253) — never the link itself. Same
      // shape as the hours row's note, using the same middle dot: you can tell at a glance
      // that you added one, and the link appears in the field that can change it when the row
      // is open. Printing it was #244's sideways scroll; trimming it was refused, because a
      // trimmed web address is unreadable and would have hidden that scroll rather than fixed
      // it. A file with a link and no lines (§4.5) still has this much to say.
      const address = draft.address;
      const directions = address?.directionsUrl ?? "";
      return join([
        (address?.lines ?? []).join(", "),
        directions.trim() === "" ? undefined : "directions link",
      ]);
    }

    case "social":
      // The platform names are on the row's own screen, a press away. §4.4's "shown as they
      // wrote it" is about the page's fallback for a platform we have no mark for, and it is
      // `SectionQuestions.tsx` that keeps it here — an unrecognised platform is not a reason
      // for this row to become a list of eleven names.
      return count((draft.social ?? []).length, "account", "accounts");
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
