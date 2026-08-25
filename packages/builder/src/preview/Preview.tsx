import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type JSX,
  type ReactNode,
} from "react";
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
 * it is why nothing below reads the width to decide what the owner may do. What the width does
 * decide is which of the two the drawer currently is: it sets the open default, and `onCover`
 * reports it to the screen behind — neither of which is a second design.
 *
 * **Phone-shaped only, and the drawer invents no second control of its own** (§7.6). The exported
 * page is one column of `min(100%, 25rem)` inside a `1.25rem` gutter (§6.2), so the frame is
 * capped at the `27.5rem` those add up to. Below the cap it is fluid, exactly as the page is: on
 * a phone the drawer is the screen and the frame is the page at full width. A "see it on a
 * laptop" toggle would show the identical page with more whitespace, which is a control that
 * costs UI and teaches nothing — a test asserts the preview offers exactly one button of its own.
 *
 * **What it does carry is the screen's, not the drawer's** (#186). On a phone the open drawer
 * *is* the screen: an opaque `fixed inset-0` surface with the list underneath it. So the list's
 * own primary action was under the very sentence that names it — *"To share it, download the file
 * and put it online"* over a Download nobody could reach. `onCover` says when the drawer has gone
 * over the screen and `action` is what the screen hands it to carry while it has; the drawer
 * decides neither what that is nor when the caller supplies one. That keeps the *rule* the same as
 * it was: the width is still not consulted below to decide what the owner may do — it decides only
 * where the drawer is, and `onCover` reports that rather than branching on it.
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
  /**
   * What the screen behind the drawer hands it to carry while the page is up (#186).
   *
   * Rendered in the header beside the drawer's own control, and only while the drawer is open —
   * a closed drawer has covered nothing and is owed nothing. The drawer does not know what this
   * is or why it is here: the caller watches `onCover` and decides. It is a slot rather than an
   * `onDownload` prop precisely so that the button, its label and its unavailable state are still
   * written once, on the screen that owns them (§7.4's component rule).
   */
  readonly action?: ReactNode;
  /**
   * Told when the drawer goes over the screen, and when it comes back off it.
   *
   * True while the page is up with no room to sit beside the question — which on a phone means
   * the caller's own screen is behind an opaque surface and whatever it was showing is not on
   * screen any more. The list uses it to move Download into `action` and back out again, so
   * exactly one Download exists at a time rather than two that disagree.
   */
  readonly onCover?: (covering: boolean) => void;
}

export function Preview({ project, onList = false, action, onCover }: PreviewProps): JSX.Element {
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

  /**
   * The drawer is over the screen rather than beside the question — the state the caller needs,
   * expressed once here because this is the only place that knows both halves of it.
   *
   * Reported in a layout effect rather than an ordinary one so the answer is settled before the
   * frame is painted: the caller moves a control on the strength of it, and a control that
   * appears one frame late is a flicker on the exact screen this exists to fix.
   */
  const covering = open && !roomy;
  useLayoutEffect(() => {
    onCover?.(covering);
  }, [covering, onCover]);

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
      {/*
       * **The row starts where the screen starts** (#196, B-54). This was `justify-end`, and it
       * was the only right-aligned thing in the builder: mid-flow the row holds one control, on
       * a screen whose heading, fields, Continue, escape and Back all share one left margin —
       * §6's "alignment consistent per context", broken by the one element that had no reason
       * to differ. On a laptop it was aligned to nothing at all, since the row is the column's
       * full 32rem and the page frame inside it is 27.5rem, centred.
       *
       * **Nothing about #186's placement moves with it.** The sentence keeps `mr-auto`, so it
       * absorbs the free space and the two controls still finish the line wherever there is room
       * for one; where there is not, they now sit under the *start* of the sentence that names
       * them, which is the reading order that paragraph was put there for. Download is still
       * last in the row.
       */}
      <div
        className="flex flex-wrap items-center justify-start gap-3 group-data-[open=true]:border-b group-data-[open=true]:border-rule group-data-[open=true]:px-3 group-data-[open=true]:py-2 wide:group-data-[open=true]:border-0 wide:group-data-[open=true]:p-0"
        data-drawer-header
      >
        {/*
         * #169: landing on the page (§7.6) reads like a hosted page, and it is not one yet.
         * Said here, in the header beside the one control, because this is the exact moment
         * the illusion holds — and only on the list: mid-flow the page is visibly being made.
         *
         * `w-full` below the breakpoint (#186): with a carried action there are three things in
         * this row, and a phone has room for a sentence *or* two buttons, not both. The sentence
         * takes the first line and the controls the second, which is also the order that reads —
         * the instruction, then the button it names, directly under it. Where there is room the
         * row is one line, exactly as it was.
         */}
        {onList && open && (
          <p className="m-0 mr-auto w-full text-sm text-ink-quiet wide:w-auto">
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
        {/*
         * Last, so the screen's own primary action is the rightmost thing in the row — the
         * position it holds in the list's bar, and §4's one filled object on the screen. Only
         * while the page is up: the caller stops supplying one the moment the drawer comes off
         * the screen, and this guard is what keeps the two from disagreeing mid-swap.
         */}
        {open && action}
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
