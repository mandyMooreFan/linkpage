/**
 * PROTOTYPE — throwaway. Variant **Paper**.
 *
 * The tool as good stationery: a warm off-white ground, one ink, hairline rules and no boxes at
 * all. Nothing is elevated, nothing is carded, and structure comes from **space and rules**
 * rather than from containers. Type is the only decoration — a large question, a quiet hint, and
 * a generous measure.
 *
 * The bet: a business owner filling in one question at a time is doing something closer to
 * writing than to configuring, and a calm sheet of paper says that better than an app does.
 * The risk it takes: with no borders anywhere, tappable things have to be obvious from shape and
 * weight alone.
 */

import type { JSX } from "react";
import { ARRIVAL, BUSINESS, ROWS, SWATCHES, UNCOVERED } from "./data.js";

export const NAME = "Paper — ink on a warm sheet, no boxes";

const GROUND = "bg-[#faf7f2] dark:bg-[#17150f]";
const INK = "text-[#1f1b16] dark:text-[#f2ece1]";
const QUIET = "text-[#6b6257] dark:text-[#a79c8c]";
const RULE = "border-[#e2d9cb] dark:border-[#3a342a]";

export function PaperQuestion(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-serif`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-12 wide:max-w-none wide:flex-row wide:gap-16 wide:px-12">
        <div className="flex-1">
          <h1 className="text-4xl leading-tight font-normal tracking-tight">
            What&rsquo;s your colour?
          </h1>
          <p className={`mt-3 text-lg ${QUIET} font-sans`}>
            Everything else on the page is worked out from it.
          </p>

          <ul className="mt-10 grid grid-cols-6 gap-3">
            {SWATCHES.map((swatch, index) => (
              <li key={swatch.hex}>
                <button
                  type="button"
                  aria-label={swatch.name}
                  aria-pressed={index === 1}
                  style={{ background: swatch.hex }}
                  className={`block aspect-square w-full rounded-full ${
                    index === 1
                      ? "ring-2 ring-current ring-offset-4 ring-offset-[#faf7f2] dark:ring-offset-[#17150f]"
                      : ""
                  }`}
                />
              </li>
            ))}
          </ul>

          <p className="mt-6 font-sans text-base">
            Your colour: <span className="font-semibold">Raspberry</span>
          </p>

          <div className="mt-10 font-sans">
            <label htmlFor="paper-hex" className="block text-base font-medium">
              Or type your exact colour
            </label>
            <span id="paper-hex-hint" className={`mt-1 block text-sm ${QUIET}`}>
              From a designer or a brand guide.
            </span>
            <input
              id="paper-hex"
              aria-describedby="paper-hex-hint"
              placeholder="#c2185b"
              className={`tap mt-3 w-full border-0 border-b-2 ${RULE} bg-transparent px-0 py-2 text-lg placeholder:text-[#b8ab98] focus:border-current focus:outline-none`}
            />
          </div>

          <button
            type="button"
            className="tap mt-12 w-full rounded-sm bg-[#1f1b16] px-6 py-3 font-sans text-lg text-[#faf7f2] dark:bg-[#f2ece1] dark:text-[#17150f]"
          >
            Continue
          </button>
        </div>

        <PaperPreview />
      </div>
    </div>
  );
}

export function PaperList(): JSX.Element {
  return (
    <div className={`min-h-dvh ${GROUND} ${INK} font-serif`}>
      <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10 wide:max-w-none wide:flex-row wide:gap-16 wide:px-12">
        <div className="flex-1">
          <p className={`font-sans text-base ${QUIET}`}>{ARRIVAL}</p>

          <div className="mt-6 flex items-baseline justify-between gap-4">
            <h1 className="text-3xl tracking-tight">{BUSINESS}</h1>
            <button
              type="button"
              className="tap shrink-0 rounded-sm bg-[#1f1b16] px-5 py-2 font-sans text-[#faf7f2] dark:bg-[#f2ece1] dark:text-[#17150f]"
            >
              Download
            </button>
          </div>

          <ul className={`mt-8 divide-y ${RULE} border-y ${RULE} font-sans`}>
            {ROWS.map((row) => (
              <li key={row.label}>
                <button type="button" className="tap flex w-full flex-col gap-0.5 py-4 text-left">
                  <span className="text-sm font-medium">{row.label}</span>
                  <span className={`text-base ${QUIET}`}>{row.summary}</span>
                </button>
              </li>
            ))}
          </ul>

          <h2 className="mt-10 text-xl">Anything else?</h2>
          <ul className="mt-3 flex flex-wrap gap-2 font-sans">
            {UNCOVERED.map((topic) => (
              <li key={topic}>
                <button
                  type="button"
                  className={`tap rounded-full border ${RULE} px-4 py-2 text-base`}
                >
                  {topic}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <PaperPreview />
      </div>
    </div>
  );
}

/** The drawer: beside the question on a wide screen, one tap away below it (§7.6). */
function PaperPreview(): JSX.Element {
  return (
    <div className="flex-1">
      <button
        type="button"
        className={`tap w-full border-y ${RULE} py-3 font-sans text-base wide:hidden`}
      >
        See my page
      </button>
      <div className={`hidden border ${RULE} bg-white p-8 text-[#1f1b16] wide:block`}>
        <p className="text-2xl">{BUSINESS}</p>
        <p className="mt-1 text-sm text-[#6b6257]">Fine bread, since 1974</p>
        <div className="mt-6 space-y-2 font-sans text-sm">
          <p className="rounded-sm bg-[#c2185b] px-4 py-2 text-center text-white">See the menu</p>
          <p className="rounded-sm border border-[#c2185b] px-4 py-2 text-center text-[#c2185b]">
            Book a table
          </p>
        </div>
      </div>
    </div>
  );
}
