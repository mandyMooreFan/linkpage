import { useEffect, useMemo, useState, useSyncExternalStore, type JSX } from "react";
import { Flow } from "./flow/Flow.js";
import { flowEntry, type FlowEntry } from "./flow/plan.js";
import { answerLang } from "./flow/topics.js";
import type { Topic } from "./flow/topics.js";
import { List } from "./list/index.js";
import { createProjectStore, type StorageLike } from "./project/index.js";

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
 * **Import is wired only as far as §7.8's quiet line reaches.** #36 owns the rest: the menu
 * entry on the list, the concrete confirmation when there is a project to lose, and the offer
 * to download the outgoing one first. What is settled here is where a failure appears — in
 * place, under the line, with the preset question above it untouched (§7.9). **Download is
 * #35's** for the same reason; the list already says where the button is.
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

  const draft = snapshot.draft;

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

  return <List draft={draft} onChange={store.update} onAdd={(topic) => setRequest([topic])} />;
}
