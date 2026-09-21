import { useState, type JSX } from "react";
import { TextField } from "../../ui/TextField.js";
import { Question } from "./Question.js";
import { useTyping } from "./typing.js";

/**
 * The two text questions about the business itself. `SPEC.md` §2.3, §4.6.
 *
 * **The name has no escape and that is not an oversight.** §7.2 puts an always-present "not
 * for us" on every step, and it is the two required fields that the sentence cannot reach: a
 * page with no name has nothing to be, `alt=""` on the logo is correct *only* while the name
 * is required and rendered (§6.6), and §4.6 forbids inventing one. So the escape's job — "skip
 * it and you don't have it" — has no meaning here, and offering one would either produce a
 * nameless page or a made-up name. The tagline beside it is optional and carries the escape in
 * full.
 *
 * Both screens are the same shape whether they arrive on day one or a month later from the
 * list, and both are pre-filled from the draft, because §4.6 sends a file that is *missing* a
 * name down this path too.
 */

export interface NameQuestionProps {
  readonly initial: string | undefined;
  readonly onAnswer: (name: string) => void;
  /** The name as it stands while it is typed, for the page beside the question (#373). */
  readonly onTyping?: (name: string) => void;
  readonly onBack?: () => void;
}

export function NameQuestion({
  initial,
  onAnswer,
  onTyping,
  onBack,
}: NameQuestionProps): JSX.Element {
  const [name, setName] = useState(initial ?? "");
  useTyping(name, onTyping);

  return (
    <Question
      title="What's it called?"
      hint="The name at the top of your page."
      onSubmit={() => onAnswer(name)}
      onBack={onBack}
    >
      {/*
       * The whole answer is this one field, so §7.9 decision 1's sentence is the field's own
       * (#368): under the box, on `Continue`, with `aria-invalid` on the box it is about. There
       * is no escape here to name — this is the one screen with no way past but answering.
       */}
      {/*
       * **The line wraps rather than scrolling its end out of sight** (#399, filed to wait from
       * #382, which mended the tagline and named only the tagline). Measured at `c3a2933` before
       * turning it on: a 72-character trading name is 592px of text in a 350px box at 390 — 242px
       * of the owner's own name out of sight, with nothing saying more of it exists — and 80px at
       * 1440. §7.4 lists *a long business name* beside *a long tagline* as the two single long
       * answers, so the two boxes now answer to the same rule.
       *
       * **`autoComplete` survives the change**, which is what the ticket asked to check before
       * this was turned on: WHATWG's autofill table puts `organization` in the Text control
       * group — *"input (Hidden, Text, Search), textarea, select"* — so a wrapping box is as
       * valid a target as the one-line box was, and `wrappingInput` passes the attribute through.
       */}
      <TextField
        label="Business name"
        value={name}
        onValueChange={setName}
        autoComplete="organization"
        name="name"
        wraps
        validate={(value) =>
          value.trim() === "" ? "The page needs a name — type it here to go on." : true
        }
      />
    </Question>
  );
}

export interface TaglineQuestionProps {
  readonly initial: string | undefined;
  readonly onAnswer: (tagline: string) => void;
  /** The tagline as it stands while it is typed, for the page beside the question (#373). */
  readonly onTyping?: (tagline: string) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function TaglineQuestion({
  initial,
  onAnswer,
  onTyping,
  onSkip,
  onBack,
}: TaglineQuestionProps): JSX.Element {
  const [tagline, setTagline] = useState(initial ?? "");
  useTyping(tagline, onTyping);

  return (
    <Question
      title="One line about what you do?"
      hint="It sits under your name. Plenty of pages do fine without one."
      onSubmit={() => onAnswer(tagline)}
      escape={{ label: "We don't need one", onEscape: onSkip }}
      onBack={onBack}
    >
      {/*
       * One line on the page, and longer than a phone's box: the line wraps rather than
       * scrolling the end out of sight (#382). The name's box above took the same rule in #399,
       * so the two single long answers §7.4 names are now one shape rather than two.
       */}
      <TextField
        label="Tagline"
        value={tagline}
        onValueChange={setTagline}
        name="tagline"
        wraps
        validate={(value) =>
          value.trim() === "" ? "Nothing typed yet — add a line, or say you don't need one." : true
        }
      />
    </Question>
  );
}
