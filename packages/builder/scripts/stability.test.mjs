import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { compare, digest, verdict } from "./stability.mjs";

/**
 * What the appearance ritual's own steadiness check is required to notice.
 *
 * **This asserts nothing about what a picture looks like** — §7.4's terms are untouched, and the
 * ritual is still hand-run and still never wired to CI. What is under test is whether the check
 * can *see* the failure it exists for: three frames out of eighty-four coming back with different
 * bytes from the same commit (#242), which is indistinguishable by eye from the eighty-one that
 * did not. A check that cannot go red on that is worse than no check, because it reports "steady"
 * over exactly the state it was written to catch.
 */

/** The three frames #242 was filed for, as they were named in a real pair of runs. */
const UNSTABLE = [
  "desktop/03-one-line-about-what-you-do-arrive.png",
  "desktop/03-one-line-about-what-you-do-filled.png",
  "desktop/05-whats-your-colour-filled.png",
];

/** A stand-in for a full run: eighty-four frames, digested. */
const run = (differing = []) =>
  new Map(
    [
      ...UNSTABLE,
      ...Array.from({ length: 81 }, (_, n) => `desktop/${String(n).padStart(2, "0")}-frame.png`),
    ].map((name) => [name, differing.includes(name) ? "second-bytes" : "same-bytes"]),
  );

describe("comparing two runs of one commit", () => {
  it("goes red on the three frames #242 was filed for", () => {
    // The point of the check. Before the fix this is what a pair of runs on `274b8f7` produced,
    // and nothing in the run said so.
    const found = compare(run(), run(UNSTABLE));
    expect(found.moved).toEqual([...UNSTABLE].sort());
    expect(found.total).toBe(84);
    expect(verdict(found).join("\n")).toContain("3 of 84 files did NOT come back the same");
    for (const name of UNSTABLE) expect(verdict(found).join("\n")).toContain(name);
  });

  it("calls a repeatable run steady, and says how many files it is speaking for", () => {
    const found = compare(run(), run());
    expect(found).toMatchObject({ moved: [], missing: [], extra: [] });
    expect(verdict(found).join("\n")).toContain("all 84 files came back byte for byte the same");
  });

  it("separates a frame the walk missed from a frame that moved", () => {
    const first = new Map([
      ["a.png", "x"],
      ["gone.png", "x"],
    ]);
    const second = new Map([
      ["a.png", "y"],
      ["new.png", "x"],
    ]);
    const found = compare(first, second);
    expect(found).toMatchObject({ moved: ["a.png"], missing: ["gone.png"], extra: ["new.png"] });
    const said = verdict(found).join("\n");
    expect(said).toContain("gone.png — taken once, missed the second time");
    expect(said).toContain("new.png — missed once, taken the second time");
  });
});

describe("digesting a run's folder", () => {
  let dir;
  const write = async (name, body) => {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), body);
  };

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "stability-"));
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  it("reads every frame, at every depth, under one relative name", async () => {
    await write("desktop/50-arrive.png", "a");
    await write("mobile/pages/centred-classic-light.png", "b");
    expect([...(await digest(dir)).keys()]).toEqual([
      "desktop/50-arrive.png",
      "mobile/pages/centred-classic-light.png",
    ]);
  });

  it("notices one byte", async () => {
    await write("desktop/50-arrive.png", "a");
    const before = await digest(dir);
    await write("desktop/50-arrive.png", "b");
    expect(compare(before, await digest(dir)).moved).toEqual(["desktop/50-arrive.png"]);
  });

  it("leaves README.txt out, because it carries a timestamp and this verdict", async () => {
    // Without this the check reports itself: the ledger differs between two runs by
    // construction, so every run would come back "unsteady" for the one file that has to.
    await write("README.txt", "review-shots — main\n84 shots, 2026-08-25T00:00:00.000Z");
    await write("desktop/50-arrive.png", "a");
    expect([...(await digest(dir)).keys()]).toEqual(["desktop/50-arrive.png"]);
  });
});
