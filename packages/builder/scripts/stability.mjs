/**
 * Is the instrument steady? Two runs of one commit, compared byte for byte.
 *
 * **This is about the camera, not about the design.** Nothing here looks at a picture, and
 * nothing here can fail a build — the same line `port.mjs` draws. What it answers is the one
 * question a reviewer's whole method rests on since
 * [#208](https://github.com/mandyMooreFan/linkpage/issues/208): *when two runs come back
 * identical, does that mean the change did nothing?* Four tickets have reasoned straight from
 * that (#190, #194, #213, and #234's "78 of 84 frames did not move"), so a frame that differs
 * when nothing changed is not a curiosity — it is a frame whose sameness proves nothing and
 * whose difference proves nothing, in a folder that looks exactly like the other eighty-one.
 *
 * The comparison lives here rather than inline in the walk so it can be asserted without a
 * browser, a server or a screenshot, which is what makes it possible to check that it goes red
 * on the failure it was written for.
 */

import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * `README.txt` is the run's own ledger, not a frame.
 *
 * It carries a timestamp and, with `--twice`, this very verdict, so it differs between two runs
 * by construction. Comparing it would make the check report itself as the instability.
 */
const NOT_A_FRAME = new Set(["README.txt"]);

/**
 * Every file under `dir`, keyed by its path relative to `dir`, digested.
 *
 * Paths use `/` whatever the platform, because they are printed and read by a person.
 */
export async function digest(dir) {
  const found = new Map();

  async function walk(at, prefix) {
    const entries = await readdir(at, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const name = prefix === "" ? entry.name : `${prefix}/${entry.name}`;
      if (entry.isDirectory()) await walk(join(at, entry.name), name);
      else if (!NOT_A_FRAME.has(name)) {
        found.set(
          name,
          createHash("sha256")
            .update(await readFile(join(at, entry.name)))
            .digest("hex"),
        );
      }
    }
  }

  await walk(dir, "");
  return found;
}

/**
 * What the second run did to the first.
 *
 * `moved` is the answer to the question: those files came out different bytes from the same
 * commit, the same walk and the same browser, so nothing they show can be read as a change.
 * `missing` and `extra` are the other way a run can be unrepeatable — a file the walk produced
 * once and not the other time — and they are worth naming separately because they mean the walk
 * itself is unsteady rather than the raster.
 */
export function compare(first, second) {
  const moved = [];
  const missing = [];
  for (const [name, bytes] of first) {
    if (!second.has(name)) missing.push(name);
    else if (second.get(name) !== bytes) moved.push(name);
  }
  const extra = [...second.keys()].filter((name) => !first.has(name));
  const sort = (names) => names.sort((a, b) => (a < b ? -1 : 1));
  return { moved: sort(moved), missing: sort(missing), extra: sort(extra), total: first.size };
}

/**
 * The verdict, in the words the run prints and writes into `README.txt`.
 *
 * **A steady instrument says so out loud**, because that is the sentence the reviewer is relying
 * on when they read a folder of identical files — and an unsteady one has to name the files,
 * since three unstable frames among eighty-four look exactly like the other eighty-one.
 *
 * It counts *files*, not shots: a run writes the exported page's bytes to `pages/*.html` beside
 * the pictures, and those are compared too — they are read as a before and after in exactly the
 * same way.
 */
export function verdict({ moved, missing, extra, total }) {
  const unsteady = [...moved, ...missing, ...extra];
  if (unsteady.length === 0) {
    return [
      `The camera is steady: all ${total} files came back byte for byte the same on a second`,
      "run of this commit. So a file that differs between two runs is a change, and a file",
      "that does not is not.",
    ];
  }
  return [
    `${unsteady.length} of ${total} files did NOT come back the same on a second run of this`,
    "commit. Nothing these say can be read as a change, and their sameness proves nothing:",
    ...moved.map((name) => `  · ${name} — different bytes`),
    ...missing.map((name) => `  · ${name} — taken once, missed the second time`),
    ...extra.map((name) => `  · ${name} — missed once, taken the second time`),
  ];
}
