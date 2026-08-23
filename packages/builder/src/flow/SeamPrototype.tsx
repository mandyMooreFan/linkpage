import { useEffect, useState, type JSX } from "react";
import { pageHtml } from "../page.js";
import type { Draft } from "../project/index.js";
import type { Step } from "./plan.js";

/**
 * PROTOTYPE — THROWAWAY. Wayfinder ticket #139: the phone seam.
 *
 * Two rivals on the live flow screen, switchable via `?variant=`, judged on a real phone:
 *
 * - `?variant=peek`  — Rival A: the page stays in view while answering. A live miniature of the
 *   page sits fixed at the bottom of the screen and grows as answers land; tapping it opens the
 *   full-screen drawer, exactly as the shipped button does.
 * - `?variant=trail` — Rival B: a paper-native position signal. A trail of the topics already
 *   answered, current topic in full ink, no denominator, no bar, no count — position without a
 *   total, so #94's arithmetic is never contradicted.
 * - no param — the builder as shipped.
 *
 * Everything here dies with the throwaway branch. The floating switcher is gated out of
 * production builds and out of vitest.
 */

const VARIANTS = ["baseline", "peek", "trail"] as const;
export type SeamVariant = (typeof VARIANTS)[number];

const LABELS: Record<SeamVariant, string> = {
  baseline: "0 — as shipped",
  peek: "A — the page in view",
  trail: "B — a trail of topics",
};

function readVariant(): SeamVariant {
  const raw = new URLSearchParams(globalThis.location?.search ?? "").get("variant");
  return (VARIANTS as readonly string[]).includes(raw ?? "") ? (raw as SeamVariant) : "baseline";
}

export function useSeamVariant(): SeamVariant {
  const [variant, setVariant] = useState<SeamVariant>(readVariant);
  useEffect(() => {
    const onChange = () => setVariant(readVariant());
    window.addEventListener("seam-variant", onChange);
    window.addEventListener("popstate", onChange);
    return () => {
      window.removeEventListener("seam-variant", onChange);
      window.removeEventListener("popstate", onChange);
    };
  }, []);
  return variant;
}

function go(variant: SeamVariant): void {
  const url = new URL(globalThis.location.href);
  if (variant === "baseline") url.searchParams.delete("variant");
  else url.searchParams.set("variant", variant);
  history.replaceState(null, "", url);
  window.dispatchEvent(new Event("seam-variant"));
}

/** Floating switcher pill. Top-centre because Rival A owns the bottom edge. */
export function SeamSwitcher(): JSX.Element | null {
  const variant = useSeamVariant();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (event.key === "ArrowLeft") go(cycle(variant, -1));
      if (event.key === "ArrowRight") go(cycle(variant, 1));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [variant]);

  if (!import.meta.env.DEV || import.meta.env.TEST) return null;

  return (
    <div className="fixed left-1/2 top-2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full bg-ink px-2 py-1 font-sans text-xs text-ground shadow-lg">
      <button type="button" className="px-2 py-1" onClick={() => go(cycle(variant, -1))}>
        ←
      </button>
      <span className="whitespace-nowrap">{LABELS[variant]}</span>
      <button type="button" className="px-2 py-1" onClick={() => go(cycle(variant, 1))}>
        →
      </button>
    </div>
  );
}

function cycle(current: SeamVariant, by: number): SeamVariant {
  const at = VARIANTS.indexOf(current);
  return VARIANTS[(at + by + VARIANTS.length) % VARIANTS.length] as SeamVariant;
}

/**
 * Rival A: the page in view. A live miniature fixed to the bottom edge — the artifact visibly
 * growing is the progress signal, per §7.2's own claim. Tap expands to the full-screen page,
 * the same destination as the shipped "See the page".
 */
export function PagePeek({ project }: { readonly project: Draft }): JSX.Element {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpanded(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [expanded]);

  if (expanded) {
    return (
      <div className="fixed inset-0 z-20 flex h-dvh flex-col bg-surface font-sans text-ink">
        <div className="flex justify-end border-b border-rule px-3 py-2">
          <button
            type="button"
            className="tap rounded-sm border border-rule bg-transparent px-4 py-2 font-sans"
            onClick={() => setExpanded(false)}
          >
            Back to the question
          </button>
        </div>
        <div className="flex min-h-0 flex-1 justify-center">
          <iframe
            className="block h-full w-[min(100%,27.5rem)] border border-rule bg-surface"
            title="Your page"
            sandbox=""
            srcDoc={pageHtml(project)}
          />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      className="fixed inset-x-0 bottom-0 z-10 block h-40 w-full cursor-pointer border-t border-rule bg-ground p-0 wide:hidden"
      aria-label="See the page"
      onClick={() => setExpanded(true)}
    >
      <div className="pointer-events-none flex h-full justify-center overflow-hidden pt-2">
        {/* Scaled, not cropped: the whole silhouette grows as answers land. */}
        <div className="h-[38rem] w-[27.5rem] flex-none origin-top scale-[0.25] border border-rule bg-surface shadow-sm">
          <iframe
            className="block h-full w-full"
            title="Your page, small"
            tabIndex={-1}
            sandbox=""
            srcDoc={pageHtml(project)}
          />
        </div>
      </div>
    </button>
  );
}

/** Owner-word topic for a step; consecutive equal topics collapse into one trail entry. */
function topicOf(step: Step): string {
  switch (step.id) {
    case "preset":
      return "start";
    case "name":
      return "name";
    case "tagline":
      return "tagline";
    case "logo":
      return "logo";
    case "brand":
      return "colour";
    case "links":
    case "linkUrl":
      return "links";
    case "hours":
      return "hours";
    case "contact":
      return "contact";
    case "address":
      return "address";
    case "social":
      return "social";
  }
}

/**
 * Rival B: position without a total. Topics already answered in quiet ink, the current one in
 * full ink. Nothing ahead is named, nothing is counted, so nothing ever jumps backwards.
 */
export function TopicTrail({
  steps,
  at,
}: {
  readonly steps: readonly Step[];
  readonly at: number;
}): JSX.Element {
  const trail: string[] = [];
  for (const step of steps.slice(0, at + 1)) {
    const topic = topicOf(step);
    if (trail[trail.length - 1] !== topic) trail.push(topic);
  }

  return (
    <p className="mb-6 border-b border-rule pb-2 font-sans text-sm text-ink-quiet">
      {trail.map((topic, index) => (
        <span key={topic}>
          {index > 0 && <span aria-hidden="true"> · </span>}
          <span className={index === trail.length - 1 ? "text-ink" : undefined}>{topic}</span>
        </span>
      ))}
    </p>
  );
}
