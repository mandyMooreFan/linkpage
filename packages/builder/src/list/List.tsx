import { direction, vocabulary } from "@linkpage/renderer";
import { useEffect, useId, useState, type JSX, type ReactNode } from "react";
import { applyIntake, type LogoIntake } from "../logo/index.js";
import { NameQuestion, TaglineQuestion } from "../flow/questions/HeaderQuestions.js";
import { HoursQuestion } from "../flow/questions/HoursQuestion.js";
import { LogoQuestion } from "../flow/questions/LogoQuestion.js";
import { Field, QuestionShellProvider } from "../flow/questions/Question.js";
import {
  AddressQuestion,
  ContactQuestion,
  SocialQuestion,
} from "../flow/questions/SectionQuestions.js";
import {
  answerName,
  answerSection,
  answerTagline,
  TOPIC_LABELS,
  type Topic,
} from "../flow/topics.js";
import { Preview } from "../preview/Preview.js";
import { LADDER } from "../ui/ladder.js";
import type { Draft } from "../project/index.js";
import { removeTopic, setLang } from "./edits.js";
import { LANGUAGE_NAMES } from "./languages.js";
import { LinkButtons } from "./LinkButtons.js";
import { listRows, type Row, type RowId } from "./rows.js";
import { StyleStep } from "./StyleStep.js";
import { Button } from "../ui/Button.js";
import { ROW_BUTTON, ROW_LIST, ROW_OPEN } from "../ui/row.js";
import { TextInput } from "../ui/TextInput.js";

/**
 * The review list: the screen the owner lives on. `SPEC.md` §7.4, §7.1, §7.5–§7.8.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 *
 * **Every answer is a row, and the page sits beside it.** The rows come from `rows.ts`, which
 * derives them from the draft through the flow's own `uncoveredTopics` — so what this screen
 * shows and what the flow thinks is filled in cannot disagree, and a field an upgrade defaulted
 * on load (§4.3) is a row for the same reason a field the owner typed is.
 *
 * **The list holds what exists; the flow re-enters for what does not.** Both halves are here,
 * and the seam between them is one call: a tick-on hands a topic back to the flow (§7.1) and
 * gets the owner walked through it. An existing row opens the *same question the flow asked* —
 * editing opening hours a month later is the hours question, in an `<h2>` with a Save button,
 * because a second form for the same section is a second chance to disagree with the first.
 *
 * **The escape on those questions is the removal.** "We don't have set hours" means the same
 * thing here as it did in the flow: afterwards, you do not have that section. `removeTopic`
 * makes it true of the file, and `hasContent` then puts the topic back among the tick-ons — so
 * removing and never having are one state rather than two.
 *
 * **What this screen deliberately does not do** (§7.7): it does not track "downloaded" versus
 * "changed since". With no backend, the file goes stale the moment the owner edits again, and a
 * badge would catch that — but it is a nagging state on a screen this design keeps calm, and it
 * is wrong for every owner who exports, decides they hate it, and never uploads. **Download is
 * a button you press when you want a file. The tool knows nothing about your host and will not
 * imply it does.** There is no state here about exports, and there is nothing to add one to.
 *
 * **Mobile is first-class** (§7.6). The rows are one column of tap-sized disclosures at both
 * sizes and the preview is the drawer #32 already built; the only thing the width changes is
 * whether the drawer has room to sit open beside the list, which is a decision `list.css` and
 * `preview.css` make with the same media query.
 *
 * **Download goes where the screen is** (#186). §7.4 puts Download in the bar, and that is where
 * it lives — except on a phone with the page up, where the bar is underneath an opaque drawer
 * that defaults open and the bar is not the screen any more. There it travels into the drawer's
 * header, next to the line that tells the owner to press it. It is one button that is in one
 * place at a time, not two copies with one hidden.
 *
 * **Download and Import are entry points here and behaviours elsewhere** — `download/` owns the
 * sheet (§7.7) and `open/` the import mechanics (§7.8). Both arrive as optional handlers: this
 * screen settles *where* they are, which is what §7.4 and §7.8 actually specify, and neither is
 * offered until something supplies one. That includes the two surfaces the menu lends §7.8's
 * confirmation and §7.9's message: the list holds the place and none of the decision.
 */

