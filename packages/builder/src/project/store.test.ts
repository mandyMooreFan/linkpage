import { SCHEMA_VERSION } from "@linkpage/renderer";
import { describe, expect, it, vi } from "vitest";
import { serializeProject } from "./document.js";
import { emptyDraft, writeDraft, type Draft } from "./schema.js";
import { createProjectStore, PROJECT_STORAGE_KEY, type StorageLike } from "./store.js";

/**
 * The store: autosave, and the atomicity §4.6 demands of an import.
 *
 * The atomicity tests are deliberately paranoid — they use a storage that throws if it is
 * written at all, rather than comparing before-and-after bytes. "Never touch the existing
 * project on the way to failing" is a claim about what the failing path *does*, and a
 * before-and-after comparison would pass for an implementation that wrote and then put it back.
 */

interface FakeStorage extends StorageLike {
  readonly entries: Map<string, string>;
  writes: number;
}

function fakeStorage(seed?: string): FakeStorage {
  const entries = new Map<string, string>();
  if (seed !== undefined) entries.set(PROJECT_STORAGE_KEY, seed);
  const storage: FakeStorage = {
    entries,
    writes: 0,
    getItem: (key) => entries.get(key) ?? null,
    setItem(key, value) {
      storage.writes += 1;
      entries.set(key, value);
    },
    removeItem(key) {
      storage.writes += 1;
      entries.delete(key);
    },
  };
  return storage;
}

/** A storage that refuses to be written to, so any write at all is a test failure. */
function sealedStorage(seed: string): StorageLike {
  return {
    getItem: (key) => (key === PROJECT_STORAGE_KEY ? seed : null),
    setItem: () => {
      throw new Error("the store wrote to storage when it should not have");
    },
    removeItem: () => {
      throw new Error("the store cleared storage when it should not have");
    },
  };
}

const ada: Draft = {
  ...emptyDraft("en"),
  style: { ...emptyDraft("en").style, brand: "#c2185b" },
  header: { name: "Ada's Bakery", logo: null },
  links: [{ label: "Order online", url: "https://example.com/order" }],
};

const adaFile = serializeProject(writeDraft(ada));

describe("first run", () => {
  it("has no project when storage is empty (§7.8)", () => {
    const store = createProjectStore({ storage: fakeStorage() });
    expect(store.snapshot().draft).toBeNull();
    expect(store.snapshot().refusal).toBeNull();
    expect(store.text()).toBeNull();
  });

  it("works without any storage at all rather than refusing to start", () => {
    // Safari in private mode throws on access; an editor that cannot autosave is still an editor.
    const store = createProjectStore();
    expect(() => store.update(ada)).not.toThrow();
    expect(store.snapshot().draft?.header.name).toBe("Ada's Bakery");
  });
});

