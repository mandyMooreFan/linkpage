// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POPULATED } from "../fixtures.js";
import { pageHtml } from "../page.js";
import { DownloadSheet, PROJECT_FILENAME_FALLBACK } from "./DownloadSheet.js";
import { installDownloads, type FakeDownloads } from "./downloads.testing.js";
import type { FileDownload } from "./save.js";

/**
 * The Download sheet. `SPEC.md` §7.7, §8, §6.1.
 *
 * Three things are worth a DOM here and they are not the same thing.
 *
 * 1. **The file that comes out is the page.** Not a re-render of it, not an approximation of it
 *    — the same string the preview drawer is showing, read back out of the blob the browser was
 *    handed. That is §5.2 arriving on disk, which is the only place it finally matters.
 * 2. **The order and the copy**, because §7.7 is a copy decision and this is where it either
 *    holds or quietly rots. Page first; the consequence sentence present whether or not the
 *    project file's button works yet.
 * 3. **The absence of an invented walkthrough** (§8). Asserted as an absence, since a fabricated
 *    step is exactly the thing that would arrive without anyone deciding to add it.
 */

let downloads: FakeDownloads;

beforeEach(() => {
  downloads = installDownloads();
});

afterEach(() => {
  cleanup();
  downloads.restore();
});

const open = (props: Partial<{ onClose: () => void; projectDownload: FileDownload }> = {}) => {
  mount(
    <DownloadSheet
      draft={POPULATED}
      onClose={props.onClose ?? (() => {})}
      {...(props.projectDownload === undefined ? {} : { projectDownload: props.projectDownload })}
    />,
  );
};

const section = (which: "page" | "project"): HTMLElement => {
  const found = document.querySelector(`[data-section="${which}"]`);
  if (!(found instanceof HTMLElement)) throw new Error(`no ${which} section`);
  return found;
};

const headings = (): string[] =>
  screen.getAllByRole("heading", { level: 3 }).map((node) => node.textContent ?? "");

describe("the file that comes out is the page (§5.2, §6.1)", () => {
  it("writes the renderer's output, byte for byte", async () => {
    open();

    fireEvent.click(within(section("page")).getByRole("button"));

    expect(downloads.written).toHaveLength(1);
    const [file] = downloads.written;
    expect(await file?.blob?.text()).toBe(pageHtml(POPULATED));
  });

  it("writes it under the one filename hosts serve at a directory root", () => {
    open();
    fireEvent.click(within(section("page")).getByRole("button"));

    // Fixed and load-bearing (§6.1): at least one drop-style host skips its rename prompt for
    // this name specifically.
    expect(downloads.written[0]?.filename).toBe("index.html");
  });

  it("says it is HTML, so the browser and the owner's machine agree what it is", () => {
    open();
    fireEvent.click(within(section("page")).getByRole("button"));
    expect(downloads.written[0]?.blob?.type).toBe("text/html;charset=utf-8");
  });

  it("builds the page on the press, so the file is the project as it stands", async () => {
    // The fixture's `&`, `<` and `"` are here to notice a string being escaped or re-encoded on
    // the way to disk; the assertion is against `pageHtml` rather than against a literal for
    // the same reason the preview asserts against it.
    open();
    fireEvent.click(within(section("page")).getByRole("button"));

    const text = (await downloads.written[0]?.blob?.text()) ?? "";
    expect(text.startsWith("<!doctype html>")).toBe(true);
    expect(text).toContain("Ada &amp; Sons &lt;Bakers&gt;");
  });
});

