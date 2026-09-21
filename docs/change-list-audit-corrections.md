# Corrections to the change-list audit

`change-list-audit.md` is a **dated snapshot** — audited 2026-08-25 against `main` @ `678af9d` — and
its own header says the tables are _"the audit as it stood, and are left as written"_. Editing a
snapshot to match today breaks the thing it is for.

So corrections live here instead: **dated, keyed to the audit's own finding IDs, and beside the
snapshot rather than inside it.** A reader following a verdict in that file should find its entry
here before acting on it.

---

## R-6 — the hours icon sits alone on its own line

**Corrected 2026-09-21**, against `main` @ `a22503a`, on
[#313](https://github.com/mandyMooreFan/linkpage/issues/313) of
[map #414](https://github.com/mandyMooreFan/linkpage/issues/414).

**The verdict stands: the icon is left alone on its line.** What changes is why — and everything the
snapshot gives as the reason has turned out to be wrong.

### What the record said

> there is no text for it to sit beside, §2.5 refuses the ninth string a caption would need, the flex
> fix costs ~100 B against 0.33 KB of chrome headroom

Three claims. **None of them survives measurement.**

### 1. There is text for it to sit beside, and there has been since CL-5

The hours panel already writes its caption. `render.ts` emits
`<h2 class="lp-sr" id="…">Opening hours</h2>` immediately before the mark — CL-5's hidden heading,
the one `size.test.ts` records as having spent **84 B**. The words are on every page already; they
are `position:absolute` and clipped, for screen readers.

**So no ninth string is needed and none ever was.** §2.5's string budget was never the binding
constraint here — which matters because §2.5 has since grown to ten strings anyway
([CL-4](https://github.com/mandyMooreFan/linkpage/issues/277)), so the recorded reason was both
inapplicable when written and obsolete afterwards.

### 2. The headroom is 257 B — not 347 B, and not 215 B either

Measured on `a22503a` by rendering `MAXIMAL` in all 42 languages and taking the widest:

|                                | bytes   |
| ------------------------------ | ------- |
| `CHROME_TRIPWIRE` (26 KB)      | 26,624  |
| worst page — `MAXIMAL` in Thai | 26,367  |
| **headroom**                   | **257** |

English is 26,255 B. The next-widest languages are Hindi (26,349), Arabic (26,337), Hebrew (26,320)
and Greek (26,295).

The 347 B in the snapshot is the pre-CL-5/CL-6 figure. `size.test.ts`'s own note says **215 B**,
which was true when it was written and has since moved; that note should be read as dated too.

### 3. The fix costs 74 B, not ~100 B

Built and measured rather than estimated, then reverted — this was a costing, not a change. Wrapping
the existing mark and the existing heading in one flex row, and letting the heading be seen:

```
.lp-hours-head{display:flex;align-items:center;gap:var(--lp-space-2);margin:0 0 var(--lp-space-2)}
.lp-hours-mark{color:var(--lp-ink-muted)}
```

|                          | bytes  | headroom |
| ------------------------ | ------ | -------- |
| `a22503a` as it stands   | 26,367 | 257      |
| with the caption visible | 26,441 | **183**  |

**74 B**, or 29% of what is left — not "close to half", which is what the 215 B figure and the
~100 B estimate together implied.

### The reason the verdict actually rests on

**It would undo a deliberate accessibility decision, and that is a real cost where the byte count
is a modest one.**

Making the heading visible fails **8 renderer tests**, and two of them are promises made on purpose
by the accessibility change list, not incidental assertions:

- _"names the list with a visually hidden heading the list points at"_ — CL-5's guarantee, which a
  visible heading directly contradicts.
- _"marks both hidden words on a page that declares another language"_ — CL-7's marking of hidden
  words, which has one fewer hidden word to mark if this one stops being hidden.

So the question is not _can we afford 74 bytes_ — we can. It is whether the hours panel should stop
naming itself the way CL-5 decided it should, and that is a bigger question than an icon's
alignment. **Left standing, on that ground.**

### What a future reader should take from this

The snapshot's verdict is right and its reasoning is not. If R-6 is reopened, it is reopened as a
question about CL-5's hidden heading — not about §2.5's strings, and not about the byte budget.
