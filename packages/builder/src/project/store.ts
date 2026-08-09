import {
  readProjectFile,
  serializeProject,
  type ProjectDocument,
  type ReadResult,
  type Refusal,
} from "./document.js";
import { readDraft, writeDraft, type Draft } from "./schema.js";

/**
 * The one project the builder is working on, and its home in `localStorage`.
 *
 * The store is the only thing that writes to storage and the only thing that decides when.
 * Three properties are worth stating because the tests hold them:
 *
 * 1. **Autosave is write-through, not debounced.** Every accepted change reaches storage
 *    before `update` returns. A debounce would buy a keystroke of latency in exchange for a
 *    window in which a closed tab loses work, and for a tool whose entire pitch is a durable
 *    artifact that is the wrong trade. `JSON.stringify` plus one synchronous `setItem` of a
 *    file this size is not what will make the editor feel slow.
 * 2. **Opening a file is atomic** (§4.6). The text is parsed and validated in full before any
 *    state exists to replace, so a refusal cannot leave a half-loaded project behind and does
 *    not touch storage at all — which is what lets §7.9 put the error in place, beside the
 *    control, with the existing project intact behind it.
 * 3. **Import replaces, never merges** (§7.8). There is no merge here to get wrong.
 *
 * The store never *deletes* a project it could not read. A stored document from a newer
 * builder surfaces as a refusal in the snapshot and stays exactly where it is.
 */

/** Where the project lives. Namespaced because the origin is shared with anything else on Pages. */
export const PROJECT_STORAGE_KEY = "linkpage.project";

/** The slice of the `Storage` interface the store uses. Tests pass their own. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface ProjectSnapshot {
  /**
   * The project, or `null` when storage is empty.
   *
   * `null` is the first-run state: the flow opens on the preset question with the quiet
   * "already have a project file?" line beneath it (§7.8).
   */
  readonly draft: Draft | null;
  /** The document behind the draft — unknown keys included. `null` alongside a `null` draft. */
  readonly document: ProjectDocument | null;
  /**
   * Set when what is *in* storage cannot be read, and never by a failed import.
   *
   * An import's refusal is returned to the caller instead, because §7.9 puts that message in
   * place beside the control that opened the picker — where it is dismissed by picking again,
   * not by clearing a flag on the store.
   */
  readonly refusal: Refusal | null;
  /**
   * Set when the last autosave threw — a full quota, most likely a logo (§6.6).
   *
   * The in-memory project is still correct and still exportable; what has failed is durability,
   * so the honest thing is to say so rather than to drop the edit.
   */
  readonly saveError: string | null;
}

export interface ProjectStore {
  /** Stable between changes, so it can back `useSyncExternalStore` directly. */
  snapshot(): ProjectSnapshot;
  subscribe(listener: () => void): () => void;
  /** Record an edit and autosave it. The draft is re-read from the merged document. */
  update(draft: Draft): void;
  /** Import a file (§7.8). Replaces on success; on refusal, nothing anywhere changes. */
  open(text: string): ReadResult;
  /** Forget the project. Storage is cleared; the store returns to its first-run state. */
  clear(): void;
  /** The exact bytes `Download` writes, or `null` when there is no project (§7.7). */
  text(): string | null;
}

const EMPTY: ProjectSnapshot = { draft: null, document: null, refusal: null, saveError: null };

/**
 * A `Storage` that is always there.
 *
 * Safari in private mode throws on `localStorage` access rather than returning null, and an
 * editor that cannot autosave should still be an editor.
 */
function memoryStorage(): StorageLike {
  const entries = new Map<string, string>();
  return {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => void entries.set(key, value),
    removeItem: (key) => void entries.delete(key),
  };
}

function defaultStorage(): StorageLike {
  try {
    const storage = globalThis.localStorage as StorageLike | undefined;
    if (storage) {
      storage.getItem(PROJECT_STORAGE_KEY);
      return storage;
    }
  } catch {
    // Blocked or unavailable. Fall through.
  }
  return memoryStorage();
}

export interface ProjectStoreOptions {
  storage?: StorageLike;
  key?: string;
}

export function createProjectStore(options: ProjectStoreOptions = {}): ProjectStore {
  const storage = options.storage ?? defaultStorage();
  const key = options.key ?? PROJECT_STORAGE_KEY;
  const listeners = new Set<() => void>();

  let snapshot: ProjectSnapshot = hydrate();

  function hydrate(): ProjectSnapshot {
    let stored: string | null;
    try {
      stored = storage.getItem(key);
    } catch {
      return EMPTY;
    }
    if (stored === null) return EMPTY;

    const result = readProjectFile(stored);
    // A stored project we cannot read is still the owner's project. Report it; leave it be.
    if (!result.ok) return { ...EMPTY, refusal: result.refusal };
    return adopt(result.document);
  }

  /** Take a document as the project, without saving it. */
  function adopt(document: ProjectDocument): ProjectSnapshot {
    return { draft: readDraft(document), document, refusal: null, saveError: null };
  }

  function publish(next: ProjectSnapshot): void {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  /** Write through, and report a failed write rather than losing the edit. */
  function persist(next: ProjectSnapshot): void {
    if (next.document === null) {
      try {
        storage.removeItem(key);
      } catch {
        // Nothing stored is the state we wanted anyway.
      }
      publish(next);
      return;
    }
    try {
      storage.setItem(key, serializeProject(next.document));
      publish(next);
    } catch (error) {
      publish({ ...next, saveError: error instanceof Error ? error.message : String(error) });
    }
  }

  return {
    snapshot: () => snapshot,

    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },

    update(draft) {
      // Merged into the document the draft came from, so unknown keys and untouched oddities
      // survive the edit (§4.5). Re-reading the result is what makes the snapshot show exactly
      // what a reload would show.
      const document = writeDraft(draft, snapshot.document ?? {});
      persist(adopt(document));
    },

    open(text) {
      const result = readProjectFile(text);
      // Everything above this line is pure and everything below it changes the world. On the
      // failing path nothing below runs: no state, no storage, not even a listener. That is
      // the whole of the atomicity guarantee (§4.6), and it is why §7.9 has nothing to restore.
      if (!result.ok) return result;
      persist(adopt(result.document));
      return result;
    },

    clear() {
      persist(EMPTY);
    },

    text: () => (snapshot.document === null ? null : serializeProject(snapshot.document)),
  };
}
