import { useEffect, useState, type JSX, type ReactNode } from "react";
import { applyIntake, clearLogo, type LogoIntake } from "../logo/index.js";
import { Preview } from "../preview/Preview.js";
import { emptyDraft, type Draft } from "../project/index.js";
import { openingAt, planSteps, type FlowEntry, type Pick, type Step } from "./plan.js";
import { findPreset, type PresetId } from "./presets.js";
import { ColourQuestion } from "./questions/ColourQuestion.js";
import { NameQuestion, TaglineQuestion } from "./questions/HeaderQuestions.js";
import { LinksQuestion, LinkUrlQuestion } from "./questions/LinkQuestions.js";
import { LogoQuestion } from "./questions/LogoQuestion.js";
import { HoursQuestion } from "./questions/HoursQuestion.js";
import { PresetQuestion } from "./questions/PresetQuestion.js";
import { AddressQuestion, ContactQuestion, SocialQuestion } from "./questions/SectionQuestions.js";
import { barUnits, ProgressBar } from "./ProgressBar.js";
import {
  addLink,
  answerBrand,
  answerLang,
  answerName,
  answerSection,
  answerTagline,
} from "./topics.js";

/**
 * The flow: one question per screen, with the page filling in beside it. `SPEC.md` §7.1–§7.3,
 * §7.6, §7.8.
 *
 * **The flow is the empty state, and it re-enters for anything new.** Both of those are
 * `plan.ts`'s job; this component is what a plan looks like. It renders one step, holds the
 * three things a plan is a function of — the preset, the picks and where the owner is — and
 * hands every answer to the doors in `topics.ts`.
 *
 * **The preset never leaves this component.** It is `useState` here, it is read by `planSteps`
 * and by the link step's suggestions, and there is no code path from it to `onChange`. That is
 * how §7.3's "there is no `preset` field, and there must not be one" is kept: not by
 * remembering to strip it, but by it never being anywhere near a `Draft`. Two owners who reach
 * the same page have byte-identical files whether one took a preset and the other ticked boxes
 * by hand, and `flow.test.tsx` proves it by building the same page twice under different
 * presets and comparing the bytes.
 *
 * **Nothing is written until something is answered.** Every commit goes through a door that
 * returns the draft unchanged when the answer is empty, and an unchanged draft is not passed to
 * `onChange` — so an owner who opens the flow and escapes every question leaves no project
 * behind, which matters because §7.8 counts any non-empty project as something to lose.
 *
 * **Answers reach storage as they are given, not at the end.** The store is write-through
 * (#30), so a closed tab loses at most the screen in progress; and a reload mid-flow re-enters
 * through `flowEntry`, which asks the same question the flow was already asking.
 *
 * **The preview is a drawer at both sizes** (§7.6). It sits after the question in the document
 * and moves itself, so there is one interaction here and no viewport branch.
 */

export interface FlowProps {
  readonly entry: FlowEntry;
  /** The project as it stands, or `null` for the empty state. */
  readonly draft: Draft | null;
  /** The browser's language, for the one required field that is not a question (§4.1). */
  readonly lang: string;
  /** Called with each answered step. Write-through: this is the autosave. */
  readonly onChange: (draft: Draft) => void;
  /** The questions have run out. The owner belongs on the review list now (§7.1). */
  readonly onDone: () => void;
  /** §7.8's quiet line, wired by #36. Absent hides the line. */
  readonly onOpenFile?: (file: File) => void;
  /** §7.9's message, shown under that line with the preset question untouched. */
  readonly fileError?: ReactNode;
  /** Test seam for #31's pipeline, which needs `<img>` and `<canvas>`. */
  readonly intake?: (file: File) => Promise<LogoIntake>;
}

