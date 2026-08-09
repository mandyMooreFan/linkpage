import type { Draft } from "../project/index.js";
import type { LogoIntake } from "./intake.js";

/**
 * The seam between the pipeline and the store.
 *
 * **A failed input never damages what is already there** (§6.5). That is a promise about
 * state, and the way it is kept is that there is only one function that can change any, and
 * it takes the whole result rather than a logo: on the rejected branch of the union there is
 * no logo to apply, so leaving the draft alone is not a rule anyone has to remember. A screen
 * that shows the failure message and calls this on the same value cannot get it wrong.
 *
 * The draft goes on to `ProjectStore.update`, which merges it into the document it came from
 * and autosaves — so unknown keys survive the upload exactly as they survive any other edit
 * (§4.5).
 */
export function applyIntake(draft: Draft, result: LogoIntake): Draft {
  if (!result.ok) return draft;
  return { ...draft, header: { ...draft.header, logo: result.logo } };
}

/** Remove the logo. Separate from `applyIntake` because it is a different intention (§7.4). */
export function clearLogo(draft: Draft): Draft {
  return { ...draft, header: { ...draft.header, logo: null } };
}
