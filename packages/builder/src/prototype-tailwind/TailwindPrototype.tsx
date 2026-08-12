/**
 * PROTOTYPE — throwaway. Wayfinder ticket #84: what does the builder look like in Tailwind?
 *
 * Three design directions, each drawn twice — a flow question and the review list — switchable
 * with `?prototype=tailwind&variant=paper|card|editorial`. Two screens rather than one because a
 * design system is only judged where it repeats: the question shell and the list rows share a
 * vocabulary, and a direction that flatters one and fails the other has not been seen yet.
 *
 * The bar carries the two axes this ticket has to decide alongside the look:
 *
 * - **dark** — the builder has none today, while §3.1 gives the *page* light and dark. Tailwind
 *   makes it cheap enough to do accidentally, so it is switchable here to be decided on purpose.
 * - **width** — §7.6's one breakpoint, `--breakpoint-wide: 60rem`, where the preview drawer stops
 *   sitting over the question and starts sitting beside it. The button reports it; resize to
 *   cross it.
 *
 * All content is what this map has already decided (see `data.ts`), so the redesign is judged
 * against the product it is going to be rather than the one the walk found.
 *
 * Throw all of this away once a direction wins.
 */

import { useCallback, useEffect, useState, type JSX } from "react";
import { CardList, CardQuestion, NAME as NAME_CARD } from "./VariantCard.js";
import { EditorialList, EditorialQuestion, NAME as NAME_EDITORIAL } from "./VariantEditorial.js";
import { PaperList, PaperQuestion, NAME as NAME_PAPER } from "./VariantPaper.js";
import "./theme.css";

const VARIANTS = [
  { key: "paper", name: NAME_PAPER, Question: PaperQuestion, List: PaperList },
  { key: "card", name: NAME_CARD, Question: CardQuestion, List: CardList },
  { key: "editorial", name: NAME_EDITORIAL, Question: EditorialQuestion, List: EditorialList },
] as const;

type Key = (typeof VARIANTS)[number]["key"];
type Screen = "question" | "list";

function read<T extends string>(param: string, allowed: readonly T[], fallback: T): T {
  const raw = new URLSearchParams(window.location.search).get(param);
  return allowed.includes(raw as T) ? (raw as T) : fallback;
}

export function TailwindPrototype(): JSX.Element {
  const [variant, setVariant] = useState<Key>(() =>
    read(
      "variant",
      VARIANTS.map((entry) => entry.key),
      "paper",
    ),
  );
  const [screen, setScreen] = useState<Screen>(() =>
    read("screen", ["question", "list"], "question"),
  );
  const [dark, setDark] = useState(false);
  const [wide, setWide] = useState(() => window.innerWidth >= 960);

  useEffect(() => {
    const onResize = (): void => setWide(window.innerWidth >= 960);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const go = useCallback((next: Partial<{ variant: Key; screen: Screen }>) => {
    const url = new URL(window.location.href);
    if (next.variant) url.searchParams.set("variant", next.variant);
    if (next.screen) url.searchParams.set("screen", next.screen);
    window.history.replaceState(null, "", url);
    if (next.variant) setVariant(next.variant);
    if (next.screen) setScreen(next.screen);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const active = document.activeElement as HTMLElement | null;
      if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
      const at = VARIANTS.findIndex((entry) => entry.key === variant);
      const step = event.key === "ArrowRight" ? 1 : VARIANTS.length - 1;
      go({ variant: VARIANTS[(at + step) % VARIANTS.length]!.key });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, go]);

  const current = VARIANTS.find((entry) => entry.key === variant) ?? VARIANTS[0];
  const Screen = screen === "question" ? current.Question : current.List;

  return (
    <div className={dark ? "dark" : undefined}>
      <Screen />

      <div className="fixed bottom-3 left-1/2 z-100 flex -translate-x-1/2 flex-col gap-1.5 rounded-xl border border-[#333842] bg-[#0b0d12] p-2 font-sans text-xs text-white shadow-lg">
        <div className="flex items-center gap-1.5">
          {VARIANTS.map((entry) => (
            <button
              key={entry.key}
              type="button"
              aria-pressed={entry.key === variant}
              onClick={() => go({ variant: entry.key })}
              className={`rounded-md px-2 py-1 ${
                entry.key === variant ? "bg-white font-bold text-[#0b0d12]" : "bg-[#171b24]"
              }`}
            >
              {entry.key}
            </button>
          ))}
          <span className="pl-1 text-[#b9c0cc]">{current.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {(["question", "list"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={screen === id}
              onClick={() => go({ screen: id })}
              className={`rounded-md px-2 py-1 ${
                screen === id ? "bg-white font-bold text-[#0b0d12]" : "bg-[#171b24]"
              }`}
            >
              {id}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setDark(!dark)}
            className="rounded-md bg-[#171b24] px-2 py-1"
          >
            {dark ? "dark" : "light"}
          </button>
          <span className="pl-1 text-[#b9c0cc]">
            {wide ? "wide — preview beside" : "narrow — preview one tap away"}
          </span>
        </div>
      </div>
    </div>
  );
}
