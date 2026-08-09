import type { JSX, ReactNode } from "react";

/**
 * The shell every question in the flow wears. `SPEC.md` §7.2, §7.6.
 *
 * **One question per screen**, so there is one `<h1>`, one group of controls and one way
 * onward. The shape is the same at every width — §7.6's "the same interaction at two sizes"
 * applies to the questions as much as to the drawer, so nothing here branches on a viewport.
 *
 * **The escape is part of the shell, not part of a question.** §7.2 requires an always-present
 * "not for us" on every step the owner may decline, and putting it here rather than leaving it
 * to each screen is what makes "always-present" checkable: a question that forgets it has to
 * forget a prop, and `flow.test.tsx` walks every step asserting one is there.
 *
 * The two questions without an escape are the two the page cannot be built without — the
 * business name (§2.3) and the brand colour (§3.1). §4.6 is explicit that these are *collected*
 * rather than defaulted, so declining one would have to invent an answer, and inventing is the
 * thing this flow exists not to do.
 */

export interface Escape {
  /** Written as the owner's own sentence about their business, never as "skip". */
  readonly label: string;
  readonly onEscape: () => void;
}

export interface QuestionProps {
  readonly title: string;
  /** One quiet line under the title, where the question genuinely needs one. */
  readonly hint?: ReactNode;
  readonly children?: ReactNode;
  /** Absent on the two required questions, and only there. */
  readonly escape?: Escape;
  /** Absent on step one, which is answered by choosing rather than by continuing. */
  readonly onSubmit?: () => void;
  readonly submitLabel?: string;
  /**
   * Continue is unavailable until the answer is one.
   *
   * Paired with the escape, this is the mechanism behind "a ticked-but-empty section is not a
   * state that exists" at the surface: there is a way past every screen without answering it,
   * and it is never the button that writes.
   */
  readonly submitDisabled?: boolean;
  /** Shown while the flow is past its first screen. */
  readonly onBack?: () => void;
  /** Below the controls: §7.8's quiet line, and §7.9's message when there is one. */
  readonly footer?: ReactNode;
}

export function Question({
  title,
  hint,
  children,
  escape,
  onSubmit,
  submitLabel = "Continue",
  submitDisabled = false,
  onBack,
  footer,
}: QuestionProps): JSX.Element {
  return (
    <section className="question">
      {/*
       * A form, so Enter submits — the owner typing a business name should not have to find a
       * button. `noValidate` because the browser's own bubbles are the modal §7.9 rules out.
       */}
      <form
        className="question__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!submitDisabled) onSubmit?.();
        }}
      >
        <h1 className="question__title">{title}</h1>
        {hint !== undefined && <p className="question__hint">{hint}</p>}

        <div className="question__body">{children}</div>

        {onSubmit !== undefined && (
          <button type="submit" className="question__submit" disabled={submitDisabled}>
            {submitLabel}
          </button>
        )}

        {escape !== undefined && (
          <button type="button" className="question__escape" onClick={escape.onEscape}>
            {escape.label}
          </button>
        )}
      </form>

      {footer !== undefined && <div className="question__footer">{footer}</div>}

      {onBack !== undefined && (
        <button type="button" className="question__back" onClick={onBack}>
          Back
        </button>
      )}
    </section>
  );
}

/** A labelled control. The label is always visible — a placeholder is not a label. */
export function Field({
  label,
  hint,
  children,
}: {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  readonly children: ReactNode;
}): JSX.Element {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {hint !== undefined && <span className="field__hint">{hint}</span>}
      {children}
    </label>
  );
}
