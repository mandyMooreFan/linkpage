import type { JSX, ReactNode } from "react";

/**
 * A quiet surface for something the tool is saying — §7.9's messages, and the Download sheet's
 * sections.
 *
 * A rule on the leading edge rather than a filled box, because paper does not have boxes (§7.4).
 * It reads as an aside without becoming a card, which is what the old `.notice` was reaching for
 * with a background it no longer needs.
 */
export function Panel({
  children,
  tone = "quiet",
  className,
}: {
  readonly children: ReactNode;
  /** `notice` is the tool speaking about something the owner should act on (§7.9). */
  readonly tone?: "quiet" | "notice";
  readonly className?: string;
}): JSX.Element {
  const edge = tone === "notice" ? "border-notice" : "border-rule";
  return (
    <div className={`border-s-2 ${edge} ps-3 font-sans ${className ?? ""}`.trim()}>{children}</div>
  );
}
