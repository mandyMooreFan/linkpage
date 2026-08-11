import { useId, useState, type JSX } from "react";
import type { Pick } from "../plan.js";
import type { Suggestion } from "../presets.js";
import { Field, Question } from "./Question.js";

/**
 * The link buttons, in two screens. `SPEC.md` §7.3, §2.3.
 *
 * > **Link buttons seed as a pick-list, never as pre-created rows. A button exists only once
 * > it has a URL.**
 *
 * That is one sentence and it is two screens, because it has to be. A preset that dropped
 * _See the menu_ onto the list as an empty row would have made a claim about a business it
 * knows three words about, and left a button pointing nowhere for the owner to notice and
 * delete. Asking _which of these do you have?_ makes the same suggestion without asserting
 * anything, and the second screen is what turns an intention into a button.
 *
 * Nothing on the first screen touches the draft. `Pick` is not a `Link` and cannot become one
 * without a destination — `addLink` in `topics.ts` is the door, and it refuses a blank URL — so
 * an owner who picks three suggestions and skips all three URLs ends with no links at all, no
 * empty rows, and nothing in the file.
 *
 * **Suggestions can be empty**, which is what _Something else_ chooses (§7.3): the free entry
 * below them is then the whole screen, and it is the same control everyone else also has.
 */

export interface LinksQuestionProps {
  /** The chosen preset's suggestions, in its own order. Empty for _Something else_. */
  readonly suggestions: readonly Suggestion[];
  /** What `Back` should bring round again. */
  readonly initial: readonly Pick[];
  readonly onAnswer: (picks: Pick[]) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function LinksQuestion({
  suggestions,
  initial,
  onAnswer,
  onSkip,
  onBack,
}: LinksQuestionProps): JSX.Element {
  const suggested = (label: string): string => `suggested:${label}`;

  const [chosen, setChosen] = useState<readonly string[]>(() =>
    initial.filter((pick) => pick.id.startsWith("suggested:")).map((pick) => pick.id),
  );
  const [extras, setExtras] = useState<readonly Pick[]>(() =>
    initial.filter((pick) => !pick.id.startsWith("suggested:")),
  );
  const [typed, setTyped] = useState("");
  const typedId = useId();

  // Suggestions keep the preset's order, then the owner's own in the order they added them.
  const picks: Pick[] = [
    ...suggestions
      .filter((entry) => chosen.includes(suggested(entry.label)))
      .map((entry) => ({ id: suggested(entry.label), label: entry.label, icon: entry.icon })),
    ...extras,
  ];

  function addExtra(): void {
    const label = typed.trim();
    if (label === "") return;
    // No icon: the curated set exists to serve the suggestions above (§2.4), and guessing a
    // glyph from a label the owner invented would be decoration pretending to be meaning.
    setExtras([...extras, { id: `own:${extras.length}:${label}`, label }]);
    setTyped("");
  }

  return (
    <Question
      title="Which of these do you have?"
      hint="We'll ask where each one goes next. Nothing is added until it has somewhere to point."
      onSubmit={() => onAnswer(picks)}
      submitDisabled={picks.length === 0}
      escape={{ label: "No buttons for now", onEscape: onSkip }}
      onBack={onBack}
    >
      {suggestions.length > 0 && (
        <ul className="picks">
          {suggestions.map((entry) => {
            const id = suggested(entry.label);
            const on = chosen.includes(id);
            return (
              <li key={id}>
                <label className="picks__option">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setChosen(on ? chosen.filter((each) => each !== id) : [...chosen, id])
                    }
                  />
                  <span>{entry.label}</span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {extras.length > 0 && (
        <ul className="picks">
          {extras.map((pick) => (
            <li key={pick.id}>
              <span className="picks__own">{pick.label}</span>
              <button
                type="button"
                className="picks__remove"
                onClick={() => setExtras(extras.filter((each) => each.id !== pick.id))}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {/*
       * Two controls in one row, so the label has to say which one it means (#98). Left to wrap
       * them both, it named the input "Something elseAdd" — an implicit label takes its text from
       * everything inside it, and the Add button is inside it.
       */}
      <Field label="Something else" htmlFor={typedId}>
        <span className="row">
          <input
            id={typedId}
            type="text"
            className="input"
            value={typed}
            placeholder="What would the button say?"
            onChange={(event) => setTyped(event.target.value)}
            onKeyDown={(event) => {
              // Enter here adds the button; it must not reach the form and continue past a
              // half-typed one.
              if (event.key !== "Enter") return;
              event.preventDefault();
              addExtra();
            }}
          />
          <button
            type="button"
            className="button-secondary"
            disabled={typed.trim() === ""}
            onClick={addExtra}
          >
            Add
          </button>
        </span>
      </Field>
    </Question>
  );
}

export interface LinkUrlQuestionProps {
  readonly pick: Pick;
  readonly onAnswer: (url: string) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

/**
 * The second half of the pick-list: where one button goes.
 *
 * `Continue` is unavailable until there is something in the box, and the escape drops the pick
 * rather than adding an empty button. Between them there is no path from this screen to a link
 * without a URL — which is the whole of "a button exists only once it has a URL", enforced
 * again in `addLink` so that it does not depend on this screen being right.
 */
export function LinkUrlQuestion({
  pick,
  onAnswer,
  onSkip,
  onBack,
}: LinkUrlQuestionProps): JSX.Element {
  const [url, setUrl] = useState("");

  return (
    <Question
      title={`Where does “${pick.label}” go?`}
      hint="Paste the web address. It's usually easiest to copy it from your browser."
      onSubmit={() => onAnswer(url)}
      submitDisabled={url.trim() === ""}
      escape={{ label: "Leave this one out", onEscape: onSkip }}
      onBack={onBack}
    >
      <Field label="Web address">
        <input
          type="url"
          className="input"
          inputMode="url"
          value={url}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="https://"
          onChange={(event) => setUrl(event.target.value)}
        />
      </Field>
    </Question>
  );
}
