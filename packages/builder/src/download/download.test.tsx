// @vitest-environment jsdom

import { cleanup, fireEvent, render as mount, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POPULATED } from "../fixtures.js";
import { pageHtml } from "../page.js";
import { DownloadSheet, PROJECT_FILENAME_FALLBACK } from "./DownloadSheet.js";
import { LEAD_IN_LIST } from "./Hosting.js";
import { installDownloads, type FakeDownloads } from "./downloads.testing.js";
import type { Draft } from "../project/index.js";
import type { FileDownload } from "./save.js";
import { WEIGHT } from "../ui/Button.js";
import { filledLabels, widthClasses, widthDisagreements } from "../ui/fill.testing.js";

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

  /**
   * One filled button per screen (§4, §6; design change 3, finding B-19).
   *
   * The sheet rendered both downloads solid, so a screen whose whole design is *first this, then
   * that* said the two were equal and left the order to do the arguing alone. The page keeps the
   * fill because it is what the button was pressed for; the project file steps down to §4's
   * secondary — **its prose already does the persuading**, and the sentence it turns on is the
   * one thing on this sheet set in bold.
   *
   * Stepping down is not stepping back: section two is still second, still here rather than in a
   * menu, and still a labelled button sharing every measurement with the one above it.
   *
   * The ritual's `60-download-sheet` stops at the fold, so section two is below it and this
   * change is invisible in the standing set — the same blind spot the review list has. Its
   * before-and-after came out of a patched copy of the script, taken once and thrown away.
   * What it gives up is the fill, which there is only one of.
   */
  it("fills the page's download and steps the project file's down", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    expect(filledLabels()).toEqual(["Download index.html"]);

    const backup = within(section("project")).getByRole("button");
    expect(backup.className).toContain(WEIGHT.secondary);
    expect(backup).toHaveProperty("disabled", false);
  });

  /**
   * **The screen B-72 was written from** (#230). "Download index.html" fitting its words is the
   * half of the finding that was already right: a `<section>` is ordinary block flow, so a button
   * in it has always been as wide as its label. What was wrong was the same weight one screen
   * over, stretching the flow's column — so the fix is the flow coming to meet this sheet, and
   * this is what says the sheet did not move to meet the flow.
   */
  it("gives both downloads the width their weights name (B-72)", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    expect(widthDisagreements()).toEqual([]);
    const page = within(section("page")).getByRole("button");
    const backup = within(section("project")).getByRole("button");
    expect(widthClasses(page), "the fill fits its words").toEqual(["w-fit"]);
    expect(widthClasses(backup), "and so does the one below it").toEqual(widthClasses(page));
  });

  it("keeps the fill on the page even when there is no project file to offer", () => {
    open();
    // The unavailable state is section two's own (see the seam below); the fill does not wander
    // back just because the second button is disabled.
    expect(filledLabels()).toEqual(["Download index.html"]);
  });
});

