/**
 * **The spec's countable claims, against the thing they count.** `SPEC.md` §5.3, issue #341,
 * settled on [#312](../../issues/312).
 *
 * `SPEC.md` asserted something the code had stopped doing **five times** on map
 * [#273](../../issues/273) alone, and §12's own recorded lesson from building v1 is the mirror
 * image: *six errors found by implementing it*, the recurring shape being **a document asserting
 * something the code has never done**.
 *
 * **What this file is not.** It does not compare prose. No test can, and #312 measured what
 * actually catches a drifted sentence: **someone building against it** — four of the five were
 * found long after the fact by a person grepping while making the claim false, and the fifth by
 * the ticket downstream of the one that wrote it. **None of that is constructible.**
 *
 * **What is constructible is narrower, and it is all that is here: every one of those drifts was
 * a count or a number restated in N places.** Eight words in eighteen sites. One end-to-end in
 * eight. So this file checks four numbers against what they count, and nothing else.
 *
 * ⚠️ **Measured before it was written** (#312): three of the four were *already true* — the
 * document is honest everywhere a machine can look. The fourth, §12's effort list, was **six
 * efforts behind, and this very map made it worse while running**, amending the document three
 * times and recording none of them. **That is the one a person was never going to remember, and
 * the reason this file exists.**
 */

import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VOCABULARIES } from "@linkpage/renderer";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "../../..");
const SPEC = readFileSync(resolve(ROOT, "SPEC.md"), "utf8");

/**
 * **Every parse below is guarded against finding nothing**, because every one of them is a
 * regular expression over a Markdown document that somebody will reformat one day.
 * `census.mjs` puts the rule in a line: *a check over nothing reports "nothing wrong" forever* —
 * and a table parse that silently returns `[]` is the purest form of it.
 */
function found<T>(what: string, values: T[]): T[] {
  if (values.length === 0) {
    throw new Error(
      `nothing matched when looking for ${what} in SPEC.md — the document was reformatted, ` +
        `or this parse is wrong. Either way it has not agreed with anything.`,
    );
  }
  return values;
}

const NUMBER: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  ten: 10,
};

describe("SPEC.md's countable claims, against what they count (#341)", () => {
  it("names as many end-to-ends as there are", () => {
    const claimed = found(
      "the end-to-end count",
      [...SPEC.matchAll(/\*\*(\w+) Playwright end-to-ends\*\*/g)].map((m) => NUMBER[m[1]!]),
    );
    const actual = readdirSync(resolve(ROOT, "packages/builder/e2e")).filter((f) =>
      f.endsWith(".e2e.ts"),
    );

    expect(actual.length, "there are e2e files to count").toBeGreaterThan(0);
    for (const n of claimed) expect(n, "§5.3's stated end-to-end count").toBe(actual.length);
  });

  it("names as many invariant guards as its own table lists", () => {
    const claimed = found(
      "the invariant count",
      [...SPEC.matchAll(/\*\*(\w+) invariant guards\*\*/g)].map((m) => NUMBER[m[1]!]),
    );
    // The rows of §5.3's own table: `| 1   | The export contains …`
    const rows = found(
      "the invariant table's rows",
      [...SPEC.matchAll(/^\| (\d+) {2,}\| /gm)].map((m) => Number(m[1])),
    );

    for (const n of claimed) expect(n, "§5.3's stated invariant count").toBe(rows.length);
    expect(rows, "and they are numbered from one, in order").toEqual(
      rows.map((_, index) => index + 1),
    );
  });

  it("names as many words as a vocabulary holds", () => {
    const claimed = found(
      "the word cap",
      [...SPEC.matchAll(/\b(eight|nine|ten|eleven) words\b/g)].map((m) => NUMBER[m[1]!] ?? -1),
    );
    // Counted, not asserted: seven day names plus every other string a vocabulary carries.
    const en = VOCABULARIES.en!;
    const strings = Object.values(en).flatMap((v) => (Array.isArray(v) ? v : [v]));

    expect(strings.length, "a vocabulary has words to count").toBeGreaterThan(0);
    for (const n of claimed) expect(n, "§2.5's stated word cap").toBe(strings.length);
  });

  it("attributes every effort that touched it", async () => {
    const efforts = JSON.parse(
      readFileSync(resolve(ROOT, "docs/wayfinder-efforts.json"), "utf8"),
    ) as { efforts: { issue: number }[] };

    const provenance = SPEC.slice(SPEC.indexOf("## 12. Provenance"));
    expect(provenance, "§12 is where the attributions live").toContain("Provenance");

    const linked = new Set(
      found(
        "issue links in §12",
        [...provenance.matchAll(/\.\.\/\.\.\/issues\/(\d+)/g)].map((m) => Number(m[1])),
      ),
    );
    const recorded = efforts.efforts.map((e) => e.issue);
    expect(recorded.length, "the effort list is not empty").toBeGreaterThan(0);

    const unattributed = recorded.filter((issue) => !linked.has(issue));
    expect(
      unattributed,
      "efforts in docs/wayfinder-efforts.json that §12 does not name — §12's own job is " +
        "attributing every decision in this document",
    ).toEqual([]);
  });
});
