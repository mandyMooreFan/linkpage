import { linkHref, mailtoHref, mendEmail, socialLabel, telHref } from "@linkpage/renderer";
import type { Topic } from "../flow/topics.js";
import type { Draft } from "./index.js";

/**
 * What the owner has typed that the page cannot use, and how the tool says so (`SPEC.md` §7.9).
 *
 * **One module, because the same fact is said in two places.** §7.4 marks the review-list row and
 * §7.7 adds a line to the Download sheet — decision 5's *what cannot be used leaves a mark that
 * outlives the screen* — and two implementations of "can we derive a target?" would eventually
 * disagree about the same string, which is the failure the owner would feel and nobody would see.
 *
 * **The predicates are the renderer's own** (`telHref`, `mailtoHref`, `linkHref`). Asking anything
 * else would be a second opinion about a question the page has already answered.
 *
 * **The two surfaces differ in one way, and only one.** On the row the field is obvious, so the
 * sentence is about the value; in the sheet the row is nowhere to be seen, so the sentence names
 * its field. §7.7 records that as the one place the sheet departs from §7.9's single sentence.
 */

/** Whether a value is present at all. Absent is not unusable — §4.6 collects it in the flow. */
const given = (value: string | undefined): value is string =>
  value !== undefined && value.trim() !== "";

const URL_FIX = "paste the address from your browser";
const PHONE_FIX = "add the number in digits if you want it tappable";
const EMAIL_SENTENCE = "Tapping this won't open an email — check the address.";

/**
 * The screen's judges (§7.9 decisions 1 and 6, #368): what a web-address or email field says on
 * `Continue` when the page could make no target from it, in the same words the row and the sheet
 * use, so the owner meets one sentence in three places rather than three sentences.
 *
 * **Empty is not unusable.** Each returns `true` for a blank value: whether a blank is an answer is
 * the screen's question (decision 1's presence sentence), not the value's.
 *
 * **Judged as the mend would leave it.** `linkHref` is `mendUrl`'s own test, and an email is judged
 * with its spaces stripped, so what `topics.ts` would store as usable is never held on screen.
 *
 * **There is no phone judge, and there will not be one.** §7.9 decision 1: our rules go stale and
 * the owner's number does not, so its notice stays the review row's mark.
 */
export function buttonJudge(url: string): string | true {
  return url.trim() === "" || linkHref(url.trim()) !== undefined
    ? true
    : `This button won't work — ${URL_FIX}.`;
}

export function linkJudge(url: string): string | true {
  return url.trim() === "" || linkHref(url.trim()) !== undefined
    ? true
    : `This link won't work — ${URL_FIX}.`;
}

export function emailJudge(email: string): string | true {
  return email.trim() === "" || mailtoHref(mendEmail(email)) !== undefined ? true : EMAIL_SENTENCE;
}

/**
 * The row's mark: one quiet line saying this row holds something the page cannot use (§7.4).
 *
 * **One pattern, one noun of variation** — directions and social are not buttons, so calling them
 * one would be untrue — and *invalid*, *format* and *valid* are banned throughout, because they
 * name our diagnosis rather than the owner's situation.
 *
 * **Phone gets its own sentence because nothing is broken.** A vanity number, an extension or a
 * second number is deliberate and correct. What justifies marking it at all is that the contact
 * screen's hint already promises *they become a tap-to-call and a tap-to-email link* — so the
 * message corrects a promise the screen made rather than volunteering a diagnosis.
 */
export function rowMark(draft: Draft, topic: Topic): string | undefined {
  switch (topic) {
    case "links":
      return (draft.links ?? []).some((link) => linkHref(link.url) === undefined)
        ? `This button won't work — ${URL_FIX}.`
        : undefined;

    case "contact": {
      const { phone, email } = draft.contact ?? {};
      if (given(phone) && telHref(phone) === undefined) {
        return `Tapping this won't dial — ${PHONE_FIX}.`;
      }
      if (given(email) && mailtoHref(email) === undefined) {
        return EMAIL_SENTENCE;
      }
      return undefined;
    }

    case "address": {
      const url = draft.address?.directionsUrl;
      return given(url) && linkHref(url) === undefined
        ? `This link won't work — ${URL_FIX}.`
        : undefined;
    }

    case "social":
      return (draft.social ?? []).some((entry) => linkHref(entry.url) === undefined)
        ? `This link won't work — ${URL_FIX}.`
        : undefined;

    default:
      return undefined;
  }
}

/**
 * The Download sheet's lines (§7.7).
 *
 * **At most two, and they cannot become a list.** §7.9 gives the phone its own sentence and puts
 * all three URL fields under one, so two distinct warnings is the ceiling and a third is not
 * reachable. No count, no lead-in sentence, no icon — a line reading *2 problems* is a diagnosis
 * in our own vocabulary, which §7.9 bans.
 *
 * **Each names its own field**, because away from its row the sentence has no referent. Where more
 * than one URL field is unusable it names the first: the sheet is the last-moment reminder, not an
 * inventory, and §7.4's rows are where the per-field detail already lives.
 *
 * **Empty when nothing is wrong**, which is the constraint §7.7 puts on this: the sheet is then
 * byte for byte the calm screen it was designed as.
 */
export function sheetWarnings(draft: Draft): readonly string[] {
  const lines: string[] = [];

  const brokenLink = (draft.links ?? []).find((link) => linkHref(link.url) === undefined);
  const directions = draft.address?.directionsUrl;
  const brokenSocial = (draft.social ?? []).find((entry) => linkHref(entry.url) === undefined);

  if (brokenLink !== undefined) {
    lines.push(`${brokenLink.label} won't work — ${URL_FIX}.`);
  } else if (given(directions) && linkHref(directions) === undefined) {
    lines.push(`Your directions link won't work — ${URL_FIX}.`);
  } else if (brokenSocial !== undefined) {
    const name = socialLabel(brokenSocial.platform) || "social";
    lines.push(`Your ${name} link won't work — ${URL_FIX}.`);
  }

  const { phone, email } = draft.contact ?? {};
  if (given(phone) && telHref(phone) === undefined) {
    lines.push(`Your phone number won't dial — ${PHONE_FIX}.`);
  } else if (given(email) && mailtoHref(email) === undefined) {
    lines.push("Your email address won't work — check it.");
  }

  return lines;
}
