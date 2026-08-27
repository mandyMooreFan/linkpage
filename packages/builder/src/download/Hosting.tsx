import type { JSX } from "react";

/**
 * The two lists on this screen, which are the same list twice. `SPEC.md` §8, §6; finding B-46.
 *
 * **A role, not two hand-tuned lists.** The audit read the source and found the second `<ul>` at
 * `gap-2` with the `[&_strong]` rule missing; [#201](https://github.com/mandyMooreFan/linkpage/issues/201)
 * put a browser on it and measured the divergence — 12px against 8px of row gap, and lead-ins at
 * `#1f1b16` against `#6b6257`, the same grey as the sentences they introduce. Both lists are a
 * quiet block of prose whose items open with a bold run-in head; there is one thing here and it
 * is now written once, so the next hand cannot tune one copy of it.
 *
 * **The lead-ins take the full ink, and that direction was the open question.** Both-to-ink and
 * both-to-quiet are each internally consistent, so it was settled on what the tool already does
 * rather than on preference:
 *
 * - **The sheet's own words are ink.** `SHEET_SURFACE` declares `text-ink` and every heading and
 *   paragraph on this screen takes it. So "the tool's own words recede" — the reading #234 used
 *   to give the tertiary *button* its grey — is a rule ranking controls under §4, where a
 *   tertiary sits below an outlined secondary and colour is one of the two instruments paper has
 *   left to say so. It is not a rule about prose, and this screen is the proof: if it were, the
 *   whole sheet would be grey.
 * - **Bold-at-full-ink is the tool's grammar for emphasis.** `<strong>` is written at eight sites
 *   in the builder. Six render at full ink — the project name in §7.8's replace confirmation, the
 *   sheet's *if you lose it* sentence, the three lead-ins of the list above, and the outcome check
 *   between the two lists. The only two that did not were exactly the two below.
 * - **§8 says these two things must be said _outright_.** A lead-in set exactly like the sentence
 *   it leads is not said outright, and §2 asks for weight *and* colour before size — the second
 *   list was spending one of the two.
 *
 * Nothing is lost by the other reading being wrong about readability: `--color-ink-quiet` on the
 * ground is 5.60:1 and the words were always legible. What was missing was the hierarchy.
 *
 * **`gap-3` rather than `gap-2`**, for the same reason as the ink: the list that already had it
 * does not move, and 8px between two multi-line items is close enough to the leading inside one
 * that the items stop reading as items. It is not a rung of `LADDER` on purpose — that ladder is
 * the *form's*, measured between a label, a control and a hint, and these are sentences.
 */
export const LEAD_IN_LIST =
  "m-0 mt-4 flex list-none flex-col gap-3 p-0 text-ink-quiet [&_strong]:text-ink";

/**
 * Section one of the Download sheet: getting the page online. `SPEC.md` §8, §6.4.
 *
 * **This describes the shape of the problem and names no host, and that is the design rather than
 * a placeholder.** An earlier version of this file was a placeholder, waiting on someone walking a
 * drop path so the steps could be written. The steps are now ruled out entirely.
 *
 * Three reasons, in order of weight:
 *
 * 1. **Steps rot and we cannot maintain them.** Every host redesigns its uploader, moves its free
 *    tier and rewrites its terms on its own schedule without telling us. Instructions in here are
 *    wrong from some unannounced date, and the owner reading them cannot tell a step we got wrong
 *    from a step that used to work. Copy with no steps in it cannot go stale.
 * 2. **Naming a host is a recommendation**, and a recommendation carries a shelf life and tells a
 *    business owner where to put their livelihood on the strength of terms we read once.
 * 3. **We never walked them** — the original reason, and now the least important, because a walked
 *    path would rot too.
 *
 * So the copy carries the one idea that outlasts every host: **the file just has to sit somewhere
 * that hands it to anyone who asks.** Every option is that idea wearing different clothes. An owner
 * who understands it can recognise a workable answer when someone offers them one, which is worth
 * more than a procedure that expires.
 *
 * **The check is the load-bearing part.** Telling someone to ask an AI assistant for steps is only
 * safe if they can grade the result, and this owner — the florist of `CONTRIBUTING.md` — cannot
 * audit confident, outdated, plausible instructions. So the copy ends on an outcome test that is
 * independent of every step that preceded it: *open the address on someone else's phone.* Someone
 * else's, because their own browser may be showing them a file from their own computer. An owner
 * who applies it cannot be quietly left with a page only they can see.
 *
 * Two things are said outright because both are traps the owner cannot see coming: free hosts whose
 * terms forbid a business (§8), and the permanently plain link preview, which is `og:image` being
 * structurally impossible for a single-file tool (§6.4) rather than a bug.
 *
 * **This is not a step toward a deploy button.** Constraint 6 makes the last mile guidance rather
 * than integration, because deploying needs credentials, somewhere to keep them and someone to
 * answer when it breaks — a hosting business rather than a feature.
 */
export function Hosting(): JSX.Element {
  /*
   * **One step, on the ladder** (B-45). This was `mt-5` on the wrapper immediately containing an
   * `mt-2` on its first paragraph — 28px, arrived at by stacking two margins, in a sheet whose
   * every other step is `mt-2`, `mt-3`, `mt-4` or `mt-8`. `mt-5` appears nowhere else in the
   * builder. §8's guidance is a sub-section of the page section above it and takes that section's
   * own step; the paragraph inside then needs nothing, because the wrapper is what is being
   * spaced.
   */
  return (
    <div className="mt-8" data-hosting>
      <p>
        Your page is one file. To put it online, it needs to sit somewhere that will hand it to
        anyone who asks for it — that is all hosting is. There is nothing to install and nothing
        running anywhere.
      </p>

      <ul className={LEAD_IN_LIST}>
        <li>
          <strong>Ask whoever looks after your website.</strong> If someone built your website or
          set up your email, this file is all they need. It is an ordinary web page and it will take
          them a minute.
        </li>
        <li>
          <strong>Or use a service you drag a file onto.</strong> Several are free. Search for one,
          or ask an AI assistant which to use and how — they change often enough that we would
          rather you got current instructions than ours.{" "}
          <strong>This part is usually easier on a computer than a phone</strong>, so it is worth
          waiting until you are at one.
        </li>
      </ul>

      <p className="mt-2">
        <strong>
          You will know it worked when you have a web address, and opening it on someone
          else&rsquo;s phone shows your page.
        </strong>{" "}
        Someone else&rsquo;s, because your own phone may be showing you the copy already on it.
      </p>

      <ul className={LEAD_IN_LIST}>
        <li>
          <strong>Free does not always mean allowed.</strong> Some well-known free hosts will run
          this page perfectly and forbid it in their terms — one is for personal use only, another
          rules out running a business on it. Worth a look before you settle somewhere.
        </li>
        <li>
          <strong>Your link will look plain when you share it.</strong> Paste the address into a
          message and you will get text with no picture. That is how a one-file page works, and
          nothing is broken.
        </li>
      </ul>
    </div>
  );
}
