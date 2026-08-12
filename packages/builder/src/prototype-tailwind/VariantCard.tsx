/**
 * PROTOTYPE — throwaway. Variant **Card**.
 *
 * The tool as a modern app: a cool grey ground with white panels lifted off it, rounded corners,
 * one soft shadow, and the accent doing real work on the primary button. Structure comes from
 * **containers** — every group of controls is a panel, so what belongs together looks like it
 * does.
 *
 * The bet: an owner who has used any web app in the last decade already knows how to read this,
 * and familiarity is a form of comprehensibility. The risk: it is also the look of every
 * dashboard, and this product's whole pitch is that it is not one.
 */

import type { JSX } from "react";
import { ARRIVAL, BUSINESS, ROWS, SWATCHES, UNCOVERED } from "./data.js";

export const NAME = "Card — white panels on grey, one soft shadow";

const GROUND = "bg-[#f3f4f6] dark:bg-[#0f1115]";
const PANEL = "bg-white dark:bg-[#181b21] shadow-sm ring-1 ring-black/5 dark:ring-white/10";
const INK = "text-[#111827] dark:text-[#e8eaed]";
const QUIET = "text-[#6b7280] dark:text-[#9aa1ac]";
const FIELD =
  "rounded-lg border border-[#d1d5db] dark:border-[#333842] bg-white dark:bg-[#0f1115] px-3 py-2";

export function CardQuestion(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-sans`}>
      <div className="mx-auto flex max-w-xl flex-col gap-6 p-4 wide:max-w-none wide:flex-row wide:gap-8 wide:p-8">
        <div className="flex-1 space-y-4">
          <div className={`${PANEL} rounded-2xl p-6`}>
            <h1 className="text-2xl font-semibold tracking-tight">What&rsquo;s your colour?</h1>
            <p className={`mt-2 text-sm ${QUIET}`}>
              Everything else on the page is worked out from it.
            </p>

            <ul className="mt-6 grid grid-cols-6 gap-2">
              {SWATCHES.map((swatch, index) => (
                <li key={swatch.hex}>
                  <button
                    type="button"
                    aria-label={swatch.name}
                    aria-pressed={index === 1}
                    style={{ background: swatch.hex }}
                    className={`block aspect-square w-full rounded-xl ${
                      index === 1
                        ? "ring-2 ring-[#1a3ea8] ring-offset-2 ring-offset-white dark:ring-offset-[#181b21]"
                        : "ring-1 ring-black/10"
                    }`}
                  />
                </li>
              ))}
            </ul>

            <p className="mt-4 text-sm">
              Your colour: <span className="font-semibold">Raspberry</span>
            </p>

            <div className="mt-6">
              <label htmlFor="card-hex" className="block text-sm font-medium">
                Or type your exact colour
              </label>
              <span id="card-hex-hint" className={`mt-0.5 block text-sm ${QUIET}`}>
                From a designer or a brand guide.
              </span>
              <input
                id="card-hex"
                aria-describedby="card-hex-hint"
                placeholder="#c2185b"
                className={`tap mt-2 w-full ${FIELD} focus:border-[#1a3ea8] focus:ring-2 focus:ring-[#1a3ea8]/30 focus:outline-none`}
              />
            </div>
          </div>

          <button
            type="button"
            className="tap w-full rounded-xl bg-[#1a3ea8] px-6 py-3 font-medium text-white shadow-sm"
          >
            Continue
          </button>
        </div>

        <CardPreview />
      </div>
    </div>
  );
}

export function CardList(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-sans`}>
      <div className="mx-auto flex max-w-xl flex-col gap-6 p-4 wide:max-w-none wide:flex-row wide:gap-8 wide:p-8">
        <div className="flex-1 space-y-4">
          <div className="rounded-xl bg-[#1a3ea8]/8 px-4 py-3 text-sm ring-1 ring-[#1a3ea8]/20">
            {ARRIVAL}
          </div>

          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-semibold">{BUSINESS}</h1>
            <button
              type="button"
              className="tap shrink-0 rounded-xl bg-[#1a3ea8] px-4 py-2 text-sm font-medium text-white shadow-sm"
            >
              Download
            </button>
          </div>

          <ul
            className={`${PANEL} divide-y divide-black/5 overflow-hidden rounded-2xl dark:divide-white/10`}
          >
            {ROWS.map((row) => (
              <li key={row.label}>
                <button
                  type="button"
                  className="tap flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{row.label}</span>
                    <span className={`block truncate text-sm ${QUIET}`}>{row.summary}</span>
                  </span>
                  <span className={QUIET} aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className={`${PANEL} rounded-2xl p-4`}>
            <h2 className="text-sm font-semibold">Anything else?</h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {UNCOVERED.map((topic) => (
                <li key={topic}>
                  <button
                    type="button"
                    className="tap rounded-lg border border-[#d1d5db] px-3 py-2 text-sm dark:border-[#333842]"
                  >
                    + {topic}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <CardPreview />
      </div>
    </div>
  );
}

function CardPreview(): JSX.Element {
  return (
    <div className="flex-1">
      <button
        type="button"
        className={`tap w-full rounded-xl ${PANEL} px-4 py-3 text-sm font-medium wide:hidden`}
      >
        See my page
      </button>
      <div className={`hidden overflow-hidden rounded-2xl ${PANEL} wide:block`}>
        <div className="bg-white p-8 text-[#111827]">
          <p className="text-2xl font-semibold">{BUSINESS}</p>
          <p className="mt-1 text-sm text-[#6b7280]">Fine bread, since 1974</p>
          <div className="mt-6 space-y-2 text-sm">
            <p className="rounded-lg bg-[#c2185b] px-4 py-2 text-center text-white">See the menu</p>
            <p className="rounded-lg border border-[#c2185b] px-4 py-2 text-center text-[#c2185b]">
              Book a table
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
