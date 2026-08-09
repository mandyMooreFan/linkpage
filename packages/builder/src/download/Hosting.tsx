import type { JSX } from "react";

/**
 * Section one's hosting guidance — and the reason it is a placeholder. `SPEC.md` §8, §6.3.
 *
 * > **This section is deliberately incomplete in v1 of this spec.**
 *
 * §8 says that of itself, in its own first line, and this component is the shipped form of it.
 * **The structure is settled and the walkthrough is not**: the guidance is section one of the
 * Download sheet, above the project file (§7.7), and the step-by-step copy waits on #19 and #20.
 * Two questions set the step count and neither has been answered — whether a logged-out drop
 * yields a publicly viewable URL, and whether the path works at all on a phone — and the second
 * matters disproportionately, because §7.6 makes mobile editing first-class and a broken mobile
 * path would walk owners to a dead end.
 *
 * **So this ships an honest placeholder rather than a fabricated walkthrough.** Writing
 * verified-sounding steps from documentation alone is the specific failure §8 exists to avoid,
 * and the owner reading this is the florist of `CONTRIBUTING.md` — the person least able to
 * tell a step that was walked from a step that was read. Saying "we have not done this yet" to
 * them costs a paragraph. Saying it wrong costs them an afternoon and their page.
 *
 * **Every claim below is one §8 already establishes**, and nothing else is here:
 *
 * - A single dropped `index.html` is accepted by at least one major drop-style host. Determined
 *   by reading shipped uploader code, and it *contradicts that host's own prose documentation*
 *   — undocumented behaviour that can be withdrawn without notice, so it is described as
 *   fragile and the host is not named. Naming it would be the recommendation §8 withholds.
 * - Two obvious hosts are disqualified on licence terms rather than capability: one free tier
 *   is non-commercial only with a definition that explicitly covers advertising a service,
 *   another forbids using it "to run your online business". Both exclude exactly this
 *   product's users. Neither is named, for the same reason, and note the asymmetry — the same
 *   host may be perfectly legitimate for hosting *the builder*.
 * - "Send it to your web person" is a first-class route, not an afterthought. It is first here
 *   because it is the only one of the four that needs no verification at all: it works today,
 *   for the many small businesses that have someone who does their website.
 * - Shared links preview as text, permanently (§6.3). `og:image` is structurally impossible for
 *   any single-file tool, so this must be explained rather than quietly accepted — and the
 *   Download sheet is where the owner is about to go and find out.
 *
 * **When #19 and #20 land, this file is what they replace.** The seam is deliberately a whole
 * component rather than a string, so the walkthrough can be as long as the walking turns out to
 * require without anything else on the sheet moving.
 */
export function Hosting(): JSX.Element {
  return (
    <div className="hosting">
      <p className="hosting__note">
        <strong>We have not written the step-by-step yet.</strong> We would have to follow it
        ourselves first — on a phone as well as on a computer — and we have not. Rather than give
        you steps that might not work, here is what we can tell you today.
      </p>

      <ul className="hosting__routes">
        <li>
          <strong>Send it to whoever looks after your website.</strong> If someone built your
          website or set up your email, this file is all they need. It is an ordinary web page.
        </li>
        <li>
          <strong>Some hosts take a single file.</strong> There are services you drag a file onto
          and it is online. At least one of them accepts a lone <code>index.html</code> — but that
          is not something it documents, so it could stop working without warning. That is the part
          we want to walk ourselves before we tell you to do it.
        </li>
        <li>
          <strong>Free does not always mean allowed.</strong> Two well-known free hosts would run
          this page perfectly well and forbid it in their terms — one is for non-commercial use
          only, the other rules out running your business on it. We would rather send you somewhere
          you are allowed to be.
        </li>
        <li>
          <strong>Your link will look plain when you share it.</strong> Paste it into a message or a
          post and you will get the address as text, with no picture. That is how a one-file page
          works, and nothing is wrong.
        </li>
      </ul>
    </div>
  );
}