export interface ListProps {
  readonly draft: Draft;
  /**
   * The owner has just come off a run, so the list says so once (§7.4).
   *
   * Held by `App` rather than by the file: no flag reaches `project.json`, and a reload lands
   * here without it.
   */
  readonly arrived?: boolean;
  /** Write-through, exactly as in the flow: this is the autosave. */
  readonly onChange: (draft: Draft) => void;
  /** Hand a topic back to the flow (§7.1). Ticking one on is what re-enters it. */
  readonly onAdd: (topic: Topic) => void;
  /** §7.7's sheet, wired by #35. Absent leaves the button out rather than dead. */
  readonly onDownload?: () => void;
  /** §7.8's menu entry, wired by #36. Absent leaves it out rather than dead. */
  readonly onImport?: () => void;
  /**
   * §7.8's replace confirmation, in the menu's own surface.
   *
   * The list holds no part of the decision — not what is at risk, not what it is called, not
   * what happens on either branch. It supplies the place, which is what §7.8 actually specifies
   * about this screen: **import lives in the review list's menu**, not the Download sheet,
   * because the sheet is where things leave and import is the one action that can destroy what
   * is there.
   */
  readonly importConfirm?: ReactNode;
  /** §7.9: an import failure belongs in the menu's own surface, not in a modal. */
  readonly importError?: ReactNode;
  /** Test seam for #31's pipeline, which needs `<img>` and `<canvas>`. */
  readonly intake?: (file: File) => Promise<LogoIntake>;
}

