import { SCHEMA_VERSION } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import {
  BUILDER_URL,
  readProjectFile,
  readVersion,
  REFUSAL_MESSAGES,
  serializeProject,
  upgradeDocument,
} from "./document.js";

/**
 * The refusal policy, which is the whole of what this module is allowed to do (SPEC.md §4.2,
 * §4.6). The rest of the store is total, so if a file is rejected anywhere it is rejected here,
 * and the tests below are the complete list of ways that can happen.
 */

/** `readProjectFile` with the refusal unwrapped, so the assertions read as the rules do. */
function refusalFor(text: string) {
  const result = readProjectFile(text);
  return result.ok ? null : result.refusal;
}

describe("refusing a file", () => {
  it("refuses text that is not JSON, and calls it damaged", () => {
    const refusal = refusalFor("{ this is not json");
    expect(refusal?.reason).toBe("damaged");
    expect(refusal?.message).toBe("This file appears to be damaged.");
  });

  it("refuses the owner's own index.html as not a linkpage file — not as damaged (§7.9)", () => {
    // The overwhelmingly common wrong pick is the exported page itself (§7.9). It does not parse,
    // but nothing about it is damaged: it was never a project file, and §4.6's sentence has to
    // be true of the file the owner is looking at.
    const page =
      '<!doctype html>\n<html lang="en"><head><title>Ada\'s Bakery</title></head></html>\n';
    const refusal = refusalFor(page);
    expect(refusal?.reason).toBe("not-a-project");
    expect(refusal?.message).toBe("This doesn't look like a linkpage file.");
    expect(refusal?.detail).toContain("<!doctype html>");
  });

  it("tells a file that was never JSON from a project file broken by hand-editing", () => {
    // What tells them apart is the first character that is not whitespace. A project file's top
    // level is always an object, so one that opens with `{` and still fails to parse is damaged
    // — a trailing comma, a missing quote. Anything else was never a project file at all.
    for (const text of ["", "  \n", "hello", "<svg/>", "\u0089PNG", "[1, 2,", '"unterminated']) {
      expect(refusalFor(text)?.reason, JSON.stringify(text)).toBe("not-a-project");
    }
    for (const text of ["{ this is not json", '{"version": 1,}', ' \n {"links":[}', "{"]) {
      expect(refusalFor(text)?.reason, JSON.stringify(text)).toBe("damaged");
    }
  });

  it("refuses JSON whose top level is not an object", () => {
    for (const text of ["[]", "42", '"a string"', "null", "true"]) {
      expect(refusalFor(text)?.reason, text).toBe("not-a-project");
    }
    expect(refusalFor("[]")?.message).toBe("This doesn't look like a linkpage file.");
  });

  it("refuses a version beyond us, and links to the builder that can read it", () => {
    const refusal = refusalFor(JSON.stringify({ version: SCHEMA_VERSION + 1 }));
    expect(refusal?.reason).toBe("too-new");
    expect(refusal?.message).toBe(REFUSAL_MESSAGES["too-new"]);
    expect(refusal?.url).toBe(BUILDER_URL);
  });

  it("says nothing technical in the message, and everything technical in the detail", () => {
    // §4.6: neither message names a JSON path; the detail sits behind a disclosure.
    for (const text of ["{ nope", "[]", "<!doctype html>", "", '{"version":9}']) {
      const refusal = refusalFor(text);
      expect(refusal?.detail, text).not.toBe("");
      expect(Object.values(REFUSAL_MESSAGES), text).toContain(refusal?.message);
    }
    expect(refusalFor('{"version":9}')?.detail).toContain("9");
  });

  it("refuses nothing else — a file missing every required field still loads", () => {
    // §4.6: a file with no style.brand is exactly the territory the flow exists for.
    expect(readProjectFile("{}").ok).toBe(true);
    expect(readProjectFile('{"style":{},"header":{},"links":"not a list"}').ok).toBe(true);
    expect(readProjectFile('{"shape":"brutalist","hourz":{}}').ok).toBe(true);
  });
});

