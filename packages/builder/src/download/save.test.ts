// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installDownloads, type FakeDownloads } from "./downloads.testing.js";
import { HTML_TYPE, saveTextFile } from "./save.js";

/**
 * The one route to disk, held at the level a test can actually see it.
 *
 * jsdom writes nothing anywhere, so what is asserted is the handover: **the exact bytes go into
 * a blob, the blob goes onto an anchor, and the anchor carries the filename the owner will see
 * in their folder.** That is the whole of what a browser needs from this function, and every
 * part of it is something that has silently broken in real code — an anchor detached from the
 * document that Firefox ignores, a filename that was only ever a `title`, a URL revoked before
 * the download had started.
 */

let downloads: FakeDownloads;

beforeEach(() => {
  vi.useFakeTimers();
  downloads = installDownloads();
});

afterEach(() => {
  downloads.restore();
  vi.useRealTimers();
});

describe("saving a file", () => {
  it("hands the browser the exact text, under the exact name", async () => {
    saveTextFile("index.html", "<!doctype html><p>Ada &amp; Sons</p>", HTML_TYPE);

    expect(downloads.written).toHaveLength(1);
    const [file] = downloads.written;
    expect(file?.filename).toBe("index.html");
    expect(file?.attached).toBe(true);

    // Read the bytes back out of the blob the browser was given: not the argument, the artifact.
    expect(await file?.blob?.text()).toBe("<!doctype html><p>Ada &amp; Sons</p>");
    expect(file?.blob?.type).toBe(HTML_TYPE);
  });

  it("says what kind of file it is", () => {
    saveTextFile("linkpage.json", "{}", "application/json");
    expect(downloads.written[0]?.blob?.type).toBe("application/json");
  });

  it("leaves nothing behind in the document", () => {
    saveTextFile("index.html", "<!doctype html>", HTML_TYPE);
    expect(document.querySelectorAll("a")).toHaveLength(0);
  });

  it("does not revoke the URL until the click has been dealt with", () => {
    saveTextFile("index.html", "<!doctype html>", HTML_TYPE);

    // Several browsers read the object URL after `click()` returns; revoking underneath them
    // cancels the download, and it does so on exactly the large files this tool produces.
    expect(downloads.revoked).toEqual([]);
    vi.runAllTimers();
    expect(downloads.revoked).toEqual([downloads.written[0]?.url]);
  });

  it("gives each press its own URL", () => {
    saveTextFile("index.html", "one", HTML_TYPE);
    saveTextFile("index.html", "two", HTML_TYPE);

    const [first, second] = downloads.written;
    expect(first?.url).not.toBe(second?.url);
  });
});
