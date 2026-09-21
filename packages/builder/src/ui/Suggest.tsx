import { useEffect, useId, useRef, useState, type JSX, type Ref } from "react";
import { LINE_CLASS, URL_BOX_CLASS } from "./TextInput.js";
import { ROW_LIST } from "./row.js";

/**
 * A box you type in, with the answers we happen to know offered beside it (§7.4; #376).
 *
 * **It is not a picker, and the difference is the whole point.** Its one call site is *Where else
 * are you online?*, where §2.4 draws ten brand marks and §4.4 says any platform outside them is
 * kept verbatim and rendered with the generic glyph. LinkedIn is the live case — Simple Icons
 * withdrew the mark at LinkedIn's request, and the alternatives carry the attribution obligation
 * §2.4 exists to avoid — so a business on LinkedIn must be able to name it. A `<select>` would
 * turn "the ten we happen to have drawn" into "the places a business can be", which is the
 * sentence `SectionQuestions.tsx` has carried since the screen was written.
 *
 * **Why it is not a `<datalist>`, which is what it replaced.** The walk (#359, moment 17) read the
 * box as a plain typing box and never learned the ten were there. The honest fix is a mark that
 * says *this opens* — and the mark the state picker wears is painted by the browser on a
 * `<select>`, which a text box has none of. Drawing one over a `<datalist>` would have been a lie
 * of a particular kind: the popup is browser furniture, so whether a press opens it is the
 * browser's to decide and not ours, and nothing in the DOM can be asked whether it did. It is
 * invisible to a test and to the review shots alike. So the list is ours: it opens when the arrow
 * is pressed, it narrows as the owner types, it is in the accessibility tree, and `pnpm shots`
 * can photograph it.
 *
 * **The shape is `URL_ROW_CLASS`'s** — `LINE_CLASS` moves onto the row and the box inside keeps
 * none of it — for that recipe's reason: paper's boundary is the underline, so two things standing
 * on one line is the only way to add furniture to a field without turning it into a card.
 */

/** The row the box and the arrow stand on. The same line every other field draws for itself. */
export const SUGGEST_ROW_CLASS = `${LINE_CLASS} flex items-center gap-2`;

/**
 * The open list, hung off the row rather than pushing the form down.
 *
 * `absolute`, because a list that shifted the *Your page there* field down the screen every time
 * it opened would move the thing the owner is reaching for next. `z-10` clears the field below;
 * nothing in the flow stacks above it.
 */
export const SUGGEST_LIST_CLASS = `absolute inset-x-0 top-full z-10 mt-1 max-h-64 overflow-y-auto bg-ground ${ROW_LIST}`;

export interface SuggestProps {
  readonly value: string;
  readonly onValueChange: (next: string) => void;
  /** What the arrow offers. Order is the caller's; nothing here sorts them. */
  readonly options: readonly string[];
  /** The arrow's accessible name — it is the caller who knows what kind of thing is listed. */
  readonly openLabel: string;
  readonly id?: string;
  readonly ref?: Ref<HTMLInputElement>;
  readonly spellCheck?: boolean;
  readonly autoCapitalize?: string;
  readonly "aria-describedby"?: string;
  readonly "aria-invalid"?: boolean;
}

export function Suggest({
  value,
  onValueChange,
  options,
  openLabel,
  id,
  ref,
  ...rest
}: SuggestProps): JSX.Element {
  const listId = useId();
  const optionId = useId();
  const [open, setOpen] = useState(false);
  /** Which option the keyboard is on; `-1` is "none", which is where typing leaves it. */
  const [active, setActive] = useState(-1);
  const wrapper = useRef<HTMLDivElement>(null);

  /**
   * Narrowing is on what has been typed, matched anywhere in the name rather than only at its
   * start: the owner who types `gram` means Instagram. An empty box offers all ten, which is what
   * the arrow is for.
   */
  const needle = value.trim().toLowerCase();
  const shown = needle === "" ? options : options.filter((o) => o.toLowerCase().includes(needle));

  /** Open with nothing to show is the same as closed, and would otherwise draw an empty box. */
  const showing = open && shown.length > 0;

  /**
   * A press anywhere else closes it. `pointerdown` rather than `click`, so the list is gone before
   * whatever was pressed takes focus — otherwise the escape button underneath receives its press
   * with the list still over it.
   */
  useEffect(() => {
    if (!showing) return;
    const away = (event: PointerEvent): void => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [showing]);

  const choose = (option: string): void => {
    onValueChange(option);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      // Only the list closes. The typed answer is the owner's and Escape never takes it back.
      if (showing) event.preventDefault();
      setOpen(false);
      setActive(-1);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!showing) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = (active + step + shown.length) % shown.length;
      setActive(next < 0 ? shown.length - 1 : next);
      return;
    }
    if (event.key === "Enter" && showing && active >= 0) {
      // The form's own submit is not what Enter means while a suggestion is highlighted.
      event.preventDefault();
      choose(shown[active] as string);
    }
  };

  return (
    <div className="relative" ref={wrapper}>
      <div className={SUGGEST_ROW_CLASS}>
        <input
          {...rest}
          id={id}
          ref={ref}
          type="text"
          role="combobox"
          aria-expanded={showing}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showing && active >= 0 ? `${optionId}-${active}` : undefined}
          autoComplete="off"
          className={URL_BOX_CLASS}
          value={value}
          onChange={(event) => {
            onValueChange(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
        />
        {/*
         * The one piece of furniture on the line. It is a real button with a real name, because
         * the whole finding was that nothing said the list existed — a decorative glyph would have
         * left a screen reader exactly where the walk was. `tabIndex={-1}`: the combobox itself is
         * the keyboard's way in (ArrowDown opens it), and a second stop on every row would put two
         * tab stops where §7.12 counts one.
         */}
        <button
          type="button"
          aria-label={openLabel}
          aria-expanded={showing}
          aria-controls={listId}
          tabIndex={-1}
          // Quiet to full ink under the pointer — one of #370's recipes, and the one that suits a
          // mark whose whole job is to be noticed once.
          className="shrink-0 bg-transparent p-0 text-ink-quiet enabled:hover:text-ink"
          data-suggest-open
          onClick={() => {
            setOpen(!showing);
            setActive(-1);
          }}
        >
          {/*
           * Drawn rather than borrowed: the state picker's arrow is the browser's, painted on a
           * `<select>`, and a text box has none to inherit. The size and the quiet ink are what
           * make the two read as the same mark.
           */}
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
            <path
              d="M4 6l4 4 4-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {showing && (
        <ul className={SUGGEST_LIST_CLASS} id={listId} role="listbox" data-suggest-list>
          {shown.map((option, index) => (
            <li key={option} role="presentation">
              <button
                type="button"
                id={`${optionId}-${index}`}
                role="option"
                aria-selected={index === active}
                // The tint `ROW_BUTTON` uses, because this is a row in a list and reads as one.
                className="tap w-full bg-transparent px-3 py-2 text-start font-sans text-base enabled:hover:bg-rule/40 aria-selected:bg-rule/40"
                /*
                 * `onMouseDown` prevented: a press must not take focus off the box on its way to
                 * the click, or the blur closes the list out from under it.
                 */
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
