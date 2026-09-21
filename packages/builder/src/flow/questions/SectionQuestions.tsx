import {
  SOCIAL_PLATFORMS,
  socialLabel,
  type Address,
  type Contact,
  type SocialLink,
} from "@linkpage/renderer";
import { useId, useMemo, useState, type JSX } from "react";
import { TextField, UrlField } from "../../ui/TextField.js";
import { emailJudge, linkJudge } from "../../project/unusable.js";
import { Field, Question } from "./Question.js";
import { STATES } from "./states.js";
import { useTyping } from "./typing.js";
import { Select } from "../../ui/Select.js";
import { Button } from "../../ui/Button.js";
import { LADDER } from "../../ui/ladder.js";
import { Suggest } from "../../ui/Suggest.js";
import { ROW_LIST_FIELDS, ROW_STACK_PADDING } from "../../ui/row.js";

/**
 * Contact, address and social — the three optional sections that are ordinary forms.
 * `SPEC.md` §2.3, §2.4, §7.2, §7.3.
 *
 * Each carries its always-present escape, and each is answerable in part: an owner with a
 * phone and no email answers the contact question by filling one box. What none of them can do
 * is answer with nothing — `Continue` pressed on an empty screen says so and holds (§7.9
 * decision 1, #368), and `answerSection` refuses an empty value again on the way through, so
 * "skip it and you don't have it" is true of the file whatever the screen does.
 *
 * **Email and the two web addresses are judged on `Continue`; the phone never is** (#368).
 * The judges are `unusable.ts`'s, over the renderer's own floors, so the screen holds on
 * exactly what the review row would have marked a screen later — and lets through exactly
 * what the page can use.
 *
 * **The address question does not appear for every owner** (§7.3). "We come to you" never asks
 * for one, so a sole trader working from home does not publish their home address because the
 * flow asked and they answered. Nothing in this file knows that — it is the preset table's
 * decision, made once, in `presets.ts`.
 */