export function Flow({
  entry,
  draft,
  lang,
  onChange,
  onDone,
  onOpenFile,
  fileError,
  intake,
}: FlowProps): JSX.Element | null {
  /**
   * The draft the flow opened with, held still.
   *
   * `planSteps` reads it, and it must not move: answering "what's it called?" would otherwise
   * delete the step that asked, and `Back` would walk into a hole. The plan changes only when
   * the owner changes what there is to ask — the preset, or the picks.
   */
  const [opening] = useState<Draft | null>(draft);
  const [working, setWorking] = useState<Draft>(() =>
    draft === null ? emptyDraft(lang) : answerLang(draft, lang),
  );
  const [preset, setPreset] = useState<PresetId | null>(null);
  const [picks, setPicks] = useState<readonly Pick[]>([]);
  // A re-entry run opens at the topic that was ticked (§7.1, #146); every other run at the top.
  const [at, setAt] = useState(() =>
    openingAt(planSteps({ entry, draft, preset: null, picks: [] }), entry),
  );

  /**
   * The topics this run has finished with — left forwards, answered or escaped. A set keyed by
   * the bar's unit labels, which only grows: neither `Back` nor a jump removes from it, which
   * is §7.2's "the fill never retreats", and a jump adds nothing to it, which is how
   * jumped-over territory stays visibly not done.
   */
  const [doneUnits, setDoneUnits] = useState<ReadonlySet<string>>(new Set());

  const steps = planSteps({ entry, draft: opening, preset, picks });

  // A plan with nothing in it is a plan that is already finished. Reachable only from a caller
  // that asks for topics the draft covers; the flow's own entries never produce one.
  const step = steps[Math.min(at, steps.length - 1)];
  const finished = step === undefined;
  useEffect(() => {
    if (finished) onDone();
  }, [finished, onDone]);
  if (step === undefined) return null;

  /** Move to the next screen, or off the end of the flow and onto the list. */
  function goNext(list = steps): void {
    // Leaving a unit's last screen forwards is what finishes it (§7.2) — computed against the
    // list actually being walked, so answering the links screen (which grows the plan) keeps
    // the link run one still-open unit.
    const unit = barUnits(list).find((each) => at >= each.first && at <= each.last);
    if (unit !== undefined && at === unit.last && !doneUnits.has(unit.label)) {
      setDoneUnits(new Set([...doneUnits, unit.label]));
    }
    const next = at + 1;
    if (next >= list.length) onDone();
    else setAt(next);
  }

  /** §7.2: a jump is navigation only. It writes nothing and finishes nothing. */
  function jumpTo(index: number): void {
    setAt(index);
  }

  /**
   * Take an answer and move on.
   *
   * The doors decide whether there is anything to take: each returns the draft it was given
   * when the answer holds nothing, so `next === working` is exactly "that answered nothing",
   * and nothing is stored. There is no separate check for emptiness anywhere in this file.
   */
  function commit(next: Draft): void {
    if (next !== working) {
      setWorking(next);
      onChange(next);
    }
    goNext();
  }

  const onBack = at > 0 ? () => setAt(at - 1) : undefined;

  const suggestions = preset === null ? [] : findPreset(preset).suggestions;

  function question(step: Step): JSX.Element {
    switch (step.id) {
      case "preset":
        return (
          <PresetQuestion
            chosen={preset}
            onChoose={(id) => {
              setPreset(id);
              // Deliberately not `commit`: a preset writes nothing, ever (§7.3). It changes
              // the plan, and the plan is not the project.
              setAt(1);
            }}
            onOpenFile={onOpenFile}
            fileError={fileError}
          />
        );

      case "name":
        return (
          <NameQuestion
            initial={working.header.name}
            onAnswer={(name) => commit(answerName(working, name))}
            onBack={onBack}
          />
        );

      case "tagline":
        return (
          <TaglineQuestion
            initial={working.header.tagline}
            onAnswer={(tagline) => commit(answerTagline(working, tagline))}
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );

      case "logo":
        return (
          <LogoQuestion
            logo={working.header.logo}
            // Straight to the draft, so the preview is the feedback (§6.6). A refusal applies
            // nothing — `applyIntake` takes the whole result for exactly that reason.
            onPick={(result) => {
              const next = applyIntake(working, result);
              if (next === working) return;
              setWorking(next);
              onChange(next);
            }}
            onContinue={() => goNext()}
            onSkip={() => commit(clearLogo(working))}
            onBack={onBack}
            intake={intake}
          />
        );

      case "brand":
        return (
          <ColourQuestion
            initial={working.style.brand}
            onAnswer={(brand) => commit(answerBrand(working, brand))}
            onBack={onBack}
          />
        );

      case "links":
        return (
          <LinksQuestion
            suggestions={suggestions}
            initial={picks}
            onAnswer={(chosen) => {
              setPicks(chosen);
              // The plan grew or shrank by the number of URL screens, so the jump has to be
              // computed against the new one rather than the one on screen.
              goNext(planSteps({ entry, draft: opening, preset, picks: chosen }));
            }}
            onSkip={() => {
              setPicks([]);
              goNext(planSteps({ entry, draft: opening, preset, picks: [] }));
            }}
            onBack={onBack}
          />
        );

      case "linkUrl":
        return (
          <LinkUrlQuestion
            pick={step.pick}
            position={step.position}
            total={step.total}
            onAnswer={(url) =>
              commit(
                addLink(working, {
                  label: step.pick.label,
                  url,
                  ...(step.pick.icon === undefined ? {} : { icon: step.pick.icon }),
                }),
              )
            }
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );

      case "hours":
        return (
          <HoursQuestion
            initial={working.hours}
            onAnswer={(hours) => commit(answerSection(working, { section: "hours", value: hours }))}
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );

      case "contact":
        return (
          <ContactQuestion
            initial={working.contact}
            onAnswer={(contact) =>
              commit(answerSection(working, { section: "contact", value: contact }))
            }
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );

      case "address":
        return (
          <AddressQuestion
            initial={working.address}
            onAnswer={(address) =>
              commit(answerSection(working, { section: "address", value: address }))
            }
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );

      case "social":
        return (
          <SocialQuestion
            initial={working.social}
            onAnswer={(social) =>
              commit(answerSection(working, { section: "social", value: social }))
            }
            onSkip={() => goNext()}
            onBack={onBack}
          />
        );
    }
  }

  return (
    <div
      className="flex min-h-dvh flex-col gap-6 bg-ground p-5 font-serif text-ink wide:flex-row wide:items-start wide:justify-center wide:gap-12 wide:px-8 wide:py-12"
      data-screen="flow"
    >
      <div className="mx-auto w-full max-w-lg wide:mx-0 wide:flex-1">
        {/*
         * Static chrome, outside the keyed subtree below (§7.2, §7.11): the bar never remounts
         * with the content, which is what lets its fill tween instead of blinking.
         */}
        <ProgressBar
          steps={steps}
          at={at}
          done={doneUnits}
          onJump={jumpTo}
          onLeave={entry.kind === "add" ? onDone : undefined}
        />
        {/*
         * Keyed by the step, so each question arrives with its own empty state. Two link-URL
         * screens in a row are the same component and would otherwise hold the previous answer.
         */}
        <div key={step.id === "linkUrl" ? step.pick.id : step.id}>{question(step)}</div>
      </div>
      <div className="mx-auto w-full max-w-lg wide:mx-0 wide:flex-1">
        <Preview project={working} />
      </div>
    </div>
  );
}
