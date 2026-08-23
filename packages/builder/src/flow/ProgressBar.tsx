import { useId, useState, type JSX } from "react";
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
 * owner has left it forwards — answered or escaped, both are decisions — and done-ness is a
 * per-unit set rather than a position, so neither `Back` nor a jump can pull the fill down,
 * and territory jumped over shows as the gap between the count and the total, which is the
 * honest report.
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
  /**
   * Labels of the units the owner has left forwards — answered or escaped, both decisions.
   * A set rather than a high-water mark because jumping exists: territory jumped over is not
   * done, and shows as the gap between this count and the total (§7.2).
   */
  readonly done: ReadonlySet<string>;
  /** Jump to a screen (§7.2: the bar is the run's navigation). Discards like `Back` does. */
  readonly onJump: (index: number) => void;
  /**
   * End the run here (§7.1's "Done for now"). Present only on a re-entry run — a first run
   * ends by walking off, and the required questions of a resume cannot be abandoned.
   */
  readonly onLeave?: () => void;
}

export function ProgressBar({
  steps,
  at,
  done,
  onJump,
  onLeave,
}: ProgressBarProps): JSX.Element | null {
  const [open, setOpen] = useState(false);
  const listId = useId();

  const step = steps[Math.min(at, steps.length - 1)];
  if (step === undefined || step.id === "preset") return null;

  const units = barUnits(steps);
  if (units.length === 0) return null;

  const finished = units.filter((unit) => done.has(unit.label)).length;
  const current = units.find((unit) => at >= unit.first && at <= unit.last);

  return (
    <div className="mb-6 font-sans" data-progress-bar>
      {/*
       * The whole bar is the control (§7.2): full-width named rows beat per-segment targets on
       * a phone, so tapping anywhere on it drops open the run's topic list.
       */}
      <button
        type="button"
        className="block w-full cursor-pointer bg-transparent p-0 text-left"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-baseline justify-between text-sm">
          <span className="font-medium text-ink">{current?.label}</span>
          <span className="text-ink-quiet">
            {finished} of {units.length} done
          </span>
        </span>
        <span
          className="mt-2 block h-2 overflow-hidden rounded-full bg-progress-track"
          aria-hidden="true"
        >
          <span
            className="block h-2 rounded-full bg-progress transition-[width] duration-500 ease-out"
            style={{ width: `${(finished / units.length) * 100}%` }}
          />
        </span>
      </button>
      <ul
        className="m-0 mt-3 list-none border-t border-rule p-0"
        id={listId}
        hidden={!open}
        data-topic-list
      >
        {units.map((unit) => (
          <li key={unit.label} className="border-b border-rule">
            <button
              type="button"
              className="tap flex w-full items-baseline justify-between bg-transparent px-1 py-2 text-left"
              aria-current={unit === current ? "step" : undefined}
              onClick={() => {
                setOpen(false);
                onJump(unit.first);
              }}
            >
              <span className={unit === current ? "font-medium text-ink" : "text-ink"}>
                {unit.label}
              </span>
              {done.has(unit.label) && <span className="text-sm text-ink-quiet">done</span>}
            </button>
          </li>
        ))}
        {onLeave !== undefined && (
          <li className="border-b border-rule">
            <button
              type="button"
              className="tap block w-full bg-transparent px-1 py-2 text-left text-ink-quiet"
              onClick={onLeave}
            >
              Done for now
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