describe("section one describes the shape, not the steps (§8)", () => {
  it("tells the owner to get current instructions elsewhere", () => {
    open();
    // Not a placeholder any more. Steps rot on a schedule nobody tells us about, so the copy
    // deliberately carries none and points at a source that stays current.
    expect(section("page").textContent).toContain("ask an AI assistant");
  });

  it("offers the one route that needs no verification", () => {
    open();
    // "Ask whoever looks after your website" is a first-class route, not an afterthought — it is
    // the only one needing no verification from us and no learning from them.
    expect(section("page").textContent).toContain("Ask whoever looks after your website");
  });

  it("carries the one idea that outlasts every host (§8)", () => {
    open();
    // A non-technical owner who understands *this* can recognise a workable answer when someone
    // offers them one, which is worth more than a procedure that expires.
    expect(section("page").textContent).toContain("hand it to anyone who asks for it");
  });

  it("gives an outcome check that does not depend on the steps being right (§8)", () => {
    open();
    const text = section("page").textContent ?? "";
    // This is what makes "ask an AI assistant" safe rather than a shrug: the owner cannot audit
    // confident, outdated instructions, so they are given a test independent of all of them.
    expect(text).toContain("someone else");
    expect(text).toMatch(/web address/i);
  });

  it("warns that a shared link previews as text (§6.4)", () => {
    open();
    // `og:image` is structurally impossible for a single-file tool. Owners are told rather than
    // surprised.
    expect(section("page").textContent).toContain("text with no picture");
  });

  it("says which device the drop route is easier on (§8)", () => {
    open();
    // The editing screen is mobile-first (§7.6), so this sheet is often reached on a phone. The
    // line is true whichever way the phone path works, which is why it needs no verification.
    expect(section("page").textContent).toMatch(/easier on a computer than a phone/i);
  });

  it("warns that a free host may forbid a business (§8)", () => {
    open();
    // The trap a business owner falls into and never finds out about until it matters.
    expect(section("page").textContent).toMatch(/free does not always mean allowed/i);
  });

  /**
   * §8's two lists are the same list twice, and the lead-in leads (B-46, #248).
   *
   * The audit read the source; [#201](https://github.com/mandyMooreFan/linkpage/issues/201) put a
   * browser on it and measured what had drifted — 12px of row gap against 8px, and lead-ins at
   * `#1f1b16` against `#6b6257`, the same grey as the sentences they introduce. Not a readability
   * failure (quiet ink on the ground is 5.60:1) but a lead-in that does not lead, on the two
   * sentences §8 says must be put outright.
   *
   * **Rendered as well as read** (#213). `controls.test.ts` can say the recipe is written once and
   * that no `<ul>` in `Hosting.tsx` was tuned by hand; only a mounted sheet can say the lists a
   * person is actually looking at came out of it. Both halves are needed, and neither is the
   * other: a recipe written once that reaches nothing passes the source rule perfectly.
   *
   * **Derived from `LEAD_IN_LIST`, never re-typed** — the day someone changes the recipe these
   * follow it rather than quietly holding a string nothing wears any more.
   */
  it("gives both of §8's lists the one recipe, so neither can drift again (B-46)", () => {
    open();

    // Named rather than counted: each list is identified by the sentence it opens with, so a read
    // that found no lists fails here instead of passing on an empty comparison.
    expect(
      [...section("page").querySelectorAll("ul")].map((list) => ({
        opens: list.querySelector("strong")?.textContent ?? "",
        className: list.className,
      })),
    ).toEqual([
      { opens: "Ask whoever looks after your website.", className: LEAD_IN_LIST },
      { opens: "Free does not always mean allowed.", className: LEAD_IN_LIST },
    ]);
  });

  it("leaves no bold sentence on the sheet quieter than the rest of them (B-46)", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    /** The ink a `<strong>` resolves to, read off the nearest ancestor that states one. */
    const inkOf = (bold: Element): string => {
      for (let node = bold.parentElement; node !== null; node = node.parentElement) {
        const classes = node.className.split(/\s+/);
        // The `<ul>` states both; the `[&_strong]` variant is the one that reaches a `<strong>`.
        if (classes.includes("[&_strong]:text-ink")) return "text-ink";
        if (classes.includes("text-ink-quiet")) return "text-ink-quiet";
        if (classes.includes("text-ink")) return "text-ink";
      }
      return "inherited";
    };

    const bold = [...document.querySelectorAll("strong")].map((node) => ({
      says: node.textContent ?? "",
      ink: inkOf(node),
    }));

    // The two §8 warnings by name — the ones that were grey, and the proof this found something.
    expect(bold.map(({ says }) => says)).toEqual(
      expect.arrayContaining([
        "Free does not always mean allowed.",
        "Your link will look plain when you share it.",
      ]),
    );
    // Every bold run in the builder outside these two lists already rendered at full ink: the
    // project name in §7.8's confirmation, the sheet's *if you lose it* sentence, and the outcome
    // check between the two lists. Bold-at-full-ink is the grammar; this is the whole of it.
    expect(bold.filter(({ ink }) => ink !== "text-ink")).toEqual([]);
  });

  it("names no host and numbers no steps", () => {
    open();
    const text = section("page").textContent ?? "";

    // Not a placeholder guard any more — a permanent rule (§8). Naming a host is a recommendation
    // with a shelf life, and steps rot on a schedule no one tells us about. Copy with no steps in
    // it cannot go stale, which is the property this test protects.
    for (const host of [
      "Netlify",
      "Vercel",
      "GitHub",
      "Cloudflare",
      "Neocities",
      "Surge",
      "S3",
      "AWS",
    ]) {
      expect(text).not.toContain(host);
    }
    // A numbered list is what an expiring walkthrough looks like on arrival.
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

    const scrim = document.querySelector("[data-scrim]");
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

describe("it is a modal, and the keyboard is held to it (#90)", () => {
  const panel = (): HTMLElement => {
    const found = screen.getByRole("dialog");
    if (!(found instanceof HTMLElement)) throw new Error("no dialog");
    return found;
  };

  const tab = (shiftKey = false): void => {
    // jsdom does not move focus on Tab, which is exactly why these assertions are about the
    // sheet's own handler: every case below is one where it must take the key and place focus
    // itself, and a case it declines is a case the browser would have got right anyway.
    fireEvent.keyDown(document.activeElement ?? document, { key: "Tab", shiftKey });
  };

  it("is a dialog that says what it is", () => {
    open();
    // Already true before #90 and asserted here so it stays true: the bug was never the
    // semantics, it was that the Tab key did not honour them.
    expect(panel().getAttribute("aria-modal")).toBe("true");
    expect(screen.getByRole("dialog", { name: "Download" })).toBe(panel());
  });

  it("takes the keyboard when it opens", () => {
    open();
    // The sheet covers the list; a keyboard left behind it would be typing into a screen the
    // owner cannot see.
    expect(document.activeElement).toBe(panel());
  });

  it("wraps forward off the last control instead of leaving for the list", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    const stops = screen.getAllByRole("button");
    const last = stops[stops.length - 1]!;
    last.focus();
    tab();

    // The bug: the fourth Tab used to land on the review list behind the sheet — a screen the
    // owner cannot see, reached from a dialog that claims the background is inert.
    expect(document.activeElement).toBe(stops[0]);
  });

  it("wraps backward off the panel, which is before the first control", () => {
    open({ projectDownload: { filename: "adas-bakery.linkpage.json", save: () => {} } });

    // Focus starts on the panel itself, which is `tabIndex={-1}`: never a stop, so shift-tabbing
    // from it means going round to the end rather than out of the front.
    expect(document.activeElement).toBe(panel());
    tab(true);

    const stops = screen.getAllByRole("button");
    expect(document.activeElement).toBe(stops[stops.length - 1]);
  });

  it("pulls focus back if it is adrift outside the sheet", () => {
    open();
    // Whatever put focus outside — a stray programmatic call, a re-render behind the sheet —
    // the next Tab belongs to the dialog rather than to the page under it.
    document.body.focus();
    tab();
    expect(panel().contains(document.activeElement)).toBe(true);
  });

  it("skips a Save button that has nothing to save", () => {
    open(); // no `projectDownload`, so section two's button is disabled

    const disabled = screen.getAllByRole("button").filter((b) => (b as HTMLButtonElement).disabled);
    expect(disabled).toHaveLength(1);

    const stops = screen.getAllByRole("button").filter((b) => !(b as HTMLButtonElement).disabled);
    stops[stops.length - 1]!.focus();
    tab();

    // A disabled control is not a tab stop, so the wrap has to be computed from the ones that are
    // — otherwise the trap parks focus on something that cannot be pressed.
    expect(document.activeElement).toBe(stops[0]);
    expect(disabled[0]).not.toBe(document.activeElement);
  });

  it("gives focus back to whoever opened it", () => {
    const opener = document.createElement("button");
    opener.textContent = "Download";
    document.body.append(opener);
    opener.focus();

    const view = mount(<DownloadSheet draft={POPULATED} onClose={() => {}} />);
    expect(document.activeElement).not.toBe(opener);

    view.unmount();

    // Closing used to drop the keyboard on `<body>`, so an owner who pressed Close was returned
    // to the top of the document and had to tab all the way back to where they were.
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });

  it("does not chase a node that left while the sheet was open", () => {
    const opener = document.createElement("button");
    document.body.append(opener);
    opener.focus();

    const view = mount(<DownloadSheet draft={POPULATED} onClose={() => {}} />);
    opener.remove(); // the list behind re-rendered

    // Focusing a detached node silently sends focus to `<body>` — the very thing this restore
    // exists to prevent — so it must not be attempted.
    expect(() => view.unmount()).not.toThrow();
  });
});

/**
 * §7.7's conditional line: the last moment before publishing mentions what will not work.
 *
 * The whole design of it is negative — where it sits, how many there can be, and above all that
 * **when nothing is wrong the sheet is byte for byte the calm screen §7.7 designed.**
 */
describe("when something the owner typed cannot be used (§7.7, §7.9)", () => {
  const withDraft = (draft: Draft): void => {
    mount(<DownloadSheet draft={draft} onClose={() => {}} />);
  };

  const warnings = (): string[] =>
    [...document.querySelectorAll("[data-warnings] p")].map((node) => node.textContent ?? "");

  it("says nothing at all when nothing is wrong", () => {
    open();
    expect(document.querySelector("[data-warnings]")).toBeNull();
  });

  it("leaves the calm sheet byte for byte unchanged", () => {
    // The constraint §7.7 puts on having this here at all, held as a comparison rather than as an
    // inspection: a sheet with nothing wrong must be indistinguishable from the sheet before this
    // feature existed.
    open();
    const calm = (document.querySelector('[data-section="page"]') as HTMLElement).innerHTML;
    cleanup();

    withDraft({ ...POPULATED, links: [{ label: "Order online", url: "/menu" }] } as Draft);
    const section = document.querySelector('[data-section="page"]') as HTMLElement;
    expect(section.innerHTML).toContain("Order online won't work");

    // Lift the added block out and the rest is character for character what it was.
    section.querySelector("[data-warnings]")?.remove();
    expect(section.innerHTML).toBe(calm);
  });

  it("sits in the first section, under its sentence and above the guidance", () => {
    withDraft({ ...POPULATED, links: [{ label: "Order online", url: "/menu" }] } as Draft);
    const page = document.querySelector('[data-section="page"]') as HTMLElement;
    const html = page.innerHTML;
    expect(html.indexOf("This is your web page")).toBeLessThan(html.indexOf("data-warnings"));
    // §8's guidance follows it: you need the file, and the warning, before any of it applies.
    expect(html.indexOf("data-warnings")).toBeLessThan(html.indexOf("data-hosting"));
  });

  it("names its own field, because away from its row the sentence has no referent", () => {
    withDraft({ ...POPULATED, links: [{ label: "Order online", url: "/menu" }] } as Draft);
    expect(warnings()).toEqual(["Order online won't work — paste the address from your browser."]);
  });

  it("gives the phone its own line", () => {
    withDraft({ ...POPULATED, contact: { phone: "0800 CHICKEN" } } as Draft);
    expect(warnings()).toEqual([
      "Your phone number won't dial — add the number in digits if you want it tappable.",
    ]);
  });

  it("stops at two, which is the ceiling and not a cap", () => {
    // §7.9 gives the phone its own sentence and puts all three URL fields under one, so a third
    // distinct warning is not reachable — this is arithmetic rather than truncation.
    withDraft({
      ...POPULATED,
      links: [{ label: "Order online", url: "/menu" }],
      social: [{ platform: "instagram", url: "@ada" }],
      address: { lines: ["12 Bridge Street"], directionsUrl: "@here" },
      contact: { phone: "0800 CHICKEN", email: "hello@nodot" },
    } as Draft);
    expect(warnings()).toHaveLength(2);
  });

  it("never counts, never leads in, and never names our diagnosis", () => {
    withDraft({
      ...POPULATED,
      links: [{ label: "Order online", url: "/menu" }],
      contact: { phone: "0800 CHICKEN" },
    } as Draft);
    const text = document.querySelector("[data-warnings]")?.textContent?.toLowerCase() ?? "";
    for (const banned of ["invalid", "format", "valid", "2 problem", "problems", "error"]) {
      expect(text).not.toContain(banned);
    }
  });

  it("falls back through the URL fields rather than staying silent", () => {
    withDraft({
      ...POPULATED,
      links: [],
      address: { lines: ["12 Bridge Street"], directionsUrl: "@here" },
    } as Draft);
    expect(warnings()).toEqual([
      "Your directions link won't work — paste the address from your browser.",
    ]);
  });
});