export interface ContactQuestionProps {
  readonly initial: Contact | undefined;
  readonly onAnswer: (contact: Contact) => void;
  /** The answer as it stands while it is typed, for the page beside the question (#373). */
  readonly onTyping?: (contact: Contact) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function ContactQuestion({
  initial,
  onAnswer,
  onTyping,
  onSkip,
  onBack,
}: ContactQuestionProps): JSX.Element {
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const answer = useMemo((): Contact => ({ phone, email }), [phone, email]);
  useTyping(answer, onTyping);

  return (
    <Question
      title="How do people reach you?"
      hint="Either one is plenty. They become a tap-to-call and a tap-to-email link."
      onSubmit={() => onAnswer(answer)}
      unanswered={
        phone.trim() === "" && email.trim() === ""
          ? "Nothing typed yet — add a phone or an email, or say it's not on your page."
          : undefined
      }
      escape={{ label: "Not on my page", onEscape: onSkip }}
      onBack={onBack}
    >
      {/*
       * No judge on the phone, on purpose (§7.9 decision 1): a vanity number or an extension is
       * right as typed, and its notice stays the review list's mark. Ten plain US digits are
       * set out as `(555) 123-4567` on `Continue` — a mend shown, not said (§7.9 decision 4,
       * #385), stored by `answerSection` and met here again when the row reopens. The email
       * is judged with the floor the page dials `mailto:` by, spaces stripped first as the
       * mend would.
       */}
      <TextField
        label="Phone"
        type="tel"
        value={phone}
        onValueChange={setPhone}
        autoComplete="tel"
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onValueChange={setEmail}
        spellCheck={false}
        autoCapitalize="none"
        autoComplete="email"
        name="email"
        validate={emailJudge}
      />
    </Question>
  );
}

export interface AddressQuestionProps {
  readonly initial: Address | undefined;
  readonly onAnswer: (address: Address) => void;
  /** The answer as it stands while it is typed, for the page beside the question (#373). */
  readonly onTyping?: (address: Address) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

/** The five boxes, in the order an envelope reads them; `directionsUrl` is the sixth field. */
const BOXES = ["street", "street2", "city", "state", "zip"] as const;

/**
 * A US address form (§2.3, #364, built by #386): a street, an optional second line, a city, a
 * state picker and a ZIP — then the directions link, as before.
 *
 * **Until #364 this was one four-row box**, and structured fields were refused as a localisation
 * trap — a UK florist filling in "state", a Japanese owner facing "street address". §1 now names
 * one country, and the boxes are here because a US owner facing that one blank area asked where
 * the state goes (#359, moment 16), not because the page wants fields: a ZIP is not checked, a
 * street is not parsed, and the state picker's only job is to spell the abbreviation the envelope
 * line prints. `Continue` wants **any one box filled** — presence, never shape (§7.9) — and
 * the directions link on its own still counts, as it always has.
 *
 * The `autoComplete` tokens are the browser's own names for these boxes, so a phone that knows
 * the owner's address offers it in one press rather than five.
 */
export function AddressQuestion({
  initial,
  onAnswer,
  onTyping,
  onSkip,
  onBack,
}: AddressQuestionProps): JSX.Element {
  const [boxes, setBoxes] = useState<Record<(typeof BOXES)[number], string>>(() => ({
    street: initial?.street ?? "",
    street2: initial?.street2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zip: initial?.zip ?? "",
  }));
  const [directionsUrl, setDirectionsUrl] = useState(initial?.directionsUrl ?? "");
  const answer = useMemo((): Address => ({ ...boxes, directionsUrl }), [boxes, directionsUrl]);
  useTyping(answer, onTyping);
  const set = (box: (typeof BOXES)[number]) => (next: string) =>
    setBoxes((current) => ({ ...current, [box]: next }));
  const nothingTyped =
    BOXES.every((box) => boxes[box].trim() === "") && directionsUrl.trim() === "";

  return (
    <Question
      title="Where are you?"
      hint="Your page prints it the way you'd write it on an envelope."
      onSubmit={() => onAnswer(answer)}
      unanswered={
        nothingTyped
          ? "Nothing typed yet — add the address, or say there's no place to visit."
          : undefined
      }
      escape={{ label: "We don't have a place to visit", onEscape: onSkip }}
      onBack={onBack}
    >
      <TextField
        label="Street address"
        value={boxes.street}
        onValueChange={set("street")}
        name="street"
        autoComplete="address-line1"
      />
      <TextField
        label="Apartment, suite, or unit"
        hint="Optional."
        value={boxes.street2}
        onValueChange={set("street2")}
        name="street2"
        autoComplete="address-line2"
      />
      <TextField
        label="City"
        value={boxes.city}
        onValueChange={set("city")}
        name="city"
        autoComplete="address-level2"
      />
      <Field label="State">
        <Select
          name="state"
          autoComplete="address-level1"
          value={boxes.state}
          onChange={(event) => set("state")(event.target.value)}
        >
          {/* Blank first, so a state is never chosen for the owner — see `Select.tsx`. */}
          <option value=""></option>
          {STATES.map(([abbreviation, name]) => (
            <option key={abbreviation} value={abbreviation}>
              {name}
            </option>
          ))}
        </Select>
      </Field>
      <TextField
        label="ZIP code"
        value={boxes.zip}
        onValueChange={set("zip")}
        name="zip"
        autoComplete="postal-code"
      />
      {/*
       * A link out rather than an embedded map: the export may reference nothing outside itself
       * (§5.3, invariant 2), so a map is impossible and this is the only answer left to "where
       * are you" that a visitor can act on.
       */}
      <UrlField
        label="A link to directions"
        hint="Optional. From your maps app's share button."
        value={directionsUrl}
        onValueChange={setDirectionsUrl}
        name="directionsUrl"
        validate={linkJudge}
      />
    </Question>
  );
}

/**
 * The ten, in the words the page will print — `socialLabel`'s, so the suggestion and the brand
 * mark it earns cannot drift apart. Built once: the list is fixed at module scope and every row
 * on the screen offers the same one.
 */
const PLATFORM_NAMES: readonly string[] = SOCIAL_PLATFORMS.map(socialLabel);

export interface SocialQuestionProps {
  readonly initial: readonly SocialLink[] | undefined;
  readonly onAnswer: (social: SocialLink[]) => void;
  /** The rows as they stand while they are typed, for the page beside the question (#373). */
  readonly onTyping?: (social: SocialLink[]) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

/**
 * Social accounts: a platform and a URL each (§2.3).
 *
 * **The platform box is open, and the ten with a vendored brand mark are completions rather
 * than options** (§2.4, §4.4). Behind the string is a URL the owner typed, so an unrecognised
 * platform is kept and renders with the generic glyph — LinkedIn is the live example, absent
 * from the marks only because Simple Icons removed it at LinkedIn's request. A `<select>` here
 * would turn "the ten we happen to have drawn" into "the places a business can be".
 *
 * **That stayed true and the box still said nothing** (#376, walk #359 moment 17). It was a
 * `<datalist>`, whose popup is browser furniture: no mark on the line, nothing in the tree, and
 * nothing a test or a review shot can see. `Suggest` is the same openness with the list made
 * ours — an arrow that says *this opens*, ten names under it, and every one of them still only a
 * suggestion. See `ui/Suggest.tsx` for why that trade goes this way and not the other.
 *
 * **The pair is a row in the list family** (#376, walk #359 moment 18; spec pass #358 finding 8).
 * It wrote `border-b border-rule py-2` by hand — B-43 wrote that row once in `ui/row.ts` and
 * `LinkButtons` names the hand-written spelling as the one it replaced, but this screen, the
 * other place two fields share a row, was left on it. 8px of padding under `betweenFields`' 32px
 * inverts the grouping the walk said was missing, and the per-row rule is the second line it saw
 * under *Your page there*. It takes `ROW_LIST_FIELDS` rather than `ROW_LIST`: a row that ends in
 * an underlined field needs no edge of its own, and `border-y` only moved that second line from
 * 10px under the field's own to 14px — mended by taking it away, not by spacing it.
 */
export function SocialQuestion({
  initial,
  onAnswer,
  onTyping,
  onSkip,
  onBack,
}: SocialQuestionProps): JSX.Element {
  const listId = useId();
  const [rows, setRows] = useState<readonly SocialLink[]>(() =>
    initial !== undefined && initial.length > 0 ? initial : [{ platform: "", url: "" }],
  );
  const answer = useMemo((): SocialLink[] => [...rows], [rows]);
  useTyping(answer, onTyping);

  const update = (index: number, next: SocialLink): void =>
    setRows(rows.map((row, at) => (at === index ? next : row)));

  const said = rows.some((row) => row.platform.trim() !== "" && row.url.trim() !== "");

  return (
    <Question
      title="Where else are you online?"
      hint="Instagram, Facebook, anywhere people already follow you."
      onSubmit={() => onAnswer(answer)}
      unanswered={
        said
          ? undefined
          : "Nothing filled in yet — say where, and paste your page there; or say you're not on social."
      }
      escape={{ label: "We're not on social", onEscape: onSkip }}
      onBack={onBack}
    >
      <ul className={`w-full ${ROW_LIST_FIELDS}`} data-social-rows>
        {rows.map((row, index) => (
          // Positional keys: a row is identified by where it is, and rows are only appended.
          // Two fields, so the gap between them is the field-to-field rung and not the one used
          // *inside* a field — which is what made every label here read as belonging to the box
          // above it (B-65 measured this step as the worst of them). The row's own padding takes
          // the *section* rung, because a boundary no wider than the gap inside it stops reading
          // as one — `LinkButtons` carries the same two numbers for the same reason.
          <li
            key={index}
            className={`flex flex-col ${LADDER.betweenFields.className} ${ROW_STACK_PADDING.className}`}
            data-social-row
          >
            <Field label="Where" htmlFor={`${listId}-where-${index}`}>
              <Suggest
                id={`${listId}-where-${index}`}
                value={row.platform}
                options={PLATFORM_NAMES}
                openLabel="Show the sites we know"
                spellCheck={false}
                autoCapitalize="none"
                onValueChange={(platform) => update(index, { ...row, platform })}
              />
            </Field>
            <UrlField
              label="Your page there"
              value={row.url}
              onValueChange={(url) => update(index, { ...row, url })}
              name={`social-${index}`}
              validate={linkJudge}
            />
          </li>
        ))}
      </ul>

      <Button onClick={() => setRows([...rows, { platform: "", url: "" }])}>Add another</Button>
    </Question>
  );
}
