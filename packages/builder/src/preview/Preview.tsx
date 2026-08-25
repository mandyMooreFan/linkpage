import { useCallback, useEffect, useId, useState, useSyncExternalStore, type JSX } from "react";
import { pageHtml } from "../page.js";
import type { Draft } from "../project/index.js";
import { Button } from "../ui/Button.js";

/**
 * The preview: the exported page itself, in a drawer the owner steps in and out of (§5.2, §7.6).
 *
 * **One drawer, one control, two placements.** On a phone, opening it brings the page up over
 * the whole screen; on a laptop the drawer has room to sit open beside the question, so it does.
 * Everything that differs between those two lives in `preview.css` and is about *where the
 * drawer is*, never about what the owner does: the same button, the same open state, the same
 * Escape key, the same page. That is what §7.6 means by "the same interaction at two sizes", and
 * it is why there is no `if (narrow)` anywhere below.
 *
 * **Phone-shaped only, and there is no second control** (§7.6). The exported page is one column
 * of `min(100%, 25rem)` inside a `1.25rem` gutter (§6.2), so the frame is capped at the
 * `27.5rem` those add up to. Below the cap it is fluid, exactly as the page is: on a phone the
 * drawer is the screen and the frame is the page at full width. A "see it on a laptop" toggle
 * would show the identical page with more whitespace, which is a control that costs UI and
 * teaches nothing — a test asserts the preview offers exactly one button.
 *
 * **What the owner is looking at is the file.** The `srcdoc` attribute carries the string
 * `page.ts` hands to Download, character for character; nothing here reads it, rewrites it or
 * re-renders it in React.
 */

/** Wide enough for the drawer to sit open beside the question rather than over it. */
export const SIDE_BY_SIDE = "(min-width: 60rem)";

export interface PreviewProps {
  /** The project as the builder holds it — mid-flow drafts included (see `pageHtml`). */
  readonly project: Draft;
  /**
   * The list lands on the page (§7.6, #147): on the review list the drawer defaults open at
   * every size, and the open control reads "Edit your page" — the word names why an owner
   * landing on their page would tap it. Behaviour is otherwise identical: same drawer, same
   * control, same interaction. The flow leaves this unset and keeps the roomy default and its
   * own words.
   */
  readonly onList?: boolean;
}

export function Preview({ project, onList = false }: PreviewProps): JSX.Element {
  const roomy = useMediaQuery(SIDE_BY_SIDE);

  /**
   * `null` until the owner touches the control, and then whatever they said.
   *
   * The default follows the room available — and, on the list, the arrival (#147): a laptop
   * opens with the page already beside the question, a phone opens on the question mid-flow
   * and on the page itself on the list, run-end included. It is a *default*, not a mode. One
   * boolean is the whole state, the owner overrides it at either size, it lasts only this
   * mount — every preference-less arrival lands on the page again, deliberately — and a window
   * that is resized or a phone that is rotated re-defaults only while nobody has expressed a
   * preference.
   */
  const [choice, setChoice] = useState<boolean | null>(null);
  const open = choice ?? (onList || roomy);

  const drawerId = useId();

  // Escape closes the drawer at both sizes. Unconditional on purpose: a key that works on one
  // screen width and not the other is the split this component exists to avoid.
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChoice(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div
      className="group flex flex-col gap-3 font-sans text-ink data-[open=true]:fixed data-[open=true]:inset-0 data-[open=true]:z-20 data-[open=true]:h-dvh data-[open=true]:gap-0 data-[open=true]:bg-surface wide:data-[open=true]:static wide:data-[open=true]:h-auto wide:data-[open=true]:gap-3 wide:data-[open=true]:bg-transparent"
      data-open={open}
    >
      <div className="flex items-center justify-end gap-3 group-data-[open=true]:border-b group-data-[open=true]:border-rule group-data-[open=true]:px-3 group-data-[open=true]:py-2 wide:group-data-[open=true]:border-0 wide:group-data-[open=true]:p-0">
        {/*
         * #169: landing on the page (§7.6) reads like a hosted page, and it is not one yet.
         * Said here, in the header beside the one control, because this is the exact moment
         * the illusion holds — and only on the list: mid-flow the page is visibly being made.
         */}
        {onList && open && (
          <p className="m-0 mr-auto text-sm text-ink-quiet">
            Only you can see this. To share it, download the file and put it online.
          </p>
        )}
        <Button
          className="self-center"
          aria-expanded={open}
          aria-controls={drawerId}
          onClick={() => setChoice(!open)}
        >
          {open ? (onList ? "Edit your page" : "Hide the page") : "See the page"}
        </Button>
      </div>
      <div
        className="min-h-0 flex-1 justify-center [&:not([hidden])]:flex wide:h-[min(80dvh,46rem)] wide:flex-none"
        id={drawerId}
        hidden={!open}
      >
        {/*
         * Mounted only while open, so stepping out and back in always returns to the top of a
         * fresh page. The frame is sandboxed with nothing granted — the export ships zero
         * JavaScript (§5.3, invariant 1), so it needs no script permission, and withholding
         * `allow-same-origin` keeps the previewed page off the builder's origin and away from
         * the project in `localStorage`.
         */}
        {open && (
          <iframe
            className="enter-fade block h-full w-[min(100%,27.5rem)] border border-rule bg-surface"
            title="Your page"
            data-preview-frame
            sandbox=""
            srcDoc={pageHtml(project)}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Whether a media query matches, kept in sync with the viewport.
 *
 * `matchMedia` is the honest source for "is there room beside the question": it is the same
 * question `preview.css` asks, so the two cannot disagree about where the drawer is. Absent —
 * an old test environment, or a non-browser one — reads as no room, which is the narrow layout
 * and the one that works everywhere.
 */
function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = globalThis.matchMedia?.(query);
      if (!list) return () => {};
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  const matches = useCallback(() => globalThis.matchMedia?.(query).matches ?? false, [query]);

  return useSyncExternalStore(subscribe, matches, () => false);
}
