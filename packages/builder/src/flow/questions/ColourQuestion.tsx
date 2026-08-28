import { parseHex } from "@linkpage/renderer";
import { useState, type JSX } from "react";
import { TextField } from "../../ui/TextField.js";
import { Question } from "./Question.js";

/**
 * The brand colour. `SPEC.md` §3.1, §3.3, §4.6.
 *
 * **Required, and the one thing the owner must give** — so, like the business name, this
 * screen has no "not for us". §4.6 is explicit that a file arriving without `style.brand` is
 * walked through this question rather than defaulted, which is exactly what an owner ticking a
 * new section gets, and why this file is reached identically on day one and on an import.
 *
 * **Readability is guaranteed by a constrained field rather than by warnings** (§3.3). The
 * swatches are that field: every one of them carries a filled button as given, so an owner who
 * picks from it is never quietly stepped back and never told off. The exact-hex box beside them
 * is the escape hatch
 * §3.3 requires — **a hand-typed hex is honoured exactly**, and if it cannot carry the page it
 * steps back to a quieter role in the derivation rather than being rejected or corrected here.
 *
 * The one thing this screen refuses is a value that is not a colour at all: `#brand` cannot be
 * honoured exactly because there is nothing to honour. That is a format hint, not a judgement
 * about the owner's taste, and §3.3's promise is untouched by it.
 *
 * **No `style` field but this one is set here**, and the preset sets none of them (§7.3). The
 * remaining five controls have defaults and meet the owner on _How it looks_ (§7.4).
 */

/**
 * The constrained field (§3.3).
 *
 * Twelve, spread around the hue circle and dark enough that each carries a filled button in the
 * default mode without the derivation having to step it back — which is the property
 * `ColourQuestion.test.tsx` holds, and the one that makes this a *constrained* field rather than
 * a nice palette. They are ordinary brand colours rather than a designed sequence, because the
 * owner is looking for *theirs*: a florist scans for green, a barber for something dark.
 *
 * Kept here rather than in the renderer on purpose. The renderer derives a palette from
 * whatever it is given and has no opinion about what an owner might pick; a list of nice
 * starting colours is a builder concern, and §7.4's _How it looks_ step is its second caller.
 */
export interface Swatch {
  readonly hex: string;
  readonly name: string;
}

export const BRAND_SWATCHES: readonly Swatch[] = [
  { hex: "#b0122f", name: "Crimson" },
  { hex: "#c2185b", name: "Raspberry" },
  { hex: "#7b1fa2", name: "Grape" },
  { hex: "#4527a0", name: "Violet" },
  { hex: "#1565c0", name: "Cobalt" },
  { hex: "#00695c", name: "Teal" },
  { hex: "#2e7d32", name: "Forest" },
  { hex: "#556b2f", name: "Olive" },
  { hex: "#a05a00", name: "Amber" },
  { hex: "#bf360c", name: "Rust" },
  { hex: "#5d4037", name: "Cocoa" },
  { hex: "#37474f", name: "Slate" },
];

/**
 * What to call a colour: **our name for one of ours, and their own code for one of theirs**
 * (`SPEC.md` §3.1).
 *
 * Naming our own palette is a curated claim we can check. Naming the owner's colour is asserting
 * something about their brand — §7.3's rule about a wrong fact they never notice we asserted, at
 * its sharpest on the most personal decision on the page. So a typed hex is quoted back as a hex,
 * and that is a pleasing symmetry rather than a shortfall: §3.3 honours it exactly, and the review
 * row reports the owner's answer rather than the derivation's version of it.
 *
 * **Do not compute these from the hex.** It was built and measured before being rejected: an
 * untuned pass over these twelve calls `#b0122f` *orange* and collides two of them on one name,
 * and tuning cannot fix the shape of it — `#b0122f` and `#bf360c` sit 15° apart and want different
 * families, and brown, pink and navy are not hue bands at all. §3.1 records the numbers.
 */
export function colourName(value: string): string {
  const found = BRAND_SWATCHES.find((swatch) => swatch.hex === value.trim().toLowerCase());
  return found?.name ?? value.trim();
}

export interface ColourQuestionProps {
  readonly initial: string | undefined;
  readonly onAnswer: (brand: string) => void;
  readonly onBack?: () => void;
}

