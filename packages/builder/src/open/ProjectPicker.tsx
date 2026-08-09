import type { JSX, Ref } from "react";
import "./open.css";

/**
 * The OS file picker, with no control of its own. `SPEC.md` §7.8, §7.7.
 *
 * The control is elsewhere — the quiet line on the first screen, the item in the review list's
 * menu — and this is the input those presses reach through. It is clipped rather than hidden so
 * that its label stays in the accessibility tree, and it carries no styling of its own beyond
 * being out of the way.
 *
 * **`accept` is a hint to the file dialog and nothing more.** Import validates by content, not by
 * filename (§7.7): a project renamed `backup (3).txt` still opens, and a `.json` holding
 * something else still refuses. Nothing downstream ever looks at what the picker matched.
 *
 * **`value` is cleared on every pick**, which is what makes _pick again_ work. A file input fires
 * no `change` for the same path twice, and after a refusal the same path is exactly what an owner
 * who mis-tapped the list is about to choose — so §7.9's recovery would silently do nothing.
 */

export interface ProjectPickerProps {
  readonly onPick: (file: File) => void;
  /** The screen's handle on it: the control that opens the picker calls `.click()`. */
  readonly ref?: Ref<HTMLInputElement>;
}

export function ProjectPicker({ onPick, ref }: ProjectPickerProps): JSX.Element {
  return (
    <input
      ref={ref}
      type="file"
      accept=".json,application/json"
      className="open__picker"
      aria-label="Open a project file"
      onChange={(event) => {
        const chosen = event.target.files?.[0];
        event.target.value = "";
        if (chosen) onPick(chosen);
      }}
    />
  );
}