export function List({
  draft,
  arrived = false,
  onChange,
  onAdd,
  onDownload,
  onImport,
  importConfirm,
  importError,
  intake,
}: ListProps): JSX.Element {
  /**
   * Which row is open, if any.
   *
   * One at a time, because the alternative on a phone is a column of expanded forms with the
   * thing you were editing somewhere above the fold.
   */
  const [open, setOpen] = useState<RowId | null>(null);
  const { rows, uncovered } = listRows(draft);

  /**
   * Whether the preview drawer is over this screen rather than beside it (#186).
   *
   * On a phone the drawer is `fixed inset-0` and opaque, and on the list it defaults open — so
   * the first screen after a run carried *"To share it, download the file and put it online"*
   * over a Download the owner could not see or reach. The drawer reports the state (it is the
   * only thing that knows both its own open state and whether there was room beside the list);
   * this screen decides what to do about it, which is to hand its primary action to the surface
   * that is actually on screen.
   */
  const [covered, setCovered] = useState(false);

  /**
   * §7.7's sheet is #35's. The button is where §7.4 puts it and says what it does; it is
   * unavailable rather than inert until there is a sheet behind it, because a control that
   * answers a press with nothing is worse than one that says it is not ready.
   *
   * **Written once and placed twice, never rendered twice.** `covered` decides which of the two
   * places it is in, so there is exactly one Download on the screen and exactly one in the
   * accessibility tree — a second copy hidden by a media query would be read out by a screen
   * reader on the size that needs it least.
   *
   * **It carries the screen's one fill, and hands it over while a row is open** (§4, §6; design
   * change 3, B-18/B-51). An open row is a form with its own Save, so the screen showed two solid
   * ink fills a few centimetres apart, disagreeing about what the owner is in the middle of. §4
   * gives the one filled object to the one action, and while a row is open that action is
   * finishing the answer — so Download steps down and takes it back when the row closes.
   *
   * Three things make that a step down rather than a flicker:
   *
   * - **It follows the screen's mode, never the pointer.** Nothing that opens or closes a row is
   *   Download: rows open from their own header, and close on their Save or on the escape inside
   *   them. The fill never leaves a button under a press.
   * - **`secondary`, not `quiet`.** The same box — padding, radius, type and tap floor are shared
   *   with `primary` and asserted to be (`controls.test.ts`, *differs from Continue only in
   *   fill*) — so nothing moves or resizes; a hairline arrives where the fill was. `quiet` would
   *   make a footnote of the one thing §7.4 pins to this screen, which is the defect #189 spent a
   *   ticket undoing for the escapes.
   * - **`covered` outranks it**, because the screen is what is on the glass. With the page up on a
   *   phone the drawer is an opaque surface and the open row is not on screen at all, so there is
   *   no second fill to make room for — and a drawer whose only control was an outline is exactly
   *   what #186 was raised to fix (B-48). Where Download travels, it travels filled.
   */
  const download = (
    <Button
      type="button"
      weight={!covered && open !== null ? "secondary" : "primary"}
      disabled={onDownload === undefined}
      onClick={onDownload}
    >
      Download
    </Button>
  );

  const close = (): void => setOpen(null);

  /** Commit an answer and collapse the row: the question is finished with. */
  const answered = (next: Draft): void => {
    onChange(next);
    close();
  };

  /** The escape on a row is the removal (§7.1). Both roads end at a page without the section. */
  const removed = (topic: Topic): void => {
    onChange(removeTopic(draft, topic));
    close();
  };

  return (
    <main
      className="enter-fade flex min-h-dvh flex-col gap-6 bg-ground p-5 font-serif text-ink wide:flex-row wide:items-start wide:justify-center wide:gap-12 wide:px-8 wide:py-12"
      data-screen="list"
    >
      {/*
       * `flex-1` (#148): when the rows run short of a phone screen, the drawer's control below
       * still sits at the bottom edge rather than floating mid-screen. Wide is items-start, so
       * this changes nothing there.
       */}
      <div className="mx-auto w-full max-w-lg flex-1 wide:mx-0 wide:flex-1">
        <div className="flex items-center justify-between gap-2">
          <Menu onImport={onImport} confirm={importConfirm} error={importError} />
          {/* In the bar whenever the bar is the screen — which is every width but a phone with
              the page up, where it travels into the drawer's header instead. */}
          {!covered && download}
        </div>

        {/*
         * **The header's ladder is 32 / 8 / 24 / 24** (B-44). It used to be flat: the bar, the
         * arrival line and the title were all `mt-4` apart, so the status line was grouped
         * equally with the row of buttons above it and with the title it actually belongs to —
         * and with no arrival line the biggest conceptual break on the screen, buttons to title,
         * got the screen's smallest gap. The 32 sits on this block rather than on either child,
         * so it is the same break whether the line is there or not, and the 8 inside makes the
         * line and the title one object.
         */}
        <div className="mt-8 flex flex-col gap-2">
          {/*
           * §7.4: once, on arriving from a run. The list was never blank on arrival — it is
           * headed with the owner's own name, Download sits in the bar, and the page is beside
           * it — but the owner has just answered ten questions and has never been told what
           * happens next, with §8's guidance living inside a sheet they have no reason to open.
           *
           * Easy to get wrong later, so it is written down: **the line also fires for a run that
           * began from a project that already existed**, where *your page is ready* is not quite
           * true. No second line is added for that case — the row now showing its content is its
           * own confirmation.
           */}
          {arrived && (
            <p className="font-sans text-base text-ink-quiet" data-arrival role="status">
              Your page is ready. Look it over, then download it.
            </p>
          )}

          <h1 className="font-serif text-3xl leading-tight tracking-tight">{draft.header.name}</h1>
        </div>

        <ul className={`mt-6 ${ROW_LIST}`}>
          {rows.map((row) => (
            <RowItem
              key={row.id}
              row={row}
              open={open === row.id}
              onToggle={() => setOpen(open === row.id ? null : row.id)}
            >
              {editor(row.id)}
            </RowItem>
          ))}
        </ul>

        {uncovered.length > 0 && (
          <section className="mt-8">
            {/* 24px, the same as the title-to-rows gap: the identical relationship (B-44). */}
            <h2 className="mb-6 font-serif text-xl">Anything else?</h2>
            {/*
             * Ticking one of these does not park an empty row: it hands the topic to the flow,
             * which walks the owner through it and puts them back here (§7.1). That is why the
             * labels name the thing rather than the act — the list is an inventory of the page.
             */}
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {uncovered.map((topic) => (
                <li key={topic}>
                  <button
                    type="button"
                    /*
                     * The preset row's box, and **not** its picked state: nothing here is ever
                     * chosen — pressing one hands the topic to the flow and the row leaves this
                     * list. It carried the preset recipe's `aria-pressed:` classes anyway, on a
                     * button with no `aria-pressed` to fire them, so a sixth copy of the treatment
                     * sat in the source styling nothing at all (#192).
                     */
                    className="tap flex w-full flex-col gap-0.5 rounded-sm border border-rule bg-transparent px-4 py-3 text-start font-sans"
                    onClick={() => onAdd(topic)}
                  >
                    <span className="font-medium">{TOPIC_LABELS[topic]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mx-auto w-full max-w-lg wide:mx-0 wide:flex-1">
        <Preview
          project={draft}
          onList
          onCover={setCovered}
          action={covered ? download : undefined}
        />
      </div>
    </main>
  );

  /** The body of one row: the flow's own question, or the editor only the list has. */
  function editor(id: RowId): JSX.Element {
    switch (id) {
      case "businessName":
        return (
          <NameQuestion
            initial={draft.header.name}
            onAnswer={(name) => answered(answerName(draft, name))}
          />
        );

      case "tagline":
        return (
          <TaglineQuestion
            initial={draft.header.tagline}
            onAnswer={(tagline) => answered(answerTagline(draft, tagline))}
            onSkip={() => removed("tagline")}
          />
        );

      case "logo":
        return (
          <LogoQuestion
            logo={draft.header.logo}
            // Straight to the draft, because the preview is the feedback (§6.6). A refusal
            // applies nothing — `applyIntake` takes the whole result for exactly that reason,
            // and an unchanged draft is not an edit.
            onPick={(result) => {
              const next = applyIntake(draft, result);
              if (next !== draft) onChange(next);
            }}
            onContinue={close}
            onSkip={() => removed("logo")}
            intake={intake}
          />
        );

      case "links":
        return (
          <LinkButtons
            draft={draft}
            onChange={onChange}
            onAddAnother={() => {
              close();
              onAdd("links");
            }}
            onRemoveAll={() => removed("links")}
          />
        );

      case "hours":
        return (
          <HoursQuestion
            initial={draft.hours}
            onAnswer={(hours) => answered(answerSection(draft, { section: "hours", value: hours }))}
            onSkip={() => removed("hours")}
          />
        );

      case "contact":
        return (
          <ContactQuestion
            initial={draft.contact}
            onAnswer={(contact) =>
              answered(answerSection(draft, { section: "contact", value: contact }))
            }
            onSkip={() => removed("contact")}
          />
        );

      case "address":
        return (
          <AddressQuestion
            initial={draft.address}
            onAnswer={(address) =>
              answered(answerSection(draft, { section: "address", value: address }))
            }
            onSkip={() => removed("address")}
          />
        );

      case "social":
        return (
          <SocialQuestion
            initial={draft.social}
            onAnswer={(social) =>
              answered(answerSection(draft, { section: "social", value: social }))
            }
            onSkip={() => removed("social")}
          />
        );

      case "style":
        return <StyleStep draft={draft} onChange={onChange} />;

      case "lang":
        return <LangRow draft={draft} onChange={onChange} onDone={close} />;
    }
  }
}

/**
 * One row: the answer, and the question behind it.
 *
 * The header carries the label *and* the answer, because a list of labels is a table of
 * contents and §7.4 asked for the answers. The body is mounted only while open, so a question
 * that holds its own draft state opens on what is stored rather than on what was typed and
 * abandoned last time.
 *
 * **The answer takes the ink and the field name takes the quiet colour** (B-62). It used to be the
 * other way round: our vocabulary printed in full ink, the owner's own business in grey — backwards
 * on the one screen whose entire job is *look over your answers*, and pulling the eye down a column
 * of labels. §2 makes hierarchy out of weight and colour before size, so the swap is colour alone;
 * the sizes are untouched.
 *
 * **An open row is separated by space, not by a heavier line** (B-41). The hairline above the body
 * is the *same* hairline that separates two one-line summaries, so a 600px form and a 78px row were
 * delimited identically — the boundary out of an open row was 32px against the form's own internal
 * 24px, barely 1.3×. §1 prefers space to borders, so the line stays as it is and the gap grows:
 * 48px below, unambiguously the widest gap on the screen. The 24px above is the *one* owner of the
 * open row's top offset (B-42) — three of the ten editors used to bring their own `mt-4` and the
 * other seven sat flush against the rule.
 *
 * **The summary goes while the row is open** (B-63). The editor is already showing that value, in
 * an editable form, a couple of centimetres below — on a phone the two read as a duplicated block.
 * The *mark* stays: §7.9 puts what cannot be used in two places deliberately, so that it outlives
 * the screen, and the question behind the row repeats it on purpose.
 */
function RowItem({
  row,
  open,
  onToggle,
  children,
}: {
  readonly row: Row;
  readonly open: boolean;
  readonly onToggle: () => void;
  readonly children: ReactNode;
}): JSX.Element {
  const bodyId = useId();

  return (
    <li data-row={row.id}>
      <button
        type="button"
        className={ROW_BUTTON}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="text-sm font-medium text-ink-quiet" data-row-label>
          {row.label}
        </span>
        {!open && (
          <span className="flex items-center gap-2 text-base text-ink" data-row-summary>
            {row.swatch !== undefined && row.swatch !== "" && (
              // Decorative: the name beside it is the accessible content (§7.4).
              <span
                aria-hidden="true"
                className="size-3 shrink-0 rounded-full border border-rule"
                style={{ background: row.swatch }}
              />
            )}
            {row.summary}
          </span>
        )}
        {/*
         * §7.9 decision 5: what cannot be used leaves a mark that outlives the screen. Editing
         * the row opens the same question, with the same message.
         */}
        {row.mark !== undefined && (
          <span className="text-sm text-notice" data-mark>
            {row.mark}
          </span>
        )}
      </button>

      <div
        id={bodyId}
        className={`border-t border-rule ${ROW_OPEN.className} font-sans`}
        hidden={!open}
        data-row-body
      >
        {/*
         * A question inside a row is still the same question — an `<h2>` under the list's
         * title, and a button that says Save rather than Continue. Both are the shell's, so no
         * question has to know which of the two screens it is on.
         */}
        {open && (
          <QuestionShellProvider shell={{ level: 2, submitLabel: "Save" }}>
            {children}
          </QuestionShellProvider>
        )}
      </div>
    </li>
  );
}

/**
 * The page's language (§4.1, §4.3).
 *
 * It is a row because it is the one field v1 fills in without asking — from the browser, at
 * first run — and §4.3's rule is that **any field defaulted on load appears on the review list
 * as an ordinary row**. Discoverability comes from the product's normal surface, not from a
 * dialog; a bakery in Lyon whose browser said English can find this and fix it, and everyone
 * else reads past a row that already says what they would have said.
 */
function LangRow({
  draft,
  onChange,
  onDone,
}: {
  readonly draft: Draft;
  readonly onChange: (draft: Draft) => void;
  readonly onDone: () => void;
}): JSX.Element {
  const [value, setValue] = useState(draft.lang ?? "");
  const [typing, setTyping] = useState(!isListed(value));
  const fieldId = useId();
  const listId = useId();

  return (
    // A picker and a field stacked, which is a field-to-field relationship whatever the two are
    // built from. The top offset is the open row's, once (B-42).
    <div className={`flex w-full flex-col items-start ${LADDER.betweenFields.className}`}>
      <fieldset className="m-0 flex w-full flex-col gap-2 border-0 p-0">
        <legend className="block text-base font-medium">Page language</legend>
        {/* The gapped fieldset owns the offset; `mt-1` on top of it was the third distance the
            same hint string rendered at (B-11). */}
        <span className="block text-sm text-ink-quiet">
          It sets the words on your page, and tells screen readers how to read it.
        </span>

        {/*
         * **The control demonstrates its consequence instead of describing it** (§7.4). Each row
         * is the language in its own language, then the abbreviations and the closed word that
         * choosing it puts on the page — which is precisely what the walk said was missing.
         */}
        {/*
         * The same row as a review row, because it is the same shape: a full-width, two-line,
         * pressable summary (B-43). It used to be that shape at half the padding, with its own
         * `border-b` on every item.
         */}
        <ul className={`mt-2 max-h-80 overflow-y-auto ${ROW_LIST}`} id={listId} data-languages>
          {LANGUAGE_CHOICES.map((choice) => (
            <li key={choice.tag}>
              <button
                type="button"
                /*
                 * The chosen language takes the one `picked` mark rather than going bold (#192).
                 * Bold said "chosen" nowhere else in the tool, and on a list whose whole job is to
                 * show each language *in its own language* it changed the specimen it was pointing
                 * at — the sample line is the answer, and setting it in a second weight misreports
                 * it. §2 keeps the builder to two weights, and this was a third meaning for one.
                 *
                 * **`px-3` is the room the mark needs, and it is this row's alone** rather than
                 * `ROW_BUTTON`'s: the picker is the only row in the family that is ever chosen,
                 * and B-43's spec is about what separates rows and how much padding sits inside
                 * them vertically, which this does not touch. Without it the ring would be ruled
                 * straight through the first letter of the name. The hairlines are `ROW_LIST`'s
                 * and still run the full width, so only the text moves.
                 */
                className={`${ROW_BUTTON} px-3 aria-pressed:picked`}
                lang={choice.tag}
                aria-pressed={vocabularyKeyOf(value) === choice.tag}
                onClick={() => {
                  setTyping(false);
                  setValue(choice.tag);
                  onChange(setLang(draft, choice.tag));
                }}
              >
                <span className="text-base">{choice.name}</span>
                <span className="text-sm text-ink-quiet" dir={choice.dir}>
                  {choice.sample}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {/*
       * §4.5's escape, and not a nicety: unknown values are preserved, so a hand-edited file
       * declaring `sw` — English words, correct tag, a perfectly sensible state — must be
       * displayable without the control silently rewriting it to `en`.
       */}
      {typing ? (
        // Through `Field` rather than a fourth hand-built label-hint-input, which is where the
        // same hint string picked up its fourth offset (B-11) and its explanation-first order.
        <div className="w-full">
          <Field
            label="Or type a code"
            hint={
              <>
                A language code, like <code>en</code> or <code>fr-CA</code>.
              </>
            }
          >
            <TextInput
              id={fieldId}
              type="text"
              value={value}
              spellCheck={false}
              autoCapitalize="none"
              onChange={(event) => setValue(event.target.value)}
            />
          </Field>
        </div>
      ) : (
        <Button weight="quiet" onClick={() => setTyping(true)}>
          Or type a code
        </Button>
      )}

      <Button
        weight="primary"
        disabled={value.trim() === ""}
        onClick={() => {
          onChange(setLang(draft, value));
          onDone();
        }}
      >
        Save
      </Button>
    </div>
  );
}

/**
 * The picker's rows: every language the renderer can write, each showing what it produces.
 *
 * Built once at module load from the renderer's own table, so a language cannot appear here that
 * the page cannot write, and the sample is the real vocabulary rather than a transcription of it.
 */
const LANGUAGE_CHOICES = Object.entries(LANGUAGE_NAMES)
  .map(([tag, name]) => {
    const words = vocabulary(tag);
    return {
      tag,
      name,
      dir: direction(tag),
      sample: `${words.days.slice(0, 3).join(" ")} · ${words.closed}`,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

/** Which vocabulary a tag resolves to, so `en-GB` shows English as the pressed row. */
function vocabularyKeyOf(tag: string): string | undefined {
  const words = vocabulary(tag);
  return LANGUAGE_CHOICES.find((choice) => vocabulary(choice.tag) === words)?.tag;
}

const isListed = (tag: string): boolean => tag !== "" && vocabularyKeyOf(tag) !== undefined;

/**
 * The menu panel's width, with the px each class buys written beside it (#196, B-53, B-67).
 *
 * **A `min-width` here is not a floor — it is the width.** The panel is `absolute` inside a
 * shrink-wrapped `relative`, so shrink-to-fit resolves against the Menu button's own width and
 * the content can never push the panel wider than the minimum it was given. At `min-w-64` that
 * minimum was 256px, and §7.8's fork lives inside it: measured with the ritual at 1440 and at
 * 390, "Download my work first" came to **224px inside 224px of usable panel**. Not one pixel of
 * slack: exactly none. It did not wrap in the browser the ritual runs, which is why the finding
 * reads as intermittent — a fallback font, a longer translation or one more word puts it on two
 * lines, and §4 says siblings in an action row share a spec.
 *
 * So the panel is sized by what it holds — `w-max` — with the minimum kept as a floor for the
 * menu on its own (its one item is 188px, and a 204px dropdown reads as an accident) and a cap
 * so the confirmation's sentence still wraps to a readable measure instead of running out to its
 * own max-content. The cap is clamped to the viewport as well, for a screen narrower than the
 * §7.6 size we photograph: the list's own gutter is `p-5` a side, which is the 2.5rem below.
 */
export const MENU_PANEL = {
  className: "w-max min-w-64 max-w-[min(20rem,calc(100vw-2.5rem))]",
  /** `min-w-64` — the panel holding nothing but its one menu item. */
  floorPx: 256,
  /** `max-w-[20rem]` — the panel holding §7.8's fork. */
  capPx: 320,
  /** Its own gutter and its own hairline, both sides (`p-2` and `border`). */
  chromePx: 18,
  /** The confirmation's leading rule and inset (`border-s-2 ps-3`), on one side. */
  insetPx: 14,
  /**
   * The widest control the panel has to hold on one line — "Download my work first", measured
   * in the ritual at both of §7.6's sizes. Written down because 0px of slack is not a number
   * anybody would have guessed from the class list.
   */
  widestControlPx: 224,
} as const;

/**
 * The list's menu, which is where Import lives (§7.8).
 *
 * Not the Download sheet: **the sheet is where things leave; import is the one action that can
 * destroy what is there.** The mechanics — replace-never-merge, the concrete confirmation that
 * names the outgoing project, the offer to download it first — are #36's, and this is the
 * doorway they specify. §7.9 puts a failure in the menu's own surface with the project intact
 * behind it, so the message has a place to appear here rather than in a modal.
 */
function Menu({
  onImport,
  confirm,
  error,
}: {
  readonly onImport?: () => void;
  readonly confirm?: ReactNode;
  readonly error?: ReactNode;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  /**
   * Something to say arrives, so the surface that says it opens.
   *
   * The OS picker takes the screen while it is up and the menu can be dismissed underneath it,
   * which would leave §7.8's confirmation or §7.9's message correct and invisible. Keyed on
   * whether there is one rather than on the node, so Escape still closes a menu that is only
   * showing what it showed a moment ago.
   */
  const speaking = confirm !== undefined || error !== undefined;
  useEffect(() => {
    if (speaking) setOpen(true);
  }, [speaking]);

  // Escape closes it, at both sizes and from anywhere in it.
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  return (
    <div className="relative" data-menu>
      <Button
        type="button"
        weight="secondary"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        Menu
      </Button>
      <div
        id={menuId}
        className={`absolute top-[calc(100%+0.25rem)] left-0 z-10 ${MENU_PANEL.className} rounded-sm border border-rule bg-surface p-2 shadow-lg`}
        data-menu-panel
        hidden={!open}
      >
        {/* Unavailable rather than inert until #36 is behind it — as with Download above. */}
        <button
          type="button"
          className="tap w-full rounded-sm bg-transparent px-3 py-2 text-start font-sans disabled:text-ink-quiet"
          disabled={onImport === undefined}
          onClick={onImport}
        >
          Open a project file…
        </button>
        {/*
         * §7.8's confirmation and §7.9's refusal are the same place — the menu's own surface,
         * with the project intact behind it — and they cannot both be showing: a file is either
         * refused outright or held for the confirmation. `<div>` and not `<p>`, because both
         * carry flow content: a `<details>` in one and the fork's three controls in the other.
         */}
        {confirm !== undefined && (
          <div className="mt-2 border-s-2 border-notice ps-3 font-sans" data-notice>
            {confirm}
          </div>
        )}
        {error !== undefined && (
          <div className="mt-2 border-s-2 border-notice ps-3 font-sans" data-notice>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
