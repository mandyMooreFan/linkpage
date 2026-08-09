import { useState, type JSX } from "react";
import { Field, Question } from "./Question.js";

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
  readonly onBack?: () => void;
}

export function NameQuestion({ initial, onAnswer, onBack }: NameQuestionProps): JSX.Element {
  const [name, setName] = useState(initial ?? "");

  return (
    <Question
      title="What's it called?"
      hint="The name at the top of your page."
      onSubmit={() => onAnswer(name)}
      submitDisabled={name.trim() === ""}
      onBack={onBack}
    >
      <Field label="Business name">
        <input
          type="text"
          className="input"
          value={name}
          autoComplete="organization"
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
    </Question>
  );
}

export interface TaglineQuestionProps {
  readonly initial: string | undefined;
  readonly onAnswer: (tagline: string) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function TaglineQuestion({
  initial,
  onAnswer,
  onSkip,
  onBack,
}: TaglineQuestionProps): JSX.Element {
  const [tagline, setTagline] = useState(initial ?? "");

  return (
    <Question
      title="One line about what you do?"
      hint="It sits under your name. Plenty of pages do fine without one."
      onSubmit={() => onAnswer(tagline)}
      submitDisabled={tagline.trim() === ""}
      escape={{ label: "We don't need one", onEscape: onSkip }}
      onBack={onBack}
    >
      <Field label="Tagline">
        <input
          type="text"
          className="input"
          value={tagline}
          onChange={(event) => setTagline(event.target.value)}
        />
      </Field>
    </Question>
  );
}
