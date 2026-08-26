import type { JSX } from "react";
import type { Refusal } from "../project/index.js";
import { TYPE } from "../ui/type.js";

/**
 * A refused file, said out loud. `SPEC.md` §7.9, §4.6.
 *
 * > **In place, attached to the control that opened the picker. Never a modal, never a
 * > navigation.**
 *
 * This component is the message and nothing else — **it does not decide where it appears.** The
 * two entry points hand it to the slot beside their own control: under the quiet line on the
 * first screen, with the preset question above it untouched, and inside the list's menu panel
 * with the project intact behind it. That is the whole of §7.9: _try a different file_ is
 * overwhelmingly the next action, and in place makes recovery **pick again** rather than
 * _dismiss → re-find the control → re-open the picker_.
 *
 * **Two halves, and the split is the point** (§4.6). The sentence is the owner's and names no
 * JSON path; the disclosure is for whoever hand-edited the file, and is closed. Repair-and-report
 * — listing what could not be read — was rejected for this audience: a report about fields is a
 * report in our vocabulary, and for everything that is not one of the two refusals the flow can
 * simply ask instead. **A file missing required fields never reaches this component at all.**
 *
 * The `too-new` message is the one that carries a link, because it is the one refusal the owner
 * can act on directly: the canonical builder is a static site and is always current, so the fix
 * is following it (§4.3).
 */

export interface RefusalNoticeProps {
  readonly refusal: Refusal;
}

export function RefusalNotice({ refusal }: RefusalNoticeProps): JSX.Element {
  return (
    <div className="font-sans" role="alert" data-refusal={refusal.reason}>
      <p className="m-0" data-refusal-message>
        {refusal.message}
        {refusal.url !== undefined && (
          <>
            {" — "}
            <a className="underline" href={refusal.url}>
              {refusal.url}
            </a>
          </>
        )}
      </p>
      {/*
       * Closed, and worth nothing to the owner — which is the requirement, not a shortcoming.
       * It exists so that the person who opened the file in a text editor and broke it has
       * somewhere to look, without the message above having to be written for them.
       */}
      <details className={`mt-2 ${TYPE.quietLine.className}`}>
        <summary className="cursor-pointer">Technical detail</summary>
        <p className="mt-1 [overflow-wrap:anywhere]" data-refusal-text>
          {refusal.detail}
        </p>
      </details>
    </div>
  );
}
