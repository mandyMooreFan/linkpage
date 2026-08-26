import type { Logo } from "@linkpage/renderer";
import { useRef, useState, type JSX } from "react";
import { browserImageCodec, importLogo, LOGO_ACCEPT, type LogoIntake } from "../../logo/index.js";
import { Question } from "./Question.js";
import { Button } from "../../ui/Button.js";
import { Panel } from "../../ui/Panel.js";
import { TYPE } from "../../ui/type.js";

/**
 * The logo step. `SPEC.md` §6.6, §7.9.
 *
 * The pipeline is #31's and lives in `../../logo`; this screen is the four lines that call it.
 * Three of its rules are visible here and none of them is enforced here, which is the point of
 * that module's shape:
 *
 * - **`accept` is the explicit list, never `image/*`** — on desktop it greys designer files out
 *   of the picker so the failure never happens.
 * - **A failed input never damages what is already there.** `applyIntake` takes the whole
 *   result rather than a logo, so the rejected branch has nothing to apply; the caller cannot
 *   get this wrong and this screen does not try.
 * - **Usually there is no message at all** — the logo appears in the preview, and that is the
 *   feedback. What is shown, when anything is, is one sentence in place beside the control that
 *   opened the picker (§7.9): the soft-result notice, or the reason nothing happened.
 *
 * The chosen logo reaches the draft immediately rather than on _Continue_, because the preview
 * is the feedback and feedback after the screen has gone is not feedback. Declining afterwards
 * takes it back off — which is why the escape is the same control whether or not one is there.
 */

export interface LogoQuestionProps {
  readonly logo: Logo | null;
  /** Applied by the flow through `applyIntake`, which is a no-op when the result is a refusal. */
  readonly onPick: (result: LogoIntake) => void;
  readonly onContinue: () => void;
  /** Clears any logo picked on this screen and moves on. */
  readonly onSkip: () => void;
  readonly onBack?: () => void;
  /** Injected by the tests. A browser has `<img>` and `<canvas>`; jsdom has neither. */
  readonly intake?: (file: File) => Promise<LogoIntake>;
}

export function LogoQuestion({
  logo,
  onPick,
  onContinue,
  onSkip,
  onBack,
  intake,
}: LogoQuestionProps): JSX.Element {
  const picker = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const read = intake ?? ((file: File) => importLogo(file, browserImageCodec()));

  return (
    <Question
      title="Do you have a logo?"
      hint="A picture file from your signage, menus or social profile."
      onSubmit={onContinue}
      submitDisabled={logo === null || busy}
      escape={{ label: "We don't have one", onEscape: onSkip }}
      onBack={onBack}
    >
      <Button disabled={busy} onClick={() => picker.current?.click()}>
        {logo === null ? "Choose a file" : "Choose a different file"}
      </Button>
      <input
        ref={picker}
        type="file"
        accept={LOGO_ACCEPT}
        className="sr-only"
        aria-label="Choose a logo file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Cleared straight away so picking the same file twice — after a refusal, which is
          // the recovery §7.9 designs for — still fires a change.
          event.target.value = "";
          if (!file) return;
          setBusy(true);
          setMessage(null);
          void read(file).then((result) => {
            setBusy(false);
            setMessage(result.ok ? result.notice : result.message);
            onPick(result);
          });
        }}
      />
      {/*
       * `Panel`, not a fifth copy of its recipe (B-47). The `mt-2` that came with the copy goes
       * with it: this is a direct child of the question's own `LADDER.betweenFields` column, so
       * the margin was stacking on a gap and putting the message 8px further from the button
       * that produced it than the "have a look at your page" line directly below is. The parent
       * gap does the spacing, and the two messages now stand at the same distance.
       */}
      {message !== null && (
        <Panel tone="notice" data-notice>
          {message}
        </Panel>
      )}
      {logo !== null && message === null && (
        <p className={TYPE.quietLine.className}>Have a look at your page to see it.</p>
      )}
    </Question>
  );
}
