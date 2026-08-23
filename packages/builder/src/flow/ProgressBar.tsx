import type { JSX } from "react";
import type { Step } from "./plan.js";

/**
 * The flow's progress bar. `SPEC.md` §7.2, §7.4's one exception, §7.11 (#139, #146).
 *
 * **It counts topics, not screens.** The old refusal of a progress indicator was sound about
 * screens — the link run appends one per pick, so any screen-denominated count must jump
 * backwards or be clamped. The bar's units are the run's *topics*: the link run is one unit
 * however many picks enlarge it, so the total is fixed the moment the preset is picked and
 * never grows. `barUnits` is that grouping, exported so the test can hold the arithmetic still.
 *
 * **The fill means completion, not position, and it never retreats.** A unit is done once the
 * owner has moved past its last screen — answered or escaped, both are decisions — and `high`
 * is the furthest the run has reached rather than where the owner is standing, so `Back` never
 * pulls the fill down. Jumped-over territory (#150) will show as the gap between the count and
 * the total, which is the honest report.
 *
 * **Absent on the preset screen**, where the plan is one item long and a total does not exist
 * yet — the one place the old arithmetic still holds (§7.2).
 *
 * **This is §7.4's one deliberate exception to paper**: a rounded grey track with a coloured
 * fill, the standard pattern's own vocabulary. The two colours live in `theme.css` under the
 * same sentence and are scoped to this bar; nothing else may borrow them for decoration.
 *
 * The bar is static chrome (§7.11): `Flow.tsx` renders it outside the subtree that remounts
 * per screen, which is what lets the fill tween instead of blinking.
 */

/** One bar unit: a topic's label and the span of screens it owns in this plan. */
export interface BarUnit {
  readonly label: string;
  readonly first: number;
  readonly last: number;
}

/** Owner words, sized for one line. §7.3's table words where one exists. */
const LABELS: Readonly<Record<Exclude<Step["id"], "preset">, string>> = {
  name: "Name",
  tagline: "Tagline",
  logo: "Logo",
  brand: "Colour",
  links: "Link buttons",
  linkUrl: "Link buttons",
  hours: "Opening hours",
  contact: "Phone and email",
  address: "Address",
  social: "Social accounts",
};

/** Group a plan's screens into topics: consecutive link screens are one unit, preset is none. */
export function barUnits(steps: readonly Step[]): readonly BarUnit[] {
  const units: { label: string; first: number; last: number }[] = [];
  steps.forEach((step, index) => {
    if (step.id === "preset") return;
    const label = LABELS[step.id];
    const tail = units[units.length - 1];
    if (tail?.label === label) tail.last = index;
    else units.push({ label, first: index, last: index });
  });
  return units;
}

export interface ProgressBarProps {
  readonly steps: readonly Step[];
  /** The screen the owner is on. */
  readonly at: number;
  /** The furthest screen this run has reached — the high-water mark, never `at` itself. */
  readonly high: number;
}

export function ProgressBar({ steps, at, high }: ProgressBarProps): JSX.Element | null {
  const step = steps[Math.min(at, steps.length - 1)];
  if (step === undefined || step.id === "preset") return null;

  const units = barUnits(steps);
  if (units.length === 0) return null;

  const done = units.filter((unit) => unit.last < high).length;
  const current = units.find((unit) => at >= unit.first && at <= unit.last);

  return (
    <div className="mb-6 font-sans" data-progress-bar>
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-ink">{current?.label}</span>
        <span className="text-ink-quiet">
          {done} of {units.length} done
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-progress-track" aria-hidden="true">
        <div
          className="h-2 rounded-full bg-progress transition-[width] duration-500 ease-out"
          style={{ width: `${(done / units.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
