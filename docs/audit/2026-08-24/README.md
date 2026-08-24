# Design-audit baseline — 24 Aug 2026

Screenshots of the live builder at <https://mandymoorefan.github.io/linkpage/> (deployed from
`main` at ef15616), captured for the Tailwind design audit
([map #171](https://github.com/mandyMooreFan/linkpage/issues/171), ticket
[#172](https://github.com/mandyMooreFan/linkpage/issues/172)). Captured with Playwright driving
headless Chromium; throwaway script, not in the repo.

## Widths

- `desktop/` — 1440×900, device scale 1
- `mobile/` — 390×844 (iPhone 14), device scale 2, touch

## What was walked

One full first run with the **Food & drink** preset as "Ada & Sons Bakers": every wizard step
shot on arrival (`-empty`) and again with its answer typed (`-filled`), a `Back` excursion to
the already-answered tagline mid-run (`-revisited-via-back`), then the arrival on the review
list, the tagline row re-opened for editing (`list-reedit-tagline` — the seed finding), the
preview, the Download sheet (viewport and full-page), the list menu, and the replace
confirmation over a re-imported project file.

Notes for the audits:

- Picking a preset advances on its own — there is no "selected, waiting on Continue" state.
- On mobile the run ends **page-first**: the preview is what you land on, and the list is
  behind "Edit your page" (`23-list-arrived` is that landing; `25-list-rows` is the list).
- On desktop the list and preview sit side by side, so there is no separate drawer shot.

## Generated page

`pages/` holds the standalone `index.html` the live builder's Download produced for four
style variants (same content, `style.shape` / `style.type` / `style.mode` swapped), plus a
full-page screenshot of each at both widths:

- `centred-classic-light` — the walk's own defaults
- `colourblock-modern-dark`
- `floatingcard-friendly-light`
- `ruledleft-classic-dark`

`walk-index.html` and `walk-project.json` are the two files the Download sheet produced at the
end of the desktop walk, byte-for-byte.
