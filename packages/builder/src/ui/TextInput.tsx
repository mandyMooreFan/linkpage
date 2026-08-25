import { useId, useRef } from "react";
import type { InputHTMLAttributes, JSX, Ref, TextareaHTMLAttributes } from "react";

/**
 * A text control, as a ruled line rather than as a box.
 *
 * Paper's whole idea is structure from space rather than from containers (`SPEC.md` §7.4), so a
 * field is a line you write on. The underline is the one border in the tool, and it recolours on
 * focus rather than moving anything — a control that reflows when you reach it is a control that
 * feels broken on a phone.
 *
 * **Which is why the line is drawn in `control-edge` rather than in `rule`** (item 1.2, B-23 and
 * B-64). If the underline *is* the control, it is the part of it that a person has to be able to
 * find, and SC 1.4.11 asks 3:1 of that. Sharing the row-divider colour put it at 1.31:1: an empty
 * field read as a gap with a faint line under it. `theme.css` carries the split and the numbers.
 *
 * **This is the only place the recipe is written**, which is §7.4's rule about controls being
 * components rather than repeated strings. It had stopped being true: the string existed in
 * thirteen places, and this component — the one that owned the placeholder colour — had no call
 * sites at all, so the placeholder rule reached nothing and every field fell back to the
 * browser's own grey. `controls.test.ts` now holds the rule by reading the sources.
 *
 * **The placeholder is held to the body contrast threshold**, not to a "lighter than the value"
 * feel. §7.4 moves the exact-colour field's example out of the hint and into the placeholder so it
 * stops reading as instruction — which makes it information, and information has to be readable.
 * At `text-ink-quiet/60` it composited to 2.49:1; at full strength it is 5.60:1, still visibly
 * lighter than the entered value's 16.02:1.
 */

/**
 * **The ruled line itself**, with nothing on it yet.
 *
 * Written apart from the recipe below only because a second thing now sits on it: the prefixed
 * web-address field (design change 10) draws the line around a prefix *and* a box, so the line
 * has to be something both can be given rather than something one of them owns. It is one
 * string in one file either way, which is the rule `controls.test.ts` holds — and it means the
 * `control-edge` split above reaches the prefixed field for free instead of leaving it behind
 * at the old colour, which is exactly the drift a second copy of this string would have caused.
 */
export const LINE_CLASS =
  "tap w-full border-0 border-b border-control-edge bg-transparent px-0 py-2 font-sans text-lg";

/** The one recipe. Exported so `controls.test.ts` can assert on it rather than re-spell it. */
export const INPUT_CLASS = `${LINE_CLASS} placeholder:text-ink-quiet focus:border-ink`;

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly ref?: Ref<HTMLInputElement>;
}

