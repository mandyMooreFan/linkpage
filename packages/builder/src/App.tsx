import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type JSX } from "react";
import { DownloadSheet } from "./download/index.js";
import { Flow } from "./flow/Flow.js";
import { flowEntry, type FlowEntry } from "./flow/plan.js";
import { answerLang } from "./flow/topics.js";
import { List } from "./list/index.js";
import { projectFile, ProjectPicker, RefusalNotice, ReplaceConfirm } from "./open/index.js";
import {
  createProjectStore,
  readProjectFile,
  REFUSAL_MESSAGES,
  type ReadResult,
  type Refusal,
  type StorageLike,
} from "./project/index.js";

/**
 * The builder's two screens, and the rule that joins them. `SPEC.md` §7.1.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 *
 * There is one decision here and `flowEntry` makes it: no project, or a project missing
 * something required, and the flow owns the window; otherwise the list does. Everything else on
 * this page is wiring — the store from #30, the preview from #32, the flow from #33, the list
 * from #34, and the seam that hands a ticked topic back to the flow and takes the owner back to
 * the list when it has been answered.
 *
 * **That decision is made per _run_, not per render** (#65). A run is one walk of the flow,
 * from the moment it takes the window to the moment the owner lands on the list, and it is
 * planned once — at the moment it starts. It has to be, because `flowEntry` answers about a
 * moment rather than about a draft: the first answer of a first run *creates* the project, and
 * from that instant "a first run in progress" and "a project missing something required" are
 * the same draft. Deriving the entry on every render therefore re-planned a first run down to
 * its still-missing required field the instant the name was typed, and the tagline, the logo,
 * the links and every section the preset had selected were never asked.
 *
 * **A run boundary is one of four things, and nothing else is one:** the app opening, a project
 * replaced wholesale by an import (§7.8), a section ticked on the list (§7.1), and a run
 * ending. `startRun` is the only writer of the run, so those four call sites are the complete
 * list — and answering a question is not among them.
 *
 * **Import is one route with two doorways** (§7.8): the quiet line on the first screen and the
 * review list's menu. Both arrive at `offerFile`, and the decision it makes is about the
 * *project*, never about which control was pressed — **empty localStorage opens immediately;
 * anything else is confirmed by name first.** That the quiet line always takes the first branch
 * is not a rule written here: the preset step only exists on a `kind: "empty"` entry, which is
 * only reachable with no project at all, so the screen carrying the line is the screen with
 * nothing to lose.
 *
 * **A file is parsed before anything is asked or replaced.** `readProjectFile` is pure, so a
 * refusal is decided without touching a thing (§4.6) — which is what lets §7.9 put the message
 * in place beside the control, with the existing project intact behind it, and why the
 * confirmation is only ever raised for a swap that will actually work.
 *
 * **Download is a sheet over the list, and one boolean is the whole of its state** (§7.7). It is
 * held here rather than inside the list because the sheet is a layer over that screen. Its
 * second section is the same `projectFile` that §7.8 asks about, which is why one call feeds
 * both. There is deliberately no other state: nothing records that a file was written, and
 * nothing compares it against later edits.
 */

/** §4.1: `lang` defaults to the browser's language at first run, never to a hardcoded `"en"`. */
function browserLang(): string {
  return globalThis.navigator?.language ?? "en";
}

export interface AppProps {
  /**
   * Where the project lives. Omitted in the browser, where the store finds `localStorage`
   * itself (#30).
   *
   * Passed by the tests, and not only for isolation: Node 26 defines a `localStorage` global of
   * its own, which shadows the one jsdom installs and answers `undefined`. A test that reached
   * for the ambient global would then be asserting against whichever runtime CI happened to
   * use. Handing the storage in is both the smaller dependency and the honest one.
   */
  readonly storage?: StorageLike;
}

