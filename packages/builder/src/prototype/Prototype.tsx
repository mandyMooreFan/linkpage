/**
 * PROTOTYPE — throwaway. Issue #5, the builder editing screen.
 *
 * Four variants of the editing screen on one route, switchable with `?variant=A|B|C|D` and the
 * floating bar at the bottom left. The bar also swaps the underlying project between a finished
 * page and a brand-new empty one, because the empty state is one of the things #5 has to settle
 * and every variant answers it differently.
 *
 * Throw all of this away once a variant wins.
 */

import { useCallback, useEffect, useState } from "react";
import { emptyProject, sampleProject, type Project } from "./model.js";
import { UI, useProject } from "./kit.js";
import { VariantA, NAME as NAME_A } from "./VariantA.js";
import { VariantB, NAME as NAME_B } from "./VariantB.js";
import { VariantC, NAME as NAME_C } from "./VariantC.js";
import { VariantD, NAME as NAME_D } from "./VariantD.js";

const VARIANTS = [
  { key: "A", name: NAME_A, Component: VariantA },
  { key: "B", name: NAME_B, Component: VariantB },
  { key: "C", name: NAME_C, Component: VariantC },
  { key: "D", name: NAME_D, Component: VariantD },
];

function readVariant(): string {
  const v = new URLSearchParams(window.location.search).get("variant")?.toUpperCase();
  return VARIANTS.some((x) => x.key === v) ? v! : "A";
}

export function Prototype() {
  const [variant, setVariant] = useState(readVariant);
  const [seed, setSeed] = useState<Project>(() => sampleProject());
  const [project, update] = useProject(seed);

  const go = useCallback((key: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("variant", key);
    window.history.replaceState(null, "", url);
    setVariant(key);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable))
        return;
      const i = VARIANTS.findIndex((x) => x.key === variant);
      const next = (i + (e.key === "ArrowRight" ? 1 : -1) + VARIANTS.length) % VARIANTS.length;
      go(VARIANTS[next]!.key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant, go]);

  const current = VARIANTS.find((x) => x.key === variant) ?? VARIANTS[0]!;
  const Current = current.Component;

  return (
    <>
      <Current project={project} update={update} />
      {import.meta.env.MODE !== "production" && (
        <div
          style={{
            position: "fixed",
            left: 14,
            bottom: 14,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "#0b0d12",
            color: "#fff",
            border: "1px solid #333842",
            borderRadius: 999,
            padding: "6px 8px",
            font: `12px ${UI.font}`,
            boxShadow: "0 10px 30px rgba(0,0,0,.4)",
          }}
        >
          <button
            onClick={() =>
              go(
                VARIANTS[
                  (VARIANTS.findIndex((x) => x.key === variant) + VARIANTS.length - 1) %
                    VARIANTS.length
                ]!.key,
              )
            }
            style={arrow}
          >
            ←
          </button>
          <span style={{ padding: "0 6px", whiteSpace: "nowrap" }}>
            <strong>{current.key}</strong> — {current.name}
          </span>
          <button
            onClick={() =>
              go(
                VARIANTS[(VARIANTS.findIndex((x) => x.key === variant) + 1) % VARIANTS.length]!.key,
              )
            }
            style={arrow}
          >
            →
          </button>
          <span style={{ opacity: 0.35, padding: "0 2px" }}>|</span>
          <button
            onClick={() => setSeed(emptyProject())}
            style={arrow}
            title="Start from an empty project"
          >
            empty
          </button>
          <button
            onClick={() => setSeed(sampleProject())}
            style={arrow}
            title="Load the finished sample page"
          >
            filled
          </button>
        </div>
      )}
    </>
  );
}

const arrow: React.CSSProperties = {
  background: "#1c2029",
  color: "#fff",
  border: 0,
  borderRadius: 999,
  padding: "4px 9px",
  cursor: "pointer",
  font: `12px ${UI.font}`,
};