export function TextInput({ className, ...rest }: TextInputProps): JSX.Element {
  return <input className={`${INPUT_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}

/**
 * The same line, for an answer that runs to several — the address, and nothing else today.
 *
 * **It lives here rather than in its own file so the two cannot drift.** They are one control at
 * two heights: an address written the way you would write it on an envelope is still a ruled line
 * you write on, and a box would make it the only boxed field in the tool. Sharing `INPUT_CLASS`
 * is what keeps that true without a second string to keep in step — which is the whole failure
 * this file exists to have fixed.
 *
 * **The drag handle goes** (design change 6, finding B-73). A textarea ships with the browser's
 * resize grip in its corner: it lets the owner pull the field straight out of §7.6's single
 * column, which every screen in the tool is laid out against and which nothing else here can be
 * dragged past, and it is a piece of browser furniture in a design where type is the only
 * decoration. `rows` keeps the shape it had, so nothing else about the field moves.
 *
 * **Two alternatives were tried in the review shots and rejected on what they showed.**
 *
 * - `resize-y`, keeping the vertical drag: Chromium paints the *identical* grip for
 *   `resize: vertical`, so the corner is unchanged pixel for pixel. It pays the whole visual cost
 *   of the mark and buys back only the sideways drag.
 * - `field-sizing-content`, so the field grows to a six-line address instead of scrolling: it
 *   collapses the *empty* field to a single ruled line, because a field sized to no content is
 *   one line tall and the `tap` floor this string inherits outranks any `min-h-*` put beside it.
 *   An address field that opens looking exactly like a one-line field stops asking for several
 *   lines, and winning that back needs an `!important` against the shared recipe. Scrolling a
 *   long address is what the field does today, and it is the smaller loss.
 *
 * **This is why the class sits on its own string rather than on `INPUT_CLASS`.** `resize` means
 * nothing on an `<input>`, and the growth experiment above showed the sharper reason to keep the
 * two apart: `field-sizing` sizes a text input by its *width*.
 */
export const TEXTAREA_CLASS = `${INPUT_CLASS} resize-none`;

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  readonly ref?: Ref<HTMLTextAreaElement>;
}

export function TextArea({ className, ...rest }: TextAreaProps): JSX.Element {
  return <textarea className={`${TEXTAREA_CLASS} ${className ?? ""}`.trim()} {...rest} />;
}

/**
 * The same line, with a scheme already written on it (design change 10, finding B-55).
 *
 * **What is borrowed is the prefix, not the box.** The free Tailwind input-group pattern puts a
 * leading add-on inside a rounded, outlined, filled wrapper — and paper's boundary is the
 * underline (`SPEC.md` §7.4), so the wrapper *is* the line the input used to draw for itself.
 * `LINE_CLASS` moves onto the row and the box inside it keeps none of it: no card, no fill, no
 * radius, no second border, and the same 44px floor and the same rule underneath as every other
 * field in the tool. The only thing that changed is that two things now stand on the line
 * instead of one.
 *
 * **Focus follows the same rule it always did** — the line recolours and nothing moves — and
 * says `focus-within` because the thing that takes focus is now inside the thing that draws the
 * boundary. The ring on the box is untouched; that is #188's, and this is not it.
 *
 * **The prefix is a description, not a name.** It sits outside the `<label>` — `Field` points
 * rather than wraps, so nothing beside the box can join the accessible name (#91, #98) — and it
 * is attached with `aria-describedby`, *joining* whatever the field already had rather than
 * replacing it. That is the whole accessibility argument for the change, and it is the half that
 * is easy to lose: `https://` used to be a placeholder, which is announced only while the field
 * is empty. Making it permanent on screen and `aria-hidden` in the tree would have fixed the
 * defect for people who can see it and deepened it for everyone else.
 *
 * **Clicking the prefix focuses the box.** The line used to be the input edge to edge, so
 * anywhere on it took focus; without this, the leading centimetre of every web-address field
 * would quietly stop working.
 */
export const URL_ROW_CLASS = `${LINE_CLASS} flex items-center gap-1 focus-within:border-ink`;

/** Quiet, and not selectable — it is the field's own furniture, not part of the answer. */
export const URL_PREFIX_CLASS = "shrink-0 select-none text-ink-quiet";

/**
 * The box on that line. It draws no boundary of its own — the row has it — and inherits its type
 * from the row, which Tailwind's own reset makes true of form controls.
 */
export const URL_BOX_CLASS =
  "w-full min-w-0 border-0 bg-transparent p-0 placeholder:text-ink-quiet";

export interface UrlInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "children"
> {
  /** What is written on the line before the box. See `webAddress.ts` for where it comes from. */
  readonly scheme: string;
}

export function UrlInput({
  scheme,
  className,
  "aria-describedby": describedBy,
  ...rest
}: UrlInputProps): JSX.Element {
  const schemeId = useId();
  const box = useRef<HTMLInputElement>(null);

  return (
    <span
      className={`${URL_ROW_CLASS} ${className ?? ""}`.trim()}
      data-url-field
      onPointerDown={(event) => {
        if (event.target === box.current) return;
        event.preventDefault();
        box.current?.focus();
      }}
    >
      <span className={URL_PREFIX_CLASS} id={schemeId} data-url-scheme>
        {scheme}
      </span>
      <input
        // `text`, not `url`: the box no longer holds a URL — the scheme is on the line beside it
        // — so `type="url"` would mark every correctly-typed address `:invalid`. `inputMode`
        // is what was actually buying the phone keyboard, and it stays.
        type="text"
        inputMode="url"
        spellCheck={false}
        autoCapitalize="none"
        ref={box}
        className={URL_BOX_CLASS}
        aria-describedby={[schemeId, describedBy].filter((id) => id !== undefined).join(" ")}
        {...rest}
      />
    </span>
  );
}
