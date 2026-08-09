import type { JSX } from "react";

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
  return (
    <div className="hosting">
      <p className="hosting__idea">
        Your page is one file. To put it online, it needs to sit somewhere that will hand it to
        anyone who asks for it — that is all hosting is. There is nothing to install and nothing
        running anywhere.
      </p>

      <ul className="hosting__routes">
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

      <p className="hosting__check">
        <strong>
          You will know it worked when you have a web address, and opening it on someone
          else&rsquo;s phone shows your page.
        </strong>{" "}
        Someone else&rsquo;s, because your own phone may be showing you the copy already on it.
      </p>

      <ul className="hosting__cautions">
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
