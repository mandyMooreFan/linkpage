import type { Link } from "@linkpage/renderer";
import { useState, type JSX } from "react";
import { Field } from "../flow/questions/Question.js";
import type { Draft } from "../project/index.js";
import { moved, setLinks, withoutAt } from "./edits.js";

/**
 * The link buttons row: arrows, and a marked top slot. `SPEC.md` §7.5, §2.3, §7.6.
 *
 * > **Each button carries an up and a down arrow. No drag-and-drop, in v1 or planned.**
 *
 * Drag beats arrows when moving item 12 to position 3, and this list never reaches twelve; with
 * four buttons, "up, pressed twice" *is* direct manipulation. What drag would cost is exactly
 * what this editor cannot afford: a finger dragging inside a scrolling column, the browser
 * guessing between "move this" and "scroll the page", guessing wrong, and the owner concluding
 * the tool is broken. Two buttons per row are also the keyboard path, which a drag
 * implementation would have had to build anyway — two mechanisms where one does.
 *
 * > **The first button is marked as the one most people will tap.**
 *
 * §2.3 dropped the "featured" flag as *redundant* rather than as bloat — the owner already
 * controls list order, so **position is the emphasis mechanism**, and a second way to signal
 * importance would invite a page where everything is featured. But a mechanism nobody is told
 * about is not one the owner can use: the mark is what turns "the first button gets the
 * emphasis" from something the renderer quietly does into something they are choosing. It says
 * what is already true of the page rather than adding anything to it, which is why nothing in
 * `project.json` corresponds to it.
 *
 * **The rows are held here and written through as they change.** The page beside the list is
 * the feedback, and feedback after a Save button is not feedback — pressing *up* and watching
 * the page reorder is most of what makes arrows feel like direct manipulation at this length.
 * A row being typed into is local, because `setLinks` keeps the flow's rule (**a button exists
 * only once it has a URL**, §7.3) and a URL cleared for retyping would otherwise take the row
 * with it. The page shows the button leave and come back, which is that rule, visible.
 */

export interface LinkButtonsProps {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
  /** Ticks the flow over for a new button — §7.1's re-entry, not a blank row here. */
  readonly onAddAnother: () => void;
  /** The escape, as on every other row: the section goes rather than emptying. */
  readonly onRemoveAll: () => void;
}

export function LinkButtons({
  draft,
  onChange,
  onAddAnother,
  onRemoveAll,
}: LinkButtonsProps): JSX.Element {
  /** Seeded once: the editor is mounted by opening the row, so it opens on what is stored. */
  const [rows, setRows] = useState<readonly Link[]>(draft.links);

  function commit(next: readonly Link[]): void {
    setRows(next);
    onChange(setLinks(draft, next));
  }

  const edit = (at: number, patch: Partial<Link>): void =>
    commit(rows.map((link, index) => (index === at ? { ...link, ...patch } : link)));

  return (
    <div className="mt-4 flex flex-col items-start gap-4">
      <p className="question__hint">
        People read from the top. The first button is the one most of them will tap.
      </p>

      <ol className="m-0 flex w-full list-none flex-col gap-4 p-0">
        {rows.map((link, index) => (
          // Positional keys: a button's identity on this screen *is* where it is in the order,
          // which is the same thing the arrows change and the page reads.
          <li key={index} className="flex flex-col gap-2 border-b border-rule py-3" data-button-row>
            {index === 0 && (
              <p className="m-0 text-sm font-semibold text-notice" data-mark>
                Most people will tap this one
              </p>
            )}

            <Field label="What it says">
              <input
                type="text"
                className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                value={link.label}
                onChange={(event) => edit(index, { label: event.target.value })}
              />
            </Field>

            <Field label="Where it goes">
              <input
                type="url"
                className="tap w-full border-0 border-b border-rule bg-transparent px-0 py-2 font-sans text-lg focus:border-ink"
                inputMode="url"
                value={link.url}
                spellCheck={false}
                autoCapitalize="none"
                placeholder="https://"
                onChange={(event) => edit(index, { url: event.target.value })}
              />
            </Field>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="tap min-w-11 rounded-sm border border-rule bg-transparent text-lg disabled:text-rule"
                disabled={index === 0}
                aria-label={`Move ${link.label} up`}
                onClick={() => commit(moved(rows, index, index - 1))}
              >
                <span aria-hidden="true">↑</span>
              </button>
              <button
                type="button"
                className="tap min-w-11 rounded-sm border border-rule bg-transparent text-lg disabled:text-rule"
                disabled={index === rows.length - 1}
                aria-label={`Move ${link.label} down`}
                onClick={() => commit(moved(rows, index, index + 1))}
              >
                <span aria-hidden="true">↓</span>
              </button>
              <button
                type="button"
                className="bg-transparent font-sans underline underline-offset-4"
                aria-label={`Remove ${link.label}`}
                onClick={() => commit(withoutAt(rows, index))}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ol>

      {/*
       * A new button is territory the owner has not covered, so it goes back through the flow
       * (§7.1): the pick-list and then "where does it go?", the same two screens as day one. A
       * blank row here would be the blank field the flow exists so that nobody faces one.
       */}
      <button
        type="button"
        className="tap self-start rounded-sm border border-rule bg-transparent px-4 py-2 font-sans text-base"
        onClick={onAddAnother}
      >
        Add another button
      </button>

      <button type="button" className="question__escape" onClick={onRemoveAll}>
        No buttons for now
      </button>
    </div>
  );
}
