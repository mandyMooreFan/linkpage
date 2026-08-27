import type { JSX, Ref } from "react";

/**
 * The OS file dialog, driven by a control somewhere else. `SPEC.md` §7.6, §7.7, §7.8, §6.6.
 *
 * **A `<input type="file">` is a control the tool cannot draw.** Its box is the browser's, not
 * paper's (§7.4), so every tool that wants its own button clips the input and presses it from
 * one — which is what this is, written once. It was written three times: the logo step, the
 * quiet line on step one, and the review list's menu item. That is the shape §7.4 warns about in
 * so many words — "a repeated string is the same decision copied until one copy is wrong" — and
 * here every copy was wrong in the same way, because the defect came along with the copying.
 *
 * **The input is the mechanism, not the control** (#254). Clipping it takes it off the screen and
 * off the screen only: `sr-only` leaves a 1×1 box that is still in the tab order and still in the
 * accessibility tree. So tabbing through the logo step went `Choose a file` → **a 1×1 invisible
 * file input carrying a focus ring nobody can see** → `We don't have one`, and a keyboard user's
 * focus vanished for one press. That is the limit case of what #188 settled: focus must be
 * visible, and a stop that *cannot* show a ring is the one place that promise cannot be kept.
 *
 * Two attributes say the whole thing, and they are two rather than one because they answer to
 * two different readers:
 *
 * - **`tabIndex={-1}`** — Tab never lands here. The visible control is the stop, and it is the
 *   one wearing #188's ring.
 * - **`aria-hidden="true"`, and the input's own `aria-label` goes with it.** This is the half the
 *   tab order does not cover and the more important one. The input reported `role=button` with a
 *   name of its own, so every one of these screens offered a screen reader **two buttons for one
 *   action** — `Choose a file` beside `Choose a logo file`, `Open it.` beside `Open a project
 *   file` — one of which nobody can see. Measured, not assumed: Playwright's own role query for
 *   `/Choose a/` on the logo step matched two elements. **The accessible name is now the visible
 *   control's own words**, which is the name it always should have been (WCAG 2.5.3 is that rule
 *   in one line) and which follows the control's state for free — the logo button says `Choose a
 *   different file` once there is one, and the invented second name never did.
 *
 * **Clipped rather than `display: none`, still.** Hiding it outright would take it out of the tab
 * order and the tree too, in one declaration — but it would also change what the browser does
 * with the element rather than what it says about it, and the dialog opening is the whole of
 * §7.7's import and §6.6's logo. #254 is a tab-order defect; the clip is not the bug and is not
 * being traded away to fix it.
 *
 * **Nothing ever focuses it**, which is what makes hiding it from the tree safe rather than a
 * trap: `.click()` on an input does not move focus, measured in Chromium — pressing `Choose a
 * file` leaves focus on `Choose a file`. Focus cannot reach an element the tree does not describe
 * because no route to it exists.
 *
 * **`accept` is a hint to the dialog and nothing more.** Every caller validates by content rather
 * than by filename — §7.7 for a project, §6.6 for a logo — so a renamed file still opens and a
 * correctly-named one can still be refused.
 *
 * **`value` is cleared on every pick**, which is what makes _pick again_ work. A file input fires
 * no `change` for the same path twice, and after a refusal that same path is exactly what the
 * owner is about to choose again — so §7.9's recovery would silently do nothing.
 */

export interface FilePickerProps {
  /** The dialog's filter. A hint (§7.7): nothing downstream looks at what it matched. */
  readonly accept: string;
  readonly onPick: (file: File) => void;
  /** The screen's handle on it: the control that opens the dialog calls `.click()`. */
  readonly ref?: Ref<HTMLInputElement>;
}

export function FilePicker({ accept, onPick, ref }: FilePickerProps): JSX.Element {
  return (
    <input
      {...(ref === undefined ? {} : { ref })}
      type="file"
      accept={accept}
      className="sr-only"
      tabIndex={-1}
      aria-hidden="true"
      // §7.4's convention: a hook, because a test cannot reach this by role — being unreachable
      // by role is the whole point of it.
      data-file-picker
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) onPick(file);
      }}
    />
  );
}
