import { Button } from "../../ui/Button.js";
import { LADDER } from "../../ui/ladder.js";
import { TextArea, TextInput, UrlInput } from "../../ui/TextInput.js";
import { HEADING, TYPE } from "../../ui/type.js";
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
import { FormProvider, useForm, useFormContext, useFormState } from "react-hook-form";
import { useEffect, useRef } from "react";

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
 * **The escape is a `secondary`, not a `quiet`** (#189). It is a real branch of the flow — "we
 * don't have set hours" is an answer, and the project it produces is as finished as the one
 * Continue produces — so §4's secondary recipe is what it is owed: the hairline outline, and the
 * radius, padding and type it already shares with `primary`, differing from it only in fill.
 * `quiet` gave it none of those, so a branch read as a footnote and, worse, read as *the same
 * kind of thing* as `Back` one line below it, which is genuinely tertiary. `Back` stays `quiet`
 * for exactly that reason: the two now differ because they differ.
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
  /**
   * §7.3's orientation (#141): one quiet line above the title, so the screen's first words are
   * orientation and its first act is still the question. Step one carries it; nothing else
   * does — a preamble on every screen would be chrome, and the bar already says where you are.
   */
  readonly preamble?: string;
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
  preamble,
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

  /**
   * §7.9 decision 2 (#142): judgement speaks on `Continue` and not before, then re-checks
   * live. react-hook-form is the error store every question shares — `useJudged` below is how
   * a field opts in — and the judging itself runs synchronously at submit, because a valid
   * answer must advance in the same tick it always did. A field without a judge — phone,
   * email, a web address — is never judged on screen, and its notice stays the review list's
   * mark (decision 5). A submit with something unusable shows its sentences and stays;
   * `submitDisabled` remains what it always was — presence, never shape (decision 1).
   */
  const form = useForm();
  const judges = useRef(new Map<string, () => string | true>());

  return (
    <FormProvider {...form}>
      <JudgeContext.Provider value={judges.current}>
        <section className="font-serif">
          {/*
           * A form, so Enter submits — the owner typing a business name should not have to
           * find a button. `noValidate` because the browser's own bubbles are the modal §7.9
           * rules out.
           */}
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              if (submitDisabled) return;
              let held = false;
              for (const [name, judge] of judges.current) {
                const verdict = judge();
                if (verdict === true) form.clearErrors(name);
                else {
                  form.setError(name, { type: "unusable", message: verdict });
                  held = true;
                }
              }
              if (!held) onSubmit?.();
            }}
          >
            {preamble !== undefined && (
              <p className={`-mb-2 font-sans ${TYPE.quietLine.className}`} data-question-preamble>
                {preamble}
              </p>
            )}
            {shell.level === 1 ? (
              <h1 className={HEADING.page.className}>{title}</h1>
            ) : (
              <h2 className={HEADING.screen.className}>{title}</h2>
            )}
            {/*
             * **The same size as the preamble above the title** (B-30, design change 11). This was
             * `text-base`, which made one role — the component's own doc comment calls both of them
             * "one quiet line" — two sizes in one file, and made a hint the same size as the `Field`
             * label directly under it, separated from it by weight alone. `text-ink-quiet` was
             * always the instrument doing the de-emphasis, which is the order §2 asks for.
             */}
            {hint !== undefined && (
              <p className={`-mt-2 font-sans ${TYPE.quietLine.className}`} data-question-hint>
                {hint}
              </p>
            )}

            {/*
             * §1's ladder, and the widening the heading block never had. The two negative
             * margins above are correct grouping — they pull the preamble and the hint to 8px
             * of their title — but nothing then said the *group had ended*, so hint → first
             * field was the same 16px as field → field and the whole screen read as one stack.
             */}
            <div
              className={`${LADDER.outOfHeading.className} flex flex-col ${LADDER.betweenFields.className} font-sans`}
            >
              {children}
            </div>

            {onSubmit !== undefined && (
              <Button type="submit" weight="primary" className="mt-6" disabled={submitDisabled}>
                {submitLabel ?? shell.submitLabel}
              </Button>
            )}

            {escape !== undefined && (
              <Button weight="secondary" data-escape onClick={escape.onEscape}>
                {escape.label}
              </Button>
            )}
          </form>

          {footer !== undefined && (
            <div className="mt-8 border-t border-rule pt-4 font-sans">{footer}</div>
          )}

          {onBack !== undefined && (
            <Button
              weight="quiet"
              // The most separate thing on the screen, so it takes the inter-section rung rather
              // than the intra-form one it used to share with a gap between two fields (B-8).
              className={`${LADDER.betweenSections.className} text-ink-quiet`}
              onClick={onBack}
            >
              Back
            </Button>
          )}
        </section>
      </JudgeContext.Provider>
    </FormProvider>
  );
}

