import {
  SOCIAL_PLATFORMS,
  socialLabel,
  type Address,
  type Contact,
  type SocialLink,
} from "@linkpage/renderer";
import { useId, useState, type JSX } from "react";
import { TextField } from "../../ui/TextField.js";
import { Field, Question } from "./Question.js";
import { TextArea, TextInput } from "../../ui/TextInput.js";
import { Button } from "../../ui/Button.js";

/**
 * Contact, address and social — the three optional sections that are ordinary forms.
 * `SPEC.md` §2.3, §2.4, §7.2, §7.3.
 *
 * Each carries its always-present escape, and each is answerable in part: an owner with a
 * phone and no email answers the contact question by filling one box. What none of them can do
 * is answer with nothing — `Continue` is unavailable until something has been typed, and
 * `answerSection` refuses an empty value again on the way through, so "skip it and you don't
 * have it" is true of the file whatever the screen does.
 *
 * **The address question does not appear for every owner** (§7.3). "We come to you" never asks
 * for one, so a sole trader working from home does not publish their home address because the
 * flow asked and they answered. Nothing in this file knows that — it is the preset table's
 * decision, made once, in `presets.ts`.
 */

export interface ContactQuestionProps {
  readonly initial: Contact | undefined;
  readonly onAnswer: (contact: Contact) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

export function ContactQuestion({
  initial,
  onAnswer,
  onSkip,
  onBack,
}: ContactQuestionProps): JSX.Element {
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");

  return (
    <Question
      title="How do people reach you?"
      hint="Either one is plenty. They become a tap-to-call and a tap-to-email link."
      onSubmit={() => onAnswer({ phone, email })}
      submitDisabled={phone.trim() === "" && email.trim() === ""}
      escape={{ label: "Not on my page", onEscape: onSkip }}
      onBack={onBack}
    >
      {/* No judge on either box (§7.9 decision 5): their notice is the review list's mark. */}
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
      />
    </Question>
  );
}

export interface AddressQuestionProps {
  readonly initial: Address | undefined;
  readonly onAnswer: (address: Address) => void;
  readonly onSkip: () => void;
  readonly onBack?: () => void;
}

/**
 * Free-text lines, written the way the owner would write them on an envelope (§2.3).
 *
 * Not street/city/region/postcode: structured fields are what a developer reaches for and they
 * are a localisation trap — a UK florist filling in "state", a Japanese owner facing "street
 * address". Nothing in this project reads the address as data, so structure buys nothing and
 * costs comprehensibility. One textarea, and the newlines are the lines.
 */
export function AddressQuestion({
  initial,
  onAnswer,
  onSkip,
  onBack,
}: AddressQuestionProps): JSX.Element {
  const [lines, setLines] = useState((initial?.lines ?? []).join("\n"));
  const [directionsUrl, setDirectionsUrl] = useState(initial?.directionsUrl ?? "");

  return (
    <Question
      title="Where are you?"
      hint="Write it the way you'd write it on an envelope."
      onSubmit={() => onAnswer({ lines: lines.split("\n"), directionsUrl })}
      submitDisabled={lines.trim() === "" && directionsUrl.trim() === ""}
      escape={{ label: "We don't have a place to visit", onEscape: onSkip }}
      onBack={onBack}
    >
      <Field label="Address">
        <TextArea rows={4} value={lines} onChange={(event) => setLines(event.target.value)} />
      </Field>
      {/*
       * A link out rather than an embedded map: the export may reference nothing outside itself
       * (§5.3, invariant 2), so a map is impossible and this is the only answer left to "where
       * are you" that a visitor can act on.
       */}
      <Field label="A link to directions" hint="Optional. From your maps app's share button.">
        <TextInput
          type="url"
          inputMode="url"
          value={directionsUrl}
          spellCheck={false}
          autoCapitalize="none"
          placeholder="https://"
          onChange={(event) => setDirectionsUrl(event.target.value)}
        />
      </Field>
    </Question>
  );
}

export interface SocialQuestionProps {
  readonly initial: readonly SocialLink[] | undefined;
  readonly onAnswer: (social: SocialLink[]) => void;
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
 */
export function SocialQuestion({
  initial,
  onAnswer,
  onSkip,
  onBack,
}: SocialQuestionProps): JSX.Element {
  const listId = useId();
  const [rows, setRows] = useState<readonly SocialLink[]>(() =>
    initial !== undefined && initial.length > 0 ? initial : [{ platform: "", url: "" }],
  );

  const update = (index: number, next: SocialLink): void =>
    setRows(rows.map((row, at) => (at === index ? next : row)));

  const said = rows.some((row) => row.platform.trim() !== "" && row.url.trim() !== "");

  return (
    <Question
      title="Where else are you online?"
      hint="Instagram, Facebook, anywhere people already follow you."
      onSubmit={() => onAnswer([...rows])}
      submitDisabled={!said}
      escape={{ label: "We're not on social", onEscape: onSkip }}
      onBack={onBack}
    >
      <datalist id={listId}>
        {SOCIAL_PLATFORMS.map((platform) => (
          <option key={platform} value={platform}>
            {socialLabel(platform)}
          </option>
        ))}
      </datalist>

      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {rows.map((row, index) => (
          // Positional keys: a row is identified by where it is, and rows are only appended.
          <li key={index} className="flex flex-col gap-2 border-b border-rule py-2">
            <Field label="Where">
              <TextInput
                type="text"
                list={listId}
                value={row.platform}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(event) => update(index, { ...row, platform: event.target.value })}
              />
            </Field>
            <Field label="Your page there">
              <TextInput
                type="url"
                inputMode="url"
                value={row.url}
                spellCheck={false}
                autoCapitalize="none"
                placeholder="https://"
                onChange={(event) => update(index, { ...row, url: event.target.value })}
              />
            </Field>
          </li>
        ))}
      </ul>

      <Button onClick={() => setRows([...rows, { platform: "", url: "" }])}>Add another</Button>
    </Question>
  );
}