export function ColourQuestion({ initial, onAnswer, onBack }: ColourQuestionProps): JSX.Element {
  const [brand, setBrand] = useState(initial ?? "");
  const [typed, setTyped] = useState(
    initial !== undefined && !BRAND_SWATCHES.some((swatch) => swatch.hex === initial)
      ? initial
      : "",
  );

  const typedIsColour = typed.trim() !== "" && parseHex(typed.trim()) !== null;
  const answer = typedIsColour ? typed.trim() : brand;

  return (
    <Question
      title="What's your colour?"
      hint="Everything else on the page is worked out from it."
      onSubmit={() => onAnswer(answer)}
      // §7.9 decision 1: `Continue` keeps its single meaning — *you haven't answered yet* — and
      // nothing about the *shape* of an answer can take it away. Before this, a swatch plus junk
      // in the box killed the button even though a perfectly good answer was selected.
      //
      // **And typing into the box counts as having tried** (CL-1, finding A-1). The half of that
      // rule that survived did so in the swatch case only: with nothing picked and `zzzzzz` in
      // the box, `answer` was still `""`, so `Continue` went away — **and a disabled button
      // leaves the tab order**, so a keyboard owner tabbed the whole step, wrapped, and never
      // met the button, the sentence, or any cue that something was wrong. The shape of what
      // they typed was taking `Continue` away after all; it was just doing it through `answer`.
      //
      // The sentence is the fix SC 3.3.1 asks for, and §7.9 decision 2 says it speaks **on
      // `Continue` and not before** — so there has to be a `Continue` to press. Judging on a
      // keystroke instead is the option decision 2 has already refused, with the #138 walk's
      // reason. So: anything in the box keeps the button, and pressing it is answered with the
      // sentence rather than with silence.
      submitDisabled={answer === "" && typed.trim() === ""}
      onBack={onBack}
    >
      <ul className="m-0 flex list-none flex-row flex-wrap gap-3 p-0">
        {BRAND_SWATCHES.map((swatch) => (
          <li key={swatch.hex}>
            <button
              type="button"
              // The picked mark is `theme.css`'s one `picked` (#192) — the same mark the preset
              // rows, the hours segments and the language list take. This is the control it was
              // shaped around: the only picked thing in the tool with a fill of its own, which is
              // why the mark brings a clearing of ground with it rather than being laid on ink.
              className="size-12 rounded-full border border-rule aria-pressed:picked"
              data-swatch
              style={{ background: swatch.hex }}
              // The name, not the code: a screen reader hears twelve names rather than twelve
              // hexes, which was the walk's actual complaint (§3.1).
              aria-label={swatch.name}
              aria-pressed={answer.toLowerCase() === swatch.hex}
              onClick={() => {
                setBrand(swatch.hex);
                setTyped("");
              }}
            />
          </li>
        ))}
      </ul>

      {/*
       * Once, under the grid, for the colour chosen — **the grid stays a grid** (§3.1). Twelve
       * labelled rows would turn a compact field into a long list on the primary screen, and an
       * owner hunting for their green scans colours rather than words. Announcing without showing
       * was rejected too: they would meet *Raspberry* for the first time in the review row, with
       * nothing where they chose it to say where the word came from.
       */}
      {/*
       * Pulled back to 8px of the grid, because it belongs to it and not to the field below it —
       * `-mt-6` against the stack's 32px is what buys that. As a plain child of
       * the stack it sat the same distance from both, so nothing said which it was reporting on
       * (B-13); this is the codebase's own grouping idiom, the one the preamble and the question
       * hint already use.
       */}
      {answer !== "" && <p className="-mt-6 text-base">Your colour: {colourName(answer)}</p>}

      {/*
       * Judged on `Continue` and not before (§7.9 decision 2, #142) — typing junk no longer
       * draws the sentence per keystroke. The swatch underneath still stands either way, and
       * `Continue` is not disabled by it (decision 1); a submit with junk in the box stays to
       * say why the typing had no effect, and the sentence clears the moment the box does.
       */}
      <TextField
        label="Or type your exact colour"
        hint="From a designer or a brand guide."
        name="exactColour"
        validate={(value) =>
          value.trim() === "" || parseHex(value.trim()) !== null
            ? true
            : "This won't change your colour — a colour looks like #c2185b."
        }
        value={typed}
        onValueChange={setTyped}
        placeholder="#c2185b"
        spellCheck={false}
        autoCapitalize="none"
      />
    </Question>
  );
}