/**
 * The submit-time judges, one per field that opts in. A plain map rather than react-hook-form's
 * own registration because the judging must be synchronous — a valid answer advances in the
 * same tick it always did, and only an unusable one holds the screen to say its sentence.
 */
const JudgeContext = createContext<Map<string, () => string | true> | null>(null);

/**
 * Opt a field into §7.9's judgement (#142): silent until `Continue`, then the sentence under
 * the field, then re-checked on every change so it disappears the moment the value becomes
 * usable. Late to speak, quick to stop. Returns the sentence to show, or nothing.
 *
 * react-hook-form's form state is the store — `Question` provides it — so the sentence, its
 * timing and its clearing behave identically for every judged field in the builder.
 */
export function useJudged(
  name: string,
  value: string,
  validate: (value: string) => string | true,
): string | undefined {
  const form = useFormContext();
  const judges = useContext(JudgeContext);
  const latest = useRef({ value, validate });
  latest.current = { value, validate };

  useEffect(() => {
    judges?.set(name, () => latest.current.validate(latest.current.value));
    return () => {
      judges?.delete(name);
      // A field that leaves the screen takes its sentence with it: a submit must never be
      // held by a judgement nothing renders (a day switched to Closed, for instance).
      form.clearErrors(name);
    };
  }, [name, judges, form]);

  const state = useFormState();
  const error = form.getFieldState(name, state).error;

  // Quick to stop: once spoken, re-judge on every change until the sentence clears.
  useEffect(() => {
    if (error === undefined) return;
    const verdict = latest.current.validate(value);
    if (verdict === true) form.clearErrors(name);
    else if (verdict !== error.message) {
      form.setError(name, { type: "unusable", message: verdict });
    }
    // The judgement depends only on the value; everything else is read through refs.
  }, [value]);

  return error?.message;
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
 * A component is excluded by default for the same reason: what it renders is its own business and
 * may not be labelable at all. **The two exceptions are ours**, and they have to be named here or
 * the check quietly stops working. `TextInput` and `TextArea` each render exactly one labelable
 * host element and forward every attribute they are handed, so they are associable in the way an
 * `<input>` is — but they are functions, not strings, so the host-element test says no. It said no
 * to *every text field in the builder* between #183, which replaced the raw inputs with them, and
 * #187, which noticed: each one fell through to the wrapping-label branch below, where the hint
 * rejoins the accessible name — which is bug #91, restored by a refactor that changed no markup.
 * `TextField.test.tsx` now mounts the real component rather than a bare `<input>`, so the next
 * control that grows a wrapper fails a test instead of losing its description in silence.
 *
 * **`UrlInput` is the next control that grew one** (#197), and it is why this register is worth
 * more than the three lines it costs. It renders a `<span>` holding the `https://` prefix and the
 * box, which is exactly the shape the check below refuses to guess about — one element, two
 * children, and only one of them labelable. Named here, it is associated as precisely as an
 * `<input>`; unnamed, every web-address field in the builder would have gone back to the
 * wrapping branch and taken its hint into its name with it, for the second time.
 *
 * Note what it did *not* need: `htmlFor`. That seam is for a row holding more than one
 * **control**, and a prefix is not a control — it is text on the line. The half of it #187 built
 * for this ticket, a description that still reaches a control inside a wrapper, is the half that
 * mattered, and `UrlInput` gets it here.
 */
const LABELABLE = new Set(["button", "input", "meter", "output", "progress", "select", "textarea"]);
const LABELABLE_CONTROLS = new Set<unknown>([TextInput, TextArea, UrlInput]);

type Associable = ReactElement<{ id?: string; "aria-describedby"?: string }>;

function labelableControl(children: ReactNode): Associable | undefined {
  if (!isValidElement(children)) return undefined;
  const labelable =
    typeof children.type === "string"
      ? LABELABLE.has(children.type)
      : LABELABLE_CONTROLS.has(children.type);
  return labelable ? (children as Associable) : undefined;
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
 *
 * **And it sits below the control**, so a field reads *name → box → explanation* rather than
 * explanation first (#187). Nothing about the association moves with it: `aria-describedby` names
 * the hint wherever it is on screen, which is exactly why the order is free to be the right one.
 *
 * **The gaps are `ladder.ts`'s, not this file's.** They were zero — label→control and hint→control
 * both — with only the input's own padding holding them apart, which is where the owner's first
 * complaint started and where the focus ring found room to strike a hint out (B-57).
 *
 * **The message slot is §7.9's, and it is written here once rather than fourteen times.**
 *
 * - **Below the control**, because that is where the eye already is.
 * - **The hint stays.** A hint is frequently *the fix*, and deleting it at the moment of complaint
 *   is the worst possible timing — so the message **joins** the hint in `aria-describedby` rather
 *   than replacing it. The attribute takes a list, which is the whole reason this works.
 * - **No layout is reserved when it is absent**, so a screen with nothing wrong is byte-for-byte
 *   the calm screen it was designed as.
 *
 * Nothing passes `message` yet: the per-field rules that produce one are #109 and #112 to #114.
 * It lands here because §7.4 settles the component layer in one pass, and writing it later would
 * mean editing every field again.
 */
export function Field({
  label,
  hint,
  message,
  htmlFor,
  children,
}: {
  readonly label: ReactNode;
  readonly hint?: ReactNode;
  /**
   * §7.9's one line, when there is something the tool cannot use.
   *
   * Consequence first, then the fix — and *invalid*, *format* and *valid* are banned, because
   * they name our diagnosis rather than the owner's situation.
   */
  readonly message?: ReactNode;
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
  const messageId = useId();

  const control = labelableControl(children);

  // Both, in that order, and only the ones that exist. `aria-describedby` takes a list, which is
  // what lets a hint and a message coexist rather than one replacing the other.
  const describedBy =
    [hint === undefined ? undefined : hintId, message === undefined ? undefined : messageId]
      .filter((id) => id !== undefined)
      .join(" ") || undefined;

  // A caller's own id wins over ours: it may already be referenced by something else.
  const target = htmlFor ?? control?.props.id ?? (control === undefined ? undefined : generatedId);

  // Nothing to point at — several controls and no `htmlFor`. Wrapping is the only association
  // left, and it is what this component did before; the name is imprecise but present, which
  // beats a label attached to nothing. No caller is in this state.
  const labelText = <span className="block text-base font-medium">{label}</span>;
  // The offsets are the container's, not each span's: the same string used to render 4px here and
  // 12px inside a gapped copy of it, which is one hint at three distances (B-11).
  const hintText =
    hint === undefined ? null : (
      <span className={`block ${TYPE.quietLine.className}`} id={hintId} data-hint>
        {hint}
      </span>
    );
  // Live, so it is announced when it appears rather than only when the control is next reached.
  const messageText =
    message === undefined ? null : (
      <span className={`block ${TYPE.notice.className}`} id={messageId} data-message role="status">
        {message}
      </span>
    );

  const stack = `flex flex-col ${LADDER.withinField.className}`;

  if (target === undefined) {
    return (
      <label className={stack} data-field>
        {labelText}
        {children}
        {hintText}
        {messageText}
      </label>
    );
  }

  return (
    <div className={stack} data-field>
      <label className="block text-base font-medium" htmlFor={target}>
        {label}
      </label>
      {control === undefined
        ? children
        : cloneElement(control, {
            // A caller naming its own `htmlFor` has already put that id on the control; the
            // description still has to be attached, or a hint on a composite reaches nobody.
            ...(htmlFor === undefined ? { id: target } : {}),
            ...(describedBy === undefined ? {} : { "aria-describedby": describedBy }),
          })}
      {hintText}
      {messageText}
    </div>
  );
}
