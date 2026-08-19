import type { Clock, WeekStart } from "@linkpage/renderer";

/**
 * The two hours display preferences, seeded from the browser once at first run (`SPEC.md` §4.1).
 *
 * **Builder-side only, and that is the decision rather than an implementation detail.** §6.7 bans
 * `Intl` in the *renderer* because the same file must render identically in the browser preview
 * and in Node, and the two do not agree: `cy-GB` resolves to a 12-hour cycle in one runtime and a
 * 24-hour cycle in the other. Deriving at render time would make a Welsh page's times depend on
 * which runtime drew it. A value computed here and **written into `project.json`** is not a
 * render-time read.
 *
 * **§7.3's no-defaulted-facts rule is not in tension with this.** §2.3 calls both of these display
 * preferences rather than facts about the business — the page still asserts nothing the owner did
 * not say.
 *
 * Every function here is total. A runtime missing `Intl.Locale`, `getWeekInfo`, or a sensible
 * `hourCycle` lands on the value the builder used to hardcode, so the worst case is exactly
 * today's behaviour.
 */

/**
 * `hourCycle` → §2.3's `clock`.
 *
 * Split out from the environment read so it can be tested exhaustively. **The mapping is what is
 * ours; which cycle a locale resolves to is CLDR's and differs between runtimes**, so a test that
 * asserted "`en-GB` is 24-hour" would be asserting something this project does not control — the
 * exact trap §4.1 records.
 */
export function clockFromHourCycle(hourCycle: string | undefined): Clock {
  return hourCycle === "h23" || hourCycle === "h24" ? "24h" : "12h";
}

/**
 * `getWeekInfo().firstDay` → §2.3's `weekStart`, where 1 is Monday and 7 is Sunday.
 *
 * **Only Sunday is representable besides Monday**, so `ar-EG`'s Saturday (6) lands on `"mon"` —
 * exactly where it lands today. Widening `WeekStart` was rejected as a §4.8 schema change to a
 * v1-stable type for one rounding: this is never worse than the old hardcoded default, and right
 * for the US and Japan where that default was wrong.
 */
export function weekStartFromFirstDay(firstDay: number | undefined): WeekStart {
  return firstDay === 7 ? "sun" : "mon";
}

/** What the browser says about the 12/24-hour clock, or `"12h"` if it will not say. */
export function browserClock(locale?: string): Clock {
  try {
    return clockFromHourCycle(
      new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle,
    );
  } catch {
    return "12h";
  }
}

/** What the browser says about the first day of the week, or `"mon"` if it will not say. */
export function browserWeekStart(locale?: string): WeekStart {
  try {
    const tag = locale ?? globalThis.navigator?.language;
    if (tag === undefined) return "mon";
    // `getWeekInfo` is the standard shape; some engines still expose the `weekInfo` accessor.
    const resolved = new Intl.Locale(tag) as Intl.Locale & {
      getWeekInfo?: () => { firstDay?: number };
      weekInfo?: { firstDay?: number };
    };
    const info = resolved.getWeekInfo?.() ?? resolved.weekInfo;
    return weekStartFromFirstDay(info?.firstDay);
  } catch {
    return "mon";
  }
}

/**
 * The seeded pair, resolved **once** for the session.
 *
 * Once, because §4.1 says derive once and store: a value that changed under the owner mid-session
 * would be a preference re-deriving rather than a preference.
 */
export const SEEDED_HOURS_PREFERENCES: { readonly clock: Clock; readonly weekStart: WeekStart } = {
  clock: browserClock(),
  weekStart: browserWeekStart(),
};
