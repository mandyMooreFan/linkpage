import type { InputHTMLAttributes, JSX, Ref } from "react";

/**
 * The slider, in the tool's own ink (#375; the pattern is `Checkbox.tsx`, #193).
 *
 * **One slider in the whole tool** — §3.1's corner softness — and it was the browser's: a blue
 * track and a blue thumb, the only saturated colour on the style row apart from the swatches
 * themselves, which are the owner's colours and not ours. `accent-ink` puts the filled part of
 * the track and the thumb in `--color-ink`; the empty part of the track stays the browser's
 * grey, which is what a slider's empty half looks like everywhere and needs no invention.
 *
 * Native rendering is kept, for `Checkbox.tsx`'s reason: a slider redrawn from `appearance-none`
 * is two pseudo-elements per engine and a track that has to be re-derived from the value, to
 * arrive at what the browser already paints once the colour is right.
 *
 * **`tap` is on the control itself here**, unlike the tick box and the radio: a slider is as
 * wide as its field, so the min-height makes a taller strip to press rather than a stretched
 * mark, and it is the control — not a label — that the thumb is dragged inside.
 */

/** The one recipe. Exported so `controls.test.ts` can assert on it rather than re-spell it. */
export const SLIDER_CLASS = "tap w-full accent-ink";

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  readonly ref?: Ref<HTMLInputElement>;
}

export function Slider({ className, ...rest }: SliderProps): JSX.Element {
  return <input type="range" className={`${SLIDER_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}
