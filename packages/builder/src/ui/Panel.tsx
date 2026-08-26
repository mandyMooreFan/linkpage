import type { HTMLAttributes, JSX, ReactNode } from "react";

/**
 * A quiet surface for something the tool is saying — §7.9's messages, and the Download sheet's
 * sections.
 *
 * A rule on the leading edge rather than a filled box, because paper does not have boxes (§7.4).
 * It reads as an aside without becoming a card, which is what the old `.notice` was reaching for
 * with a background it no longer needs.
 *
 * **It had four hand-rolled copies and no call sites at all** (B-47, and two more found by #191).
 * `LogoQuestion`, `PresetQuestion` and both of the list menu's messages wrote
 * `border-s-2 border-notice ps-3 font-sans` out by hand and never imported this file — the exact
 * shape #183 found on `TextInput`, where the copy that owned the placeholder colour had zero
 * callers, so the rule it held reached nothing. A component nobody calls is not a component; it
 * is a fifth copy that happens to be unused. `controls.test.ts` now holds the recipe to this
 * file, so the fifth copy fails a test rather than merely being written.
 *
 * **The recipe is exported** for the same reason `WEIGHT` and `INPUT_CLASS` are: the guard reads
 * what the component actually renders rather than a re-spelling of it that can drift.
 */
export const PANEL_CLASS = "border-s-2 ps-3 font-sans";

/** The edge colour per tone — the only thing the two tones differ in. */
export const PANEL_EDGE = { quiet: "border-rule", notice: "border-notice" } as const;

export type PanelTone = keyof typeof PANEL_EDGE;

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  /** `notice` is the tool speaking about something the owner should act on (§7.9). */
  readonly tone?: PanelTone;
}

export function Panel({ children, tone = "quiet", className, ...rest }: PanelProps): JSX.Element {
  /**
   * The rest is spread, the way `Button` spreads its own, because every real call site brings a
   * `data-*` hook: §7.4 puts a hook on anything a test has to name that it cannot reach by role,
   * and a message with no role is exactly that. Without the passthrough the four copies could not
   * have moved here without losing the hooks their tests already read.
   */
  return (
    <div className={`${PANEL_CLASS} ${PANEL_EDGE[tone]} ${className ?? ""}`.trim()} {...rest}>
      {children}
    </div>
  );
}
