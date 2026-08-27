import type { JSX, Ref } from "react";
import { FilePicker } from "../ui/FilePicker.js";

/**
 * The project half of the OS file dialog, with no control of its own. `SPEC.md` §7.8, §7.7.
 *
 * The control is elsewhere — the quiet line on the first screen, the item in the review list's
 * menu — and this is the input those presses reach through. **It names the accept filter and
 * nothing else**: the recipe that makes a clipped input safe to drive from somewhere else is
 * `ui/FilePicker.tsx`, and this file used to be one of three copies of it (#254).
 *
 * **`accept` is a hint to the file dialog and nothing more.** Import validates by content, not by
 * filename (§7.7): a project renamed `backup (3).txt` still opens, and a `.json` holding
 * something else still refuses. Nothing downstream ever looks at what the picker matched.
 */

export interface ProjectPickerProps {
  readonly onPick: (file: File) => void;
  /** The screen's handle on it: the control that opens the picker calls `.click()`. */
  readonly ref?: Ref<HTMLInputElement>;
}

export function ProjectPicker({ onPick, ref }: ProjectPickerProps): JSX.Element {
  return (
    <FilePicker
      accept=".json,application/json"
      onPick={onPick}
      {...(ref === undefined ? {} : { ref })}
    />
  );
}