export function App({ storage }: AppProps = {}): JSX.Element {
  const store = useMemo(
    () => createProjectStore(storage === undefined ? {} : { storage }),
    [storage],
  );
  const snapshot = useSyncExternalStore(store.subscribe, store.snapshot, store.snapshot);

  /**
   * The run that owns the window: how it was entered, and `null` when the list owns it instead.
   *
   * Held still for the life of the run — that is the whole of it. `entry` is what the flow is
   * planned from and `runs` counts the runs, and the two move together because `startRun` is
   * the only thing that writes either.
   *
   * Seeded from the store once, at mount. There is no second store to go stale against: a
   * browser has one `localStorage`, and `storage` is a test seam that is fixed for the life of
   * a mounted app.
   */
  const [entry, setEntry] = useState<FlowEntry | null>(() => flowEntry(store.snapshot().draft));
  const [runs, setRuns] = useState(0);
  /** §7.9's message, from the last picked file. Cleared by picking again, not by dismissing. */
  const [fileError, setFileError] = useState<Refusal | null>(null);
  /**
   * A validated file, waiting on §7.8's confirmation. The text and nothing else — there is no
   * half-loaded state anywhere, and cancelling drops it.
   */
  const [pending, setPending] = useState<string | null>(null);
  /** Whether §7.7's sheet is open. There is no other download state, here or anywhere. */
  const [downloading, setDownloading] = useState(false);
  /** The list's menu opens this; the quiet line has a picker of its own (§7.8). */
  const picker = useRef<HTMLInputElement>(null);

  const draft = snapshot.draft;

  /**
   * Start a run, or hand the window back to the list.
   *
   * The bump is what remounts the flow, so a run is torn down when the next one begins and
   * never in the middle of one. Callers that re-derive the entry ask `store.snapshot()` rather
   * than closing over `snapshot`: a run ends inside the very event that answered its last
   * question, so the render-time snapshot is one answer out of date there.
   */
  function startRun(next: FlowEntry | null): void {
    setEntry(next);
    setRuns((count) => count + 1);
  }

  /**
   * The one required field that is not a question (§4.1).
   *
   * The flow fills it for a project that passes through it, but a file arriving with a name and
   * a colour and no `lang` goes straight to the list — so the default belongs here, where both
   * roads meet, rather than in the flow. It is silent, as §4.3 requires, and it is visible for
   * the same reason: a field defaulted on load is an ordinary row on the list.
   */
  useEffect(() => {
    if (draft === null || draft.lang !== undefined) return;
    store.update(answerLang(draft, browserLang()));
  }, [draft, store]);

  /** The project as a file: §7.7's second section, and §7.8's "is there anything to lose?". */
  const file = projectFile(store);

  /**
   * A file the owner picked, from either doorway (§7.8).
   *
   * Read, parsed and judged before anything moves. The three outcomes are the spec's three:
   * refused in place (§7.9), opened immediately because there is nothing to lose, or held for
   * the confirmation that names what would go.
   */
  function offerFile(picked: File): void {
    void picked.text().then(
      (text) => {
        const result = readProjectFile(text);
        // Atomic (§4.6): nothing has been touched to get here, so there is nothing to restore
        // and the message is the whole of the recovery.
        if (!result.ok) {
          setPending(null);
          setFileError(result.refusal);
          return;
        }
        setFileError(null);
        // Asked again rather than closed over: the owner has been in a file dialog since this
        // render, and §7.8's fork is about the project as it is now. One definition of "is there
        // a project", so the confirmation and the Download sheet cannot disagree about it.
        if (projectFile(store) === null) openFile(text);
        else setPending(text);
      },
      // The bytes never arrived — a revoked permission, a removed drive. Not a JSON problem, but
      // it is the same sentence to the owner and the same disclosure for whoever wants more.
      (error: unknown) => {
        setPending(null);
        setFileError({
          reason: "damaged",
          message: REFUSAL_MESSAGES.damaged,
          detail: `The file could not be read: ${error instanceof Error ? error.message : String(error)}`,
        });
      },
    );
  }

  /**
   * Take a file as the project, and re-plan against what arrived.
   *
   * **A project replaced wholesale is a run boundary**, and the only one that is not a press on
   * a screen. An import landing mid-flow re-opens against the file that arrived — nothing in
   * the run that was on screen was about this project — and a file missing something required
   * is walked through it rather than reported (§4.6), which is the same rule as the app opening
   * on one.
   */
  function openFile(text: string): ReadResult {
    const result = store.open(text);
    if (result.ok) startRun(flowEntry(store.snapshot().draft));
    return result;
  }

  /** Replace, now that the owner has said so. Validated already; re-checked because it is free. */
  function replaceWith(text: string): void {
    const result = openFile(text);
    setPending(null);
    setFileError(result.ok ? null : result.refusal);
  }

  /**
   * §7.9's message, wherever the screen puts it.
   *
   * A refusal from the picked file first, then the one the store may be holding about what is
   * *in* storage — a project from a newer builder is still the owner's project and is reported
   * rather than deleted (#30), and the first screen is where they would meet it.
   */
  const refusal = fileError ?? snapshot.refusal;
  const notice = refusal === null ? undefined : <RefusalNotice refusal={refusal} />;

  // `flowEntry` answers `null` only when there is a draft, so the second half of this test is
  // a type narrowing rather than a second rule.
  if (entry !== null || draft === null) {
    return (
      <Flow
        // **The run, and nothing else.** A fresh run starts the plan, the picks and the preset
        // again; a run in progress is never remounted, because everything that could tear it
        // down — the entry, the draft, whether there is a document yet — is something its own
        // first answer changes.
        key={`run:${runs}`}
        entry={entry ?? { kind: "empty" }}
        draft={draft}
        lang={browserLang()}
        onChange={store.update}
        // The questions have run out (§7.1). Asked of the store rather than of `snapshot`,
        // which is one answer out of date inside the event that answered the last question.
        onDone={() => startRun(flowEntry(store.snapshot().draft))}
        onOpenFile={offerFile}
        {...(notice === undefined ? {} : { fileError: notice })}
      />
    );
  }

  return (
    <>
      <List
        draft={draft}
        onChange={store.update}
        // §7.1's re-entry, and a run boundary: a ticked section is planned when it is ticked.
        onAdd={(topic) => startRun({ kind: "add", topics: [topic] })}
        onDownload={() => setDownloading(true)}
        // §7.8: the menu, not the Download sheet. The sheet is where things leave; import is the
        // one action that can destroy what is there.
        onImport={() => picker.current?.click()}
        {...(pending === null || file === null
          ? {}
          : {
              importConfirm: (
                <ReplaceConfirm
                  {...(file.name === undefined ? {} : { name: file.name })}
                  outgoing={file.download}
                  onOpen={() => replaceWith(pending)}
                  onCancel={() => setPending(null)}
                />
              ),
            })}
        {...(notice === undefined ? {} : { importError: notice })}
      />
      {/* The menu item's press reaches the OS dialog through this, and nothing else does. */}
      <ProjectPicker ref={picker} onPick={offerFile} />
      {/*
       * Mounted only while open, so leaving it and coming back opens the sheet at the top with
       * the page built from the project as it stands — the same reason the preview drawer
       * mounts its frame on demand.
       *
       * Section two's file is the same one §7.8 would offer to save on the way out: one rule for
       * what it is called, one route to disk, and no way for the two to disagree.
       */}
      {downloading && (
        <DownloadSheet
          draft={draft}
          onClose={() => setDownloading(false)}
          {...(file === null ? {} : { projectDownload: file.download })}
        />
      )}
    </>
  );
}
