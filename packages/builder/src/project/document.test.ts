import { SCHEMA_VERSION } from "@linkpage/renderer";
import { describe, expect, it } from "vitest";
import {
  BUILDER_URL,
  readProjectFile,
  readVersion,
  REFUSAL_MESSAGES,
  serializeProject,
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
    for (const text of ["{ nope", "[]", '{"version":9}']) {
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

  it("treats a version that is not a number as absent, and so loads it", () => {
    // Everywhere else in the schema a wrong-typed value reads as absent (§4.4, §4.6) and
    // `version` gets no exemption: only a genuine number can be *beyond us*. A hand-typed
    // "2" therefore loads, which is the deliberate cost of not having a second rule here.
    expect(readVersion({ version: "2" })).toBe(1);
    expect(readProjectFile('{"version":"2"}').ok).toBe(true);
    expect(readProjectFile('{"version":null}').ok).toBe(true);
    expect(readProjectFile('{"version":{"n":2}}').ok).toBe(true);
  });

  it("refuses a fractional version above ours rather than rounding it away", () => {
    expect(readProjectFile('{"version":1.5}').ok).toBe(false);
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
