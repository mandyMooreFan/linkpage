import { useMemo, useState, useSyncExternalStore, type JSX } from "react";
import { Flow } from "./flow/Flow.js";
import { flowEntry, uncoveredTopics, type FlowEntry } from "./flow/plan.js";
import { TOPIC_LABELS, type Topic } from "./flow/topics.js";
import { Preview } from "./preview/Preview.js";
import { createProjectStore, type Draft, type StorageLike } from "./project/index.js";

/**
 * The builder's two screens, and the rule that joins them. `SPEC.md` §7.1.
 *
 * > **The flow is the empty state; the review list is the editing screen. They are the same
 * > product at two moments.**
 *
 * There is one decision here and `flowEntry` makes it: no project, or a project missing
 * something required, and the flow owns the window; otherwise the list does. Everything else on
 * this page is wiring — the store from #30, the preview from #32, and the seam that hands a
 * ticked topic back to the flow and takes the owner back to the list when it has been answered.
 *
 * **The review list below is a placeholder and #34 replaces all of it.** What is not a
 * placeholder is the two lines it uses: `uncoveredTopics(draft)` is what the list may offer,
 * and `{ kind: "add", topics: [...] }` is how it asks. Ticking _Opening hours_ a month later
 * walks the owner through hours and returns them here — the same code path a first run takes,
 * which is what §7.1 means by one mental model instead of two.
 *
 * **Import is wired only as far as §7.8's quiet line reaches.** #36 owns the rest: the menu on
 * the list, the concrete confirmation when there is a project to lose, and the offer to
 * download the outgoing one first. What is settled here is where a failure appears — in place,
 * under the line, with the preset question above it untouched (§7.9).
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

  /** A topic the list handed back, or `null` when the flow is not there on request. */
  const [request, setRequest] = useState<readonly Topic[] | null>(null);
  /** Bumped when the flow finishes, so escaping the last question still lands on the list. */
  const [runs, setRuns] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);

  const entry: FlowEntry | null =
    request === null ? flowEntry(snapshot.draft) : { kind: "add", topics: request };

  function openFile(file: File): void {
    void file.text().then(
      (text) => {
        const result = store.open(text);
        // Atomic (§4.6): on a refusal nothing anywhere changed, so there is nothing to restore
        // and the message is the whole of the recovery.
        setFileError(result.ok ? null : result.refusal.message);
      },
      () => setFileError("This file appears to be damaged."),
    );
  }

  const draft = snapshot.draft;

  // `flowEntry` answers `null` only when there is a draft, so the second half of this test is
  // a type narrowing rather than a second rule.
  if (entry !== null || draft === null) {
    return (
      <Flow
        // A fresh run each time: the plan, the picks and the preset all start again, and an
        // import landing mid-flow re-opens against the file that arrived.
        key={`${entry?.kind ?? "empty"}:${request?.join(",") ?? ""}:${runs}:${snapshot.document === null ? "none" : "some"}`}
        entry={entry ?? { kind: "empty" }}
        draft={draft}
        lang={browserLang()}
        onChange={store.update}
        onDone={() => {
          setRequest(null);
          setRuns(runs + 1);
        }}
        onOpenFile={openFile}
        fileError={fileError ?? snapshot.refusal?.message}
      />
    );
  }

  return <ReviewList draft={draft} onAdd={(topic) => setRequest([topic])} />;
}

/**
 * **Scaffold — #34 builds the real one** (§7.4): every answer a row, the page beside it,
 * Download, the import menu, and _How it looks_.
 *
 * What is real here is the seam. The second list is §7.1's mechanism in its simplest possible
 * form: the things this page does not have yet, each of which hands the flow a topic and gets
 * the owner walked through it.
 */
function ReviewList({
  draft,
  onAdd,
}: {
  readonly draft: Draft;
  readonly onAdd: (topic: Topic) => void;
}): JSX.Element {
  const uncovered = uncoveredTopics(draft);

  return (
    <main className="flow">
      <div className="flow__question">
        <h1 className="question__title">{draft.header.name}</h1>
        <p className="question__hint">
          Your page is ready. This is where you live from now on — the real list is #34.
        </p>

        {uncovered.length > 0 && (
          <>
            <h2 className="question__title">Anything else?</h2>
            <ul className="presets">
              {uncovered.map((topic) => (
                <li key={topic}>
                  <button type="button" className="presets__option" onClick={() => onAdd(topic)}>
                    <span className="presets__label">{TOPIC_LABELS[topic]}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
      <div className="flow__preview">
        <Preview project={draft} />
      </div>
    </main>
  );
}