describe("reading the version", () => {
  it("reads a missing version as 1", () => {
    // The lenient assumption (§4.2): the only files plausibly omitting it are the oldest ones.
    expect(readVersion({})).toBe(1);
    expect(readProjectFile("{}").ok).toBe(true);
  });

  it("accepts the version we write and anything older", () => {
    expect(readProjectFile(JSON.stringify({ version: SCHEMA_VERSION })).ok).toBe(true);
    expect(readProjectFile(JSON.stringify({ version: 0 })).ok).toBe(true);
  });

  it("reads an explicit null as absent, since JSON's null is how you write no value", () => {
    // §4.2: null carries no version information, so there is nothing to lose by reading it as
    // the claim it is — none.
    expect(readVersion({ version: null })).toBe(1);
    expect(readProjectFile('{"version":null}').ok).toBe(true);
  });

  it("refuses a stringified version rather than letting a v2 file in through a type error", () => {
    // §4.2, and the whole of #46: absent and unreadable are different claims. Read `"2"` as
    // absent and it reads as 1 and loads — a v2 file walking past §4.3's forwards refusal on a
    // type error rather than a version check, straight into the partial-load-then-autosave data
    // loss §4.3 exists to make unreachable.
    const result = readProjectFile(
      JSON.stringify({ version: "2", lang: "en", header: { name: "Ada" } }),
    );
    expect(result.ok).toBe(false);
    expect(readVersion({ version: "2" })).toBeNull();

    const refusal = refusalFor('{"version":"2"}');
    expect(refusal?.reason).toBe("damaged");
    expect(refusal?.message).toBe(REFUSAL_MESSAGES.damaged);
    // The disclosure quotes it as JSON, so the hand-editor can see the quotes are the problem.
    expect(refusal?.detail).toContain('"2"');
  });

  it("refuses every other version we cannot read, with no new message", () => {
    // A claim we cannot read is a claim all the same: fractional, negative, or not a number.
    for (const text of [
      '{"version":1.5}',
      '{"version":-1}',
      '{"version":{"n":2}}',
      '{"version":[2]}',
      '{"version":true}',
      '{"version":"1"}',
    ]) {
      expect(refusalFor(text)?.reason, text).toBe("damaged");
      expect(Object.values(REFUSAL_MESSAGES), text).toContain(refusalFor(text)?.message);
    }
  });
});

/**
 * The one conversion so far (§2.3, §4.3; #364, built by #386): a `version: 1` file's free-text
 * address lines become the street box, and the file is renumbered to ours. Silent, permanent the
 * moment the file opens, and non-destructive: nothing the owner typed is lost, it is only in one
 * box rather than three lines, for them to sort.
 */
describe("an older file, upgraded on the way in", () => {
  const opened = (document: unknown): Record<string, unknown> => {
    const result = readProjectFile(JSON.stringify(document));
    if (!result.ok) throw new Error(result.refusal.detail);
    return result.document;
  };

  it("lands a version-1 file's address lines in the street box, joined as the row showed them", () => {
    const document = opened({
      version: 1,
      address: {
        lines: ["12 Bridge Street", " Hebden Bridge", "HX7 8AA"],
        directionsUrl: "https://maps.example",
      },
    });
    expect(document["address"]).toEqual({
      street: "12 Bridge Street, Hebden Bridge, HX7 8AA",
      directionsUrl: "https://maps.example",
    });
    expect(document["version"]).toBe(SCHEMA_VERSION);
  });

  it("treats a missing version as 1, and converts", () => {
    expect(opened({ address: { lines: ["12 Main St"] } })["address"]).toEqual({
      street: "12 Main St",
    });
  });

  it("drops the blank lines and the wrong-typed ones, and leaves no street when none survive", () => {
    expect(
      opened({ version: 1, address: { lines: ["", 7, "  "], directionsUrl: "x" } })["address"],
    ).toEqual({
      directionsUrl: "x",
    });
  });

  it("renumbers an older file whether or not it had an address, keeping the key where it was", () => {
    // §4.3, forwards: a file that now holds our shape must say so, or an older builder would read
    // its street box as no address rather than refuse the file.
    expect(Object.entries(opened({ lang: "en", version: 0, header: {} }))).toEqual([
      ["lang", "en"],
      ["version", SCHEMA_VERSION],
      ["header", {}],
    ]);
    // Absent stays absent here; `writeDraft` adds it at the end, as it always has.
    expect("version" in opened({ lang: "en" })).toBe(false);
  });

  it("leaves a lines that was never a list where it is — §4.5's permanent junk, not an address", () => {
    expect(opened({ version: 1, address: { lines: "12 Main St" } })["address"]).toEqual({
      lines: "12 Main St",
    });
  });

  it("returns a file already at our version exactly as it came", () => {
    const current = { version: SCHEMA_VERSION, address: { street: "12 Main St", lines: ["junk"] } };
    expect(upgradeDocument(current, SCHEMA_VERSION)).toBe(current);
    expect(opened(current)).toEqual(current);
  });
});

describe("serialising", () => {
  it("writes two-space JSON with a trailing newline", () => {
    expect(serializeProject({ version: 1, lang: "en" })).toBe(
      '{\n  "version": 1,\n  "lang": "en"\n}\n',
    );
  });

  it("writes keys in the order the document holds them", () => {
    // Key order is the document's, never ours: it is half of the byte-identical guarantee.
    const text = serializeProject({ lang: "en", version: 1 });
    expect(text.indexOf('"lang"')).toBeLessThan(text.indexOf('"version"'));
  });
});
