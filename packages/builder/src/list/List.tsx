import { useEffect, useId, useState, type JSX, type ReactNode } from "react";
import "../flow/flow.css";
import { applyIntake, type LogoIntake } from "../logo/index.js";
import { NameQuestion, TaglineQuestion } from "../flow/questions/HeaderQuestions.js";
import { HoursQuestion } from "../flow/questions/HoursQuestion.js";
import { LogoQuestion } from "../flow/questions/LogoQuestion.js";
import { QuestionShellProvider } from "../flow/questions/Question.js";
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
import type { Draft } from "../project/index.js";
import { removeTopic, setLang } from "./edits.js";
import "./list.css";
import { LinkButtons } from "./LinkButtons.js";
import { listRows, type Row, type RowId } from "./rows.js";
import { StyleStep } from "./StyleStep.js";

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
 * **Download and Import are entry points here and behaviours elsewhere** — `download/` owns the
 * sheet (§7.7) and `open/` the import mechanics (§7.8). Both arrive as optional handlers: this
 * screen settles *where* they are, which is what §7.4 and §7.8 actually specify, and neither is
 * offered until something supplies one. That includes the two surfaces the menu lends §7.8's
 * confirmation and §7.9's message: the list holds the place and none of the decision.
 */

export interface ListProps {
  readonly draft: Draft;
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
    <main className="list">
      <div className="list__panel">
        <div className="list__bar">
          <Menu onImport={onImport} confirm={importConfirm} error={importError} />
          {/*
           * §7.7's sheet is #35's. The button is where §7.4 puts it and says what it does; it
           * is unavailable rather than inert until there is a sheet behind it, because a
           * control that answers a press with nothing is worse than one that says it is not
           * ready.
           */}
          <button
            type="button"
            className="list__download"
            disabled={onDownload === undefined}
            onClick={onDownload}
          >
            Download
          </button>
        </div>

        <h1 className="list__title">{draft.header.name}</h1>

        <ul className="list__rows">
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
          <section className="list__more">
            <h2 className="list__more-title">Anything else?</h2>
            {/*
             * Ticking one of these does not park an empty row: it hands the topic to the flow,
             * which walks the owner through it and puts them back here (§7.1). That is why the
             * labels name the thing rather than the act — the list is an inventory of the page.
             */}
            <ul className="presets">
              {uncovered.map((topic) => (
                <li key={topic}>
                  <button type="button" className="presets__option" onClick={() => onAdd(topic)}>
                    <span className="presets__label">{TOPIC_LABELS[topic]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="list__preview">
        <Preview project={draft} />
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
    <li className="list__row" data-row={row.id}>
      <button
        type="button"
        className="list__row-toggle"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        <span className="list__row-label">{row.label}</span>
        <span className="list__row-summary">{row.summary}</span>
      </button>

      <div id={bodyId} className="list__row-body" hidden={!open}>
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
  const fieldId = useId();

  return (
    <div className="list__lang">
      <label className="field" htmlFor={fieldId}>
        <span className="field__label">Page language</span>
        <span className="field__hint">
          A language code, like <code>en</code> or <code>fr-CA</code>. Screen readers and
          translation tools read it.
        </span>
        <input
          id={fieldId}
          type="text"
          className="input"
          value={value}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(event) => setValue(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="question__submit"
        disabled={value.trim() === ""}
        onClick={() => {
          onChange(setLang(draft, value));
          onDone();
        }}
      >
        Save
      </button>
    </div>
  );
}

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
    <div className="list__menu">
      <button
        type="button"
        className="button-secondary"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen(!open)}
      >
        Menu
      </button>
      <div id={menuId} className="list__menu-panel" hidden={!open}>
        {/* Unavailable rather than inert until #36 is behind it — as with Download above. */}
        <button
          type="button"
          className="list__menu-item"
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
        {confirm !== undefined && <div className="notice">{confirm}</div>}
        {error !== undefined && <div className="notice">{error}</div>}
      </div>
    </div>
  );
}