describe("two sections, in the order they happen (§7.7)", () => {
  it("puts the page first and the project file second", () => {
    open();

    // Page first because that is what they pressed the button for. Leading with the backup
    // answers a question nobody asked.
    expect(headings()).toEqual(["Put your page online", "Keep a copy of your work"]);
  });

  it("names each file in the sentence that introduces it", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    expect(section("page").textContent).toContain(
      "This is your web page — index.html. Put it online and anyone can visit it.",
    );
    expect(section("project").textContent).toContain(
      "This is your saved work — adas-bakery.linkpage.json. It’s how you make changes later.",
    );
  });

  it("carries the consequence sentence, which is what the section is for", () => {
    open();

    // The risk being designed against is not two confusing downloads — it is that the owner
    // never downloads the project file at all, and localStorage is not durable.
    expect(section("project").textContent).toContain(
      "Keep it somewhere safe: if you lose it, you’d have to build your page again from scratch.",
    );
  });

  it("keeps the project file on this sheet rather than in a menu", () => {
    open();
    // Both sections are one surface: the sentence above is what does the work, and it has no
    // room to exist beside a second button on the list.
    expect(document.querySelectorAll("[data-section]")).toHaveLength(2);
  });
});

describe("section one holds a placeholder, not a walkthrough (§8)", () => {
  it("says out loud that the steps are not written yet", () => {
    open();
    expect(section("page").textContent).toContain("We have not written the step-by-step yet");
  });

  it("offers the one route that needs no verification", () => {
    open();
    // "Send it to your web person" is a first-class route, not an afterthought.
    expect(section("page").textContent).toContain("Send it to whoever looks after your website");
  });

  it("warns that a shared link previews as text (§6.3)", () => {
    open();
    // `og:image` is structurally impossible for a single-file tool. Owners are told rather than
    // surprised.
    expect(section("page").textContent).toContain("you will get the address as text");
  });

  it("names no host and numbers no steps", () => {
    open();
    const text = section("page").textContent ?? "";

    // Naming a host is the recommendation §8 withholds: the single-file drop is undocumented
    // behaviour read out of shipped uploader code, and the two obvious alternatives are
    // disqualified on licence terms rather than capability.
    for (const host of ["Netlify", "Vercel", "GitHub", "Cloudflare", "Neocities", "Surge"]) {
      expect(text).not.toContain(host);
    }
    // A numbered list is what a fabricated walkthrough looks like on arrival.
    expect(section("page").querySelector("ol")).toBeNull();
    expect(text).not.toMatch(/\bStep 1\b/);
  });
});

describe("the seam #36 fills", () => {
  it("offers the project file once it has one, and writes what it is given", () => {
    const save = vi.fn();
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save } });

    const button = within(section("project")).getByRole("button");
    expect(button.textContent).toBe("Download adas-bakery.linkpage.json");
    fireEvent.click(button);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("still reads in full without one, with the button unavailable rather than inert", () => {
    open();

    const button = within(section("project")).getByRole("button");
    expect((button as HTMLButtonElement).disabled).toBe(true);
    // §7.7's own fallback name, which is the one filename this issue can state without owning
    // the slug rule that produces the other.
    expect(button.textContent).toBe(`Download ${PROJECT_FILENAME_FALLBACK}`);
    expect(section("project").textContent).toContain("build your page again from scratch");
    expect(downloads.written).toEqual([]);
  });

  it("does not touch the page's own section", () => {
    open();
    expect((within(section("page")).getByRole("button") as HTMLButtonElement).disabled).toBe(false);
  });
});

describe("leaving the sheet", () => {
  it("is a dialog the keyboard lands in", () => {
    open();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(document.activeElement).toBe(dialog);
  });

  it("closes on Escape, the same key the preview drawer answers to", () => {
    const onClose = vi.fn();
    open({ onClose });

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on the Close button", () => {
    const onClose = vi.fn();
    open({ onClose });

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on a tap beside it", () => {
    const onClose = vi.fn();
    open({ onClose });

    const scrim = document.querySelector(".sheet__scrim");
    if (!(scrim instanceof HTMLElement)) throw new Error("no scrim");
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("nothing here tracks downloads (§7.7)", () => {
  it("looks the same after a download as before one", () => {
    open();
    const before = section("page").textContent;

    fireEvent.click(within(section("page")).getByRole("button"));

    // No "downloaded", no "changed since", no badge to go stale the moment the owner edits
    // again. Download is a button you press when you want a file.
    expect(section("page").textContent).toBe(before);
    expect(document.body.textContent).not.toMatch(/downloaded/i);
  });
});