describe("autosave", () => {
  it("writes through on every change, with no window in which work is lost", () => {
    const storage = fakeStorage();
    const store = createProjectStore({ storage });
    store.update(ada);
    expect(storage.entries.get(PROJECT_STORAGE_KEY)).toBe(adaFile);
    expect(store.text()).toBe(adaFile);
  });

  it("is picked up whole by the next session", () => {
    const storage = fakeStorage();
    createProjectStore({ storage }).update(ada);
    const next = createProjectStore({ storage });
    expect(next.snapshot().draft).toEqual(ada);
  });

  it("shows the project as it will be stored, not as it was handed over", () => {
    const storage = fakeStorage();
    const store = createProjectStore({ storage });
    store.update({ ...ada, style: { ...ada.style, corners: 40 } });
    expect(store.snapshot().draft?.style.corners).toBe(1);
  });

  it("keeps the edit and reports the failure when storage is full", () => {
    // A logo is the likely cause (§6.5). Durability has failed; the project has not.
    const storage: StorageLike = {
      getItem: () => null,
      setItem: () => {
        throw new Error("QuotaExceededError");
      },
      removeItem: () => {},
    };
    const store = createProjectStore({ storage });
    store.update(ada);
    expect(store.snapshot().saveError).toContain("QuotaExceeded");
    expect(store.snapshot().draft).toEqual(ada);
    expect(store.text()).toBe(adaFile);
  });

  it("notifies subscribers, and stops when they leave", () => {
    const store = createProjectStore({ storage: fakeStorage() });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    const before = store.snapshot();

    store.update(ada);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.snapshot()).not.toBe(before);
    // Stable between changes, so it can back `useSyncExternalStore` without looping.
    expect(store.snapshot()).toBe(store.snapshot());

    unsubscribe();
    store.update(ada);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("forgets the project on clear", () => {
    const storage = fakeStorage();
    const store = createProjectStore({ storage });
    store.update(ada);
    store.clear();
    expect(store.snapshot().draft).toBeNull();
    expect(storage.entries.has(PROJECT_STORAGE_KEY)).toBe(false);
  });
});

describe("opening a file (§4.6, §7.8)", () => {
  it("replaces the project entirely, and never merges", () => {
    // §7.8: merge has no coherent intent behind a one-page file.
    const storage = fakeStorage();
    const store = createProjectStore({ storage });
    store.update({
      ...ada,
      hours: { clock: "12h", weekStart: "mon", days: { mon: [["09:00", "17:00"]] } },
    });

    store.open('{"version":1,"lang":"en","style":{"brand":"#00695c"},"header":{"name":"Bo"}}');
    const draft = store.snapshot().draft;
    expect(draft?.header.name).toBe("Bo");
    expect(draft?.hours).toBeUndefined();
    expect(draft?.links).toEqual([]);
  });

  it("leaves everything alone when the file is damaged", () => {
    const store = createProjectStore({ storage: sealedStorage(adaFile) });
    const before = store.snapshot();

    const result = store.open("{ this is not a file");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal.reason).toBe("damaged");
    // Same object: not restored, not rebuilt — untouched.
    expect(store.snapshot()).toBe(before);
    expect(store.snapshot().draft?.header.name).toBe("Ada's Bakery");
  });

  it("leaves everything alone when the file is not a linkpage file", () => {
    const store = createProjectStore({ storage: sealedStorage(adaFile) });
    const result = store.open("[1, 2, 3]");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal.reason).toBe("not-a-project");
    expect(store.text()).toBe(adaFile);
  });

  it("leaves everything alone when the file is from a newer builder", () => {
    const store = createProjectStore({ storage: sealedStorage(adaFile) });
    const result = store.open(
      JSON.stringify({ version: SCHEMA_VERSION + 1, header: { name: "" } }),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.refusal.reason).toBe("too-new");
    expect(store.text()).toBe(adaFile);
  });

  it("does not raise a refusal on the store — the message belongs beside the control (§7.9)", () => {
    const store = createProjectStore({ storage: sealedStorage(adaFile) });
    store.open("nonsense");
    expect(store.snapshot().refusal).toBeNull();
  });

  it("accepts a file that is missing everything the flow can ask for", () => {
    // §4.6: missing required fields produce no error surface at all.
    const storage = fakeStorage();
    const store = createProjectStore({ storage });
    expect(store.open("{}").ok).toBe(true);
    expect(store.snapshot().draft?.style.brand).toBeUndefined();
    // Stored as it arrived, formatting aside: opening a file is not an edit, and rewriting it
    // here would put the byte-identical guarantee at the mercy of our defaults (§4.5).
    expect(storage.entries.get(PROJECT_STORAGE_KEY)).toBe("{}\n");
  });
});

describe("a stored project we cannot read", () => {
  const tooNew = JSON.stringify({ version: SCHEMA_VERSION + 1 }, null, 2);

  it("is reported rather than loaded", () => {
    const store = createProjectStore({ storage: fakeStorage(tooNew) });
    expect(store.snapshot().draft).toBeNull();
    expect(store.snapshot().refusal?.reason).toBe("too-new");
  });

  it("is left exactly where it is", () => {
    // It is still the owner's project. Nothing here is entitled to delete it.
    const storage = fakeStorage(tooNew);
    createProjectStore({ storage });
    expect(storage.entries.get(PROJECT_STORAGE_KEY)).toBe(tooNew);
    expect(storage.writes).toBe(0);
  });
});
