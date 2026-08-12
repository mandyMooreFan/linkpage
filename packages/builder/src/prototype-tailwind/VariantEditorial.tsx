/**
 * PROTOTYPE — throwaway. Variant **Editorial**.
 *
 * The tool as a printed form: white ground, no radius anywhere, no shadow anywhere, black rules
 * that mean something, and a heading big enough that the one question on the screen is
 * unmistakably the one question on the screen. The accent is spent on links and nothing else.
 *
 * The bet: the calmest thing is not softness, it is **certainty** — an owner who can see at a
 * glance what is being asked and where the answer goes never has to look for anything. The risk:
 * high contrast and hard corners read as severe, and this product talks to people who are
 * nervous about getting it wrong.
 */

import type { JSX } from "react";
import { ARRIVAL, BUSINESS, ROWS, SWATCHES, UNCOVERED } from "./data.js";

export const NAME = "Editorial — big type, hard rules, no radius";

const GROUND = "bg-white dark:bg-black";
const INK = "text-black dark:text-white";
const QUIET = "text-neutral-600 dark:text-neutral-400";
const RULE = "border-black dark:border-white";

export function EditorialQuestion(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-sans`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-8 wide:max-w-none wide:flex-row wide:gap-12 wide:px-10 wide:py-12">
        <div className="flex-1">
          <div className={`border-t-4 ${RULE} pt-4`}>
            <h1 className="text-[2.5rem] leading-[1.05] font-bold tracking-tighter">
              What&rsquo;s your colour?
            </h1>
          </div>
          <p className={`mt-4 text-base ${QUIET}`}>
            Everything else on the page is worked out from it.
          </p>

          <ul className="mt-8 grid grid-cols-4 gap-px bg-black dark:bg-white">
            {SWATCHES.map((swatch, index) => (
              <li key={swatch.hex}>
                <button
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={index === 1}
                  style={{ background: swatch.hex }}
                  className="relative block h-16 w-full"
                >
                  {index === 1 && (
                    <span className="absolute inset-2 border-4 border-white" aria-hidden="true" />
                  )}
                </button>
              </li>
            ))}
          </ul>

          <p className="mt-5 text-base">
            Your colour: <span className="font-bold uppercase tracking-wide">Raspberry</span>
          </p>

          <div className={`mt-10 border-t ${RULE} pt-5`}>
            <label htmlFor="ed-hex" className="block text-sm font-bold uppercase tracking-widest">
              Or type your exact colour
            </label>
            <span id="ed-hex-hint" className={`mt-1 block text-sm ${QUIET}`}>
              From a designer or a brand guide.
            </span>
            <input
              id="ed-hex"
              aria-describedby="ed-hex-hint"
              placeholder="#c2185b"
              className={`tap mt-3 w-full border-2 ${RULE} bg-transparent px-3 py-2 text-lg focus:outline-4 focus:outline-[#1a3ea8]`}
            />
          </div>

          <button
            type="button"
            className="tap mt-10 w-full bg-black px-6 py-4 text-lg font-bold text-white uppercase tracking-widest dark:bg-white dark:text-black"
          >
            Continue
          </button>
        </div>

        <EditorialPreview />
      </div>
    </div>
  );
}

export function EditorialList(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-sans`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-10 px-5 py-8 wide:max-w-none wide:flex-row wide:gap-12 wide:px-10 wide:py-12">
        <div className="flex-1">
          <p className="border-l-4 border-[#1a3ea8] py-1 pl-3 text-base">{ARRIVAL}</p>

          <div className={`mt-6 flex items-end justify-between gap-4 border-b-4 ${RULE} pb-3`}>
            <h1 className="text-3xl font-bold tracking-tighter">{BUSINESS}</h1>
            <button
              type="button"
              className="tap shrink-0 bg-black px-5 py-2 text-sm font-bold text-white uppercase tracking-widest dark:bg-white dark:text-black"
            >
              Download
            </button>
          </div>

          <ul className="mt-0">
            {ROWS.map((row) => (
              <li key={row.label} className={`border-b ${RULE}`}>
                <button type="button" className="tap flex w-full flex-col gap-1 py-3 text-left">
                  <span className="text-xs font-bold uppercase tracking-widest">{row.label}</span>
                  <span className={`text-base ${QUIET}`}>{row.summary}</span>
                </button>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-sm font-bold uppercase tracking-widest">Anything else?</h2>
          <ul className="mt-3 flex flex-col">
            {UNCOVERED.map((topic) => (
              <li key={topic}>
                <button
                  type="button"
                  className="tap w-full py-2 text-left text-base text-[#1a3ea8] underline underline-offset-4"
                >
                  Add {topic.toLowerCase()}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <EditorialPreview />
      </div>
    </div>
  );
}

function EditorialPreview(): JSX.Element {
  return (
    <div className="flex-1">
      <button
        type="button"
        className={`tap w-full border-2 ${RULE} py-3 text-sm font-bold uppercase tracking-widest wide:hidden`}
      >
        See my page
      </button>
      <div className={`hidden border-2 ${RULE} bg-white p-8 text-black wide:block`}>
        <p className="text-2xl font-bold">{BUSINESS}</p>
        <p className="mt-1 text-sm text-neutral-600">Fine bread, since 1974</p>
        <div className="mt-6 space-y-2 text-sm">
          <p className="bg-[#c2185b] px-4 py-2 text-center text-white">See the menu</p>
          <p className="border border-[#c2185b] px-4 py-2 text-center text-[#c2185b]">
            Book a table
          </p>
        </div>
      </div>
    </div>
  );
}
