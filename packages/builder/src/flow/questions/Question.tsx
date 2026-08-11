import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useId,
  type JSX,
  type ReactElement,
  type ReactNode,
} from "react";

/**
 * The shell every question wears. `SPEC.md` §7.2, §7.4, §7.6.
 *
 * **One question per screen**, so there is one heading, one group of controls and one way
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
 *
 * **A question is also what the review list opens when a row is edited** (§7.4, §7.1: "the list
 * holds everything that already exists"). Editing opening hours a month later *is* the hours
 * question, so the list renders the same component rather than a second form that could drift
 * from it — and the escape it already carries is the removal, since both roads end at a project
 * with no such key. Two things differ between a screen and a row, and both are properties of
 * the shell rather than of any question: the heading is an `<h2>` under the list's own title,
 * and the button says *Save* rather than *Continue*. `QuestionShellProvider` carries them, so
 * no question has to know where it is being rendered.
 */

/** What the surrounding screen makes of a question. See `QuestionShellProvider`. */
export interface QuestionShell {
  /** `1` on a screen of its own, `2` inside a review-list row. */
  readonly level: 1 | 2;
  /** The verb on the submit button when a question does not name its own. */
  readonly submitLabel: string;
}

/** The flow: a question is the screen, and answering it moves on. */
const FLOW_SHELL: QuestionShell = { level: 1, submitLabel: "Continue" };

const ShellContext = createContext<QuestionShell>(FLOW_SHELL);

export function QuestionShellProvider({
  shell,
  children,
}: {
  readonly shell: QuestionShell;
  readonly children: ReactNode;
}): JSX.Element {
  return <ShellContext.Provider value={shell}>{children}</ShellContext.Provider>;
}

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
  /** Overrides the shell's verb, for a question whose button is about something else. */
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
  submitLabel,
  submitDisabled = false,
  onBack,
  footer,
}: QuestionProps): JSX.Element {
  const shell = useContext(ShellContext);

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
        {shell.level === 1 ? (
          <h1 className="question__title">{title}</h1>
        ) : (
          <h2 className="question__title">{title}</h2>
        )}
        {hint !== undefined && <p className="question__hint">{hint}</p>}

        <div className="question__body">{children}</div>

        {onSubmit !== undefined && (
          <button type="submit" className="question__submit" disabled={submitDisabled}>
            {submitLabel ?? shell.submitLabel}
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

/**
 * The elements a `<label>` can actually be *for*.
 *
 * `htmlFor` pointing at anything else associates the label with nothing, which is worse than the
 * imprecise name it would have replaced — so `Field` checks rather than assumes. The check exists
 * because the obvious version of it does not work: the *Something else* row **is** a single valid
 * element, a `<span>` wrapping two controls, so "did I get one element?" cheerfully answers yes
 * and produces a label attached to a span.
 *
 * A component rather than a host element (`typeof type !== "string"`) is also excluded: what it
 * renders is its own business and may not be labelable at all.
 */
const LABELABLE = new Set(["button", "input", "meter", "output", "progress", "select", "textarea"]);

type Associable = ReactElement<{ id?: string; "aria-describedby"?: string }>;

function labelableControl(children: ReactNode): Associable | undefined {
  if (!isValidElement(children)) return undefined;
  return typeof children.type === "string" && LABELABLE.has(children.type)
    ? (children as Associable)
    : undefined;
}

/**
 * A labelled control. The label is always visible — a placeholder is not a label.
 *
 * **A real `<label>` pointed at one control, always.** Two bugs came out of not doing that, and
 * they were the same bug twice: a `<label>` names the control inside it from *everything* inside
 * it, so anything else in there joins the name. A hint did (#91), and so did the Add button in the
 * *Something else* row, whose input announced as `"Something elseAdd"` (#98).
 *
 * So `Field` stopped wrapping and started pointing. It generates an id, clones it onto the control
 * and uses `htmlFor`, which fixes both by construction: the only thing that can join a name now is
 * the label's own text. A composite — more than one control in a row — names which one it means by
 * passing `htmlFor` itself.
 *
 * **`htmlFor` rather than `aria-labelledby`, and the difference is a real one I got wrong first.**
 * #91 used `aria-labelledby` because it needs no id on the control. It names correctly and reads
 * correctly, and it silently costs the click target: clicking the words *Corner softness* stopped
 * focusing the slider, because only a real label association does that. An id is cheap; that is not.
 *
 * A hint sits outside the label and is attached with `aria-describedby` — the attribute that means
 * *supplementary*, which is what a hint is.
 */
export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /**
   * The id of the control this labels, for a field holding more than one.
   *
   * Only composites need it. The *Something else* row is an input and an Add button, and `Field`
   * must not guess which of the two the label belongs to — so that caller says.
   */
  readonly htmlFor?: string;
  readonly children: ReactNode;
}): JSX.Element {
  const generatedId = useId();
  const hintId = useId();

  const control = labelableControl(children);

  // A caller's own id wins over ours: it may already be referenced by something else.
  const target = htmlFor ?? control?.props.id ?? (control === undefined ? undefined : generatedId);

  // Nothing to point at — several controls and no `htmlFor`. Wrapping is the only association
  // left, and it is what this component did before; the name is imprecise but present, which
  // beats a label attached to nothing. No caller is in this state.
  if (target === undefined) {
    return (
      <label className="field">
        <span className="field__label">{label}</span>
        {hint !== undefined && <span className="field__hint">{hint}</span>}
        {children}
      </label>
    );
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={target}>
        {label}
      </label>
      {hint !== undefined && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {htmlFor !== undefined || control === undefined
        ? children
        : cloneElement(control, {
            id: target,
            ...(hint === undefined ? {} : { "aria-describedby": hintId }),
          })}
    </div>
  );
}
