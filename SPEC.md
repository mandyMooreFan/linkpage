# linkpage v1 — specification

This document is the complete design for linkpage v1. It is written so that someone who has never
seen the project can implement it without asking a question. Where a decision looks arbitrary, the
reasoning is given — not as history, but because the reasoning is usually the thing that stops an
implementer from "improving" it into something that breaks a guarantee elsewhere.

**Status:** design complete, implementation not started. Every decision here is settled. The
[deferred](#10-deferred-past-v1) and [to verify](#11-to-verify-during-implementation) sections at the
end are the only places where anything is open, and both are explicit about it.

---

## 1. What this is

A free, MIT-licensed, browser-based visual builder that a non-technical business owner uses to
produce **one self-contained `index.html`** — the link page you put in an Instagram bio, on a printed
flyer, or behind a QR code on a counter.

**Who it is for:** the owner of a small business — a café, a salon, a plumber, a shop. Not a
developer, not a designer, and not someone who wants to learn what a "deploy" is.

### 1.1 Constraints that are not negotiable

These are load-bearing. Several obvious features are ruled out by them, and that is intentional
rather than an oversight.

1. **No backend, ever.** No accounts, no signup, no server-side state. This is what makes the tool
   free to run, free to self-host, and impossible to shut down. It is also why analytics, forms, and
   round-trip editing of a published page do not exist.
2. **Browser SPA**, served as a static site from GitHub Pages. Nothing to install.
3. **Export is one file.** A single `index.html` with CSS and images inlined. No `dist/` folder, no
   relative paths to break, drag-and-droppable onto any host, emailable to a third party.
4. **The export ships zero JavaScript.** No `<script>` tag, ever. This is enforced by CI, not by
   convention.
5. **Persistence is localStorage plus an explicit `project.json`** the owner exports and owns.
6. **The last mile is guidance, not integration.** The tool explains how to get the file online. It
   never deploys on the owner's behalf.
7. **One page.** Header, link buttons, and a fixed set of business sections.
8. **The user is a business owner, not a developer.** Where a decision trades power against
   comprehensibility, comprehensibility wins.

---

## 2. The page

### 2.1 Six sections, fixed order

The page is **not** an arrangeable block list. It is a fixed set of sections the owner switches on
and fills in, always rendered in this order:

> **header → links → hours → contact → address → social**

`header` and `links` always render. The four business sections are each optional.

**There is no reordering control**, in v1 or planned. Page order is a design decision, and this tool
does not hand the owner design decisions they have no opinion about. It also makes the renderer a
straight-line function and turns validation into "is this key well-formed" rather than "is this a
valid union member". If reordering is ever wanted, an optional `order` array is a purely additive
change — nothing here forecloses it.

### 2.2 Why the set is exactly six

The strongest candidate for a seventh was an **announcement banner**, and it was rejected on the
constraints rather than on taste. Updating this page means re-exporting the file and re-uploading it.
Content that is temporary by nature is exactly the content that rots, and a page still saying "Closed
for Christmas" in March is worse than one that never said it. **The no-backend constraint quietly
selects for durable content**, and hours, contact, address and social are all durable.

A tagline is a header field, not a section. A services-and-prices list is a real small-business need
with its own design tree — a later effort, not a v1 section.

### 2.3 Per-section rules

**Header.** Business name (required), optional tagline, optional logo.

**Links.** A link is a **label, a URL, and optionally an icon** — nothing else.

- A "featured" flag was rejected as _redundant_, not as bloat: the owner already controls list order,
  so **position is the emphasis mechanism**. A second competing way to signal importance invites a
  page where everything is featured. (The builder makes this mechanism visible — see §7.5.)
- A subtitle line was the closer call, and lost because it is one more thing that must be _written
  well_ for the page to look right. This tool does not require design judgement of the owner.

**Hours.** Each day holds **zero or more `[open, close]` intervals**; zero means closed. A single
open/close pair per day would be wrong on day one for a large slice of the target users — restaurants
open 11–2 and 5–9, salons that close for lunch. Everything structure _shouldn't_ model goes in one
free-text `note`: bank holidays, "by appointment", seasonal changes. **Structure where it is
reliable, prose where it is not.**

Times are stored as 24-hour `"HH:MM"`. `clock` and `weekStart` are display preferences. Collapsing
"Mon–Fri 9–5" is a render-time nicety and is never stored.

The seven weekday abbreviations and the word for a closed day are **the only words on the page that
are not the owner's**, and they are written in the page's own language — see §2.5.

**Contact.** Phone and email, rendered as `tel:` and `mailto:` links.

**Address.** **Free-text lines plus an optional directions URL** — not structured street/city/region/
postcode. Structured fields are what a developer reaches for and they are a localisation trap: a UK
florist filling in "state", a Japanese owner facing "street address". The owner types their address
the way they would write it on an envelope. Nothing in this project reads the address as data, so
structure buys nothing and costs comprehensibility.

The `directionsUrl` matters because an embedded map is forbidden by the no-external-subresources
invariant (§5.3) — a link out is the only remaining answer to "where are you".

**Social.** A platform identifier and a URL. The platform selects a brand icon.

### 2.4 Icons

A **small curated set, vendored into the renderer source as inline SVG path data.** The renderer
declares no dependencies (§5.1), so it cannot import an icon library — whatever is used gets copied
in, with attribution. That forces a small closed set, which fits the rest of this design.

- Generic glyphs: **Lucide** (ISC). Three of the ones taken are derived from Feather and carry its
  MIT licence as well.
- Social brand marks: **Simple Icons** (CC0).
- **Font Awesome Free is specifically avoided:** CC BY 4.0 attaches an attribution obligation that
  would follow every exported page.
- CC0 covers copyright, not trademark. Using a platform's mark to link to that platform is nominative
  use, which is exactly what this is.
- A **`NOTICES` file** listing both sources is a deliverable.
- **Nothing an owner exports carries an attribution requirement.** ISC and MIT ask that their notice
  travel with copies of the source, which `NOTICES` does for this repository; CC0 asks for nothing.

**No icon uploads.** They would drag the image size budget into every link button and let a blurry
JPEG sit where a crisp glyph belongs.

**The set must include a generic link glyph** used as the fallback for an unrecognised social
platform (§4.4). It is the one icon that exists for a case the owner never deliberately creates.

#### The glyphs

Fourteen. Each earns its place by serving a suggestion the presets make in §7.3 — that mapping is the
membership rule, and a test asserts it in both directions, so a suggestion with no glyph and a glyph
no suggestion reaches both fail the build.

| Name        | Lucide source    | The suggestion it serves           |
| ----------- | ---------------- | ---------------------------------- |
| `menu`      | `utensils`       | See the menu                       |
| `cart`      | `shopping-cart`  | Shop online                        |
| `bag`       | `shopping-bag`   | Order for pickup                   |
| `shop`      | `store`          | Shop                               |
| `calendar`  | `calendar`       | Book a table / an appointment      |
| `location`  | `map-pin`        | Find us                            |
| `phone`     | `phone`          | Call us                            |
| `mail`      | `mail`           | Subscribe                          |
| `message`   | `message-circle` | Get in touch                       |
| `document`  | `file-text`      | Get a quote                        |
| `price`     | `tag`            | Prices                             |
| `services`  | `list`           | Our services                       |
| `portfolio` | `briefcase`      | See our work                       |
| `link`      | `link`           | **none — the §4.4 fallback glyph** |

`Link.icon` is **a closed union of these names.** It is a preference in §4.4's sense — nothing the
owner authored sits behind it — so an unrecognised name renders no glyph and the value survives in
the file by §4.5's round trip.

#### The platforms with a brand mark

| Identifier  | Mark      |
| ----------- | --------- |
| `instagram` | Instagram |
| `facebook`  | Facebook  |
| `x`         | X         |
| `tiktok`    | TikTok    |
| `youtube`   | YouTube   |
| `whatsapp`  | WhatsApp  |
| `pinterest` | Pinterest |
| `threads`   | Threads   |
| `bluesky`   | Bluesky   |
| `mastodon`  | Mastodon  |

**`SocialLink.platform` stays an open string, and this table does not close it.** §4.4 requires an
unrecognised platform to be kept rather than dropped, because behind it is a URL the owner typed; a
closed union would be a type that lies about what a valid file may hold. The table decides only which
entries get a brand mark instead of the `link` glyph. Each identifier carries the platform's own
spelling of its name, because a social link whose only visible content is a mark still needs an
accessible name and no rule capitalises `tiktok` into `TikTok`.

**LinkedIn is absent, and not by preference:** Simple Icons removed the mark at LinkedIn's request,
and a source that still carries it would carry the attribution obligation this section exists to
avoid. A LinkedIn URL renders with the generic glyph — the same path every unnamed platform takes,
which is the useful proof that the path works.

**Growth rule.** A new platform earns a mark by being one a small business plausibly publishes, and
costs nothing else: adding one is additive, never a version bump (§4.8), and removing one degrades to
the fallback rather than dropping the link. A new _generic_ glyph earns its place only by serving a
preset suggestion, so the set grows when §7.3 does and not otherwise.

### 2.5 The eight words the page writes

The page declares `<html lang>` from the owner's `lang` (§4.1) because WCAG 2.2 SC 3.1.1 asks for it
and because the content is the owner's own words. **The renderer then writes eight words of its own:
the seven weekday abbreviations and the word for a closed day.** They must be in the language the
page declares, or the declaration is not true — a Cardiff bakery shipping `lang="cy"` alongside `Mon`,
`Tue` and `Closed` has told a Welsh screen reader to pronounce English abbreviations with Welsh
phonetics, and the declaration is what we asked assistive technology to trust.

**Eight strings is the whole translatable surface, by design rather than by luck.** §2.3 made the
address free text, the contact rows are identified by a glyph rather than by the word "Phone", and
the address _is_ the directions link. Nothing else on the exported page is our prose, and a change
that adds a ninth string is a change to this section.

**`Intl.DateTimeFormat` is ruled out.** Its output tracks the ICU data compiled into the host, so the
same `project.json` renders differently across Node versions — which costs §6.7's byte-identical
guarantee — and, more sharply, the preview runs in the owner's browser while the tests and the export
path run in Node. Two ICU versions means the preview and the artifact can differ **in the bytes**,
which is the exact drift §5.2's `srcdoc` iframe exists to make structurally impossible; it would also
break the property that two owners who reach the same page get identical files. A CI test fails if
anything in the renderer so much as constructs an `Intl` formatter. **Anyone proposing `Intl` here
must answer §5.2 first.**

**Emitting no day names at all was considered and rejected.** An hours block still has to say which
day each row is, so the day would have to move into the owner's own text — which turns structured
hours back into the free-text note §2.3 deliberately kept for what structure cannot model, and loses
the closed/unspecified distinction that section is built on.

**So the strings are vendored, exactly as the icon set is (§2.4)**, keyed by language tag, with
English as the fallback. **Only the selected language's strings reach the export**, so the table
costs §6.5's chrome budget nothing however long it grows.

#### Where the strings come from

- **The weekday abbreviations are CLDR's** — the `format`/`abbreviated` weekday names from **Unicode
  CLDR 48**, extracted once and frozen in the source. That is a pinned, citable, reproducible source,
  and it is the same data `Intl` would have read: the objection above was never to CLDR, it was to
  reading CLDR at _render_ time from whichever host happens to be running. Licence and attribution
  live in `NOTICES`, and nothing an owner exports carries an attribution requirement (§2.4).
- **The word for a closed day is not a CLDR field.** No locale database holds the word a shop puts on
  its door, so each one is hand-authored. **That asymmetry is the table's weak point and it is stated
  rather than hidden:** an abbreviation can be checked against a version number, and the closed word
  can only be checked by someone who speaks the language.

#### Growth rule

A language earns a place when both halves are answerable: CLDR ships abbreviated weekday names for
it, **and** someone can name the word a business in that language writes on its own opening hours.
The set is the languages the repository could answer both for; it is not a claim about which
languages matter.

- Adding a language is **additive and never a version bump** (§4.8). `project.json` does not change
  shape, and an older reader of the same file renders English.
- **A correction is not a version bump either.** A speaker saying "that is not the word" is the
  highest-quality evidence this table can receive, and `CONTRIBUTING.md` asks for it by name. This is
  the one part of the renderer that is explicitly provisional.
- **An unknown language degrades to English, never to a failure and never to a guess.** English
  abbreviations on a Welsh page are a visible limitation; the wrong word in the owner's own language
  is worse than the honest foreign one.

#### Direction

**The page also declares `<html dir>`, derived from the same tag.** A page that says `lang="ar"` and
lays itself out left to right has declared a language it does not support — the same root cause as
the words above, only visibly wrong rather than subtly wrong. An explicit script subtag decides on
its own (`az-Arab` reads right to left, `ku-Latn` left to right); otherwise the primary subtag does.

`dir` is emitted unconditionally, including `dir="ltr"`: a document's base direction is a thing to
state, not a thing to inherit from whatever default the reader's browser holds, and it is ten bytes.
**The stylesheet names no physical side** — the hours grid and the contact rows follow the inline
axis on their own, the times column is `text-align:end`, and §3.1's `ruledLeft` shape was written
with logical properties from the start. A rule reaching for `left`, `right`, `margin-left` or
`padding-right` is how this quietly regresses.

---

## 3. The styling model

**You bring the colours, we bring the shape.**

### 3.1 The six controls

| Control             | Values                                                               |
| ------------------- | -------------------------------------------------------------------- |
| **Main colour**     | required — picked from a constrained field, or typed as an exact hex |
| **Second colour**   | optional, encouraged                                                 |
| **Shape**           | `centred` \| `colourBlock` \| `floatingCard` \| `ruledLeft`          |
| **Type pairing**    | `classic` \| `modern` \| `friendly`                                  |
| **Corner softness** | slider, 0 (sharp) … 1 (rounded)                                      |
| **Light / dark**    | `light` \| `dark`                                                    |

Those six are unconditional: every page has them, and they are what _How it looks_ opens with.

**Two further controls appear only when a section that uses them does.** `clock` (12h/24h) and
`weekStart` are display preferences belonging to opening hours (§2.3), and they live at the foot of
the same step, shown when the page has hours and absent when it does not. They are listed apart from
the six deliberately — the six are the styling model, these two are settings that had nowhere better
to live. The distinction is what stops the screen accreting a ninth.

#### What the four shapes are

A shape decides where content sits on its axis, which block carries the page's one piece of emphasis,
and whether a section reads as a box, a card or a rule. **None of them touches the column** (§6.2) and
none of them names a colour (§3.2) — each selects among the roles the palette already derived.

| Shape              | What it does                                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`centred`**      | The base layout: a centred column of full-width buttons and bordered panels. The other three are expressed as deltas from it.                                                                                                                                                                |
| **`colourBlock`**  | The header becomes the page's one filled block and the buttons step back to outlines, so the emphasis lands once rather than five times. Inside the block the tagline inherits the fill's own ink — muted ink is derived against the _ground_ and would fail contrast on the fill.           |
| **`floatingCard`** | The whole column lifts onto one surface and the sections stop being boxes, divided by the hairline instead. A card of cards is a page with a border drawn round every paragraph. It pads inwards, so the outer width stays exactly at the cap.                                               |
| **`ruledLeft`**    | Everything hangs off one axis, marked by a rule in the button fill rather than the hairline — this rule identifies a section, and §3.3 guarantees the fill clears 3:1 where the hairline deliberately does not. Set in logical properties, so the axis follows the page's writing direction. |

#### What the three type pairings are

Each resolves to system font stacks (§6.3) and contributes **no rules at all** — a pairing is five
token values: a body stack, a display stack, a weight, a tracking and a line height.

| Pairing        | What it is                                                                                                                                                                                                         |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **`classic`**  | A serif display face over a system sans. The only pairing that is literally two faces, and the one that reads as a business that existed before the web did.                                                       |
| **`modern`**   | One grotesque, set tight and heavy. The pairing is between the display _setting_ and the text setting rather than between two families, which is how a modern identity is usually built and costs no second stack. |
| **`friendly`** | A rounded sans, set open. Includes a Japanese rounded gothic, so the pairing still means something on a page whose `lang` is not Latin.                                                                            |

#### Corner softness

The slider maps linearly to a radius: **0 → `0rem`, 1 → `1.25rem`**, in `rem` for §6.2's reason, and
rounded to three decimal places so §6.7's byte-determinism holds. Out-of-range values are clamped
rather than refused (§4.4).

**The default is `0.6`** — a gently rounded button rather than a sharp one. Sharp is a deliberate
look, and a page that arrived there by accident would read as unfinished, whereas softened reads as
the tool's own default, which is what a missing value means.

### 3.2 Derivation

**Every other colour on the page — text, ground, surfaces, rules, button text — is derived from the
one or two colours the owner gave, at render time, and is never stored.**

Storing derived colours would invent a consistency question (if a hand-edited file's stored palette
disagrees with its brand colour, which wins?) and that is a bug class this project simply does not
have. It also means a future improvement to the derivation reaches every existing project for free,
which matters for a tool meant to last.

**Shapes and type pairings carry structure only, never a palette.** A shape decides layout and
emphasis; it never introduces a colour.

### 3.3 The readability guarantee

Readability is guaranteed **by a constrained colour field rather than by warnings**. The owner cannot
easily pick a combination that fails, so they are never told off for picking one.

A hand-typed hex is **honoured exactly**. If it cannot carry the page — too light for a button, too
dark for a ground — it **steps back to a quieter role** rather than being rejected or corrected.

### 3.4 The advanced tier

Freeform colour controls survive as a **collapsed "advanced" panel**: a separate, **losslessly
reversible** override layer.

- It sits at the foot of the _How it looks_ step (§7.4).
- It **reports contrast and nothing else** — no refusal, no auto-correction, no export gate.
- Opening it is the acknowledgement that the readability guarantee no longer applies. **The guarantee
  is therefore "by default", not "always".**
- Its object is **persisted even when disabled**, so switching it off and saving cannot silently
  destroy the owner's manual work, and switching it back on returns that work intact.

---

## 4. `project.json`

**The file stores the owner's intent, not our results.** `project.json` holds what the owner chose;
`index.html` holds what we made of it.

### 4.1 Shape

```jsonc
{
  "version": 1, // see §4.2
  "lang": "en", // BCP 47; renders as <html lang="en">
  "style": {
    "brand": "#c2185b", // required — the one thing the owner must give
    "accent": "#00695c", // optional
    "shape": "centred", // centred | colourBlock | floatingCard | ruledLeft
    "type": "classic", // classic | modern | friendly
    "corners": 0.6, // 0 = sharp … 1 = rounded
    "mode": "light", // light | dark
    "advanced": {
      // persisted even when enabled is false
      "enabled": false,
      "colors": {/* hand-set overrides */},
    },
  },
  "header": {
    "name": "Ada's Bakery", // required
    "tagline": "Sourdough and very good coffee",
    "logo": {
      // null when absent — see §6.6
      "src": "data:image/png;base64,…",
      "width": 1200,
      "height": 1200,
    },
  },
  "links": [{ "label": "Order online", "url": "https://…", "icon": "cart" }],
  "hours": {
    "clock": "12h", // 12h | 24h — display only
    "weekStart": "mon", // mon | sun — display only
    "days": {
      "mon": [["09:00", "17:00"]],
      "wed": [], // explicit: closed
      "thu": [
        ["11:00", "14:00"],
        ["17:00", "21:00"],
      ],
    },
    "note": "Bank holidays vary",
  },
  "contact": { "phone": "+44…", "email": "hello@…" },
  "address": {
    "lines": ["12 Bridge Street", "Hebden Bridge", "HX7 8AA"],
    "directionsUrl": "https://…",
  },
  "social": [{ "platform": "instagram", "url": "https://…" }],
}
```

**`lang`** defaults to the browser's language at first run. WCAG 2.2 success criterion 3.1.1 requires
`<html lang>`, and hardcoding `"en"` would mislead screen readers and translation tools about a page
whose content is the owner's own words. It is consistent with the free-text decisions elsewhere: the
address is written the way the owner would write it, and the language declares what language that is.

The tag is shape-checked on the way out, and anything that is not tag-shaped renders as `"en"` (§4.7).
**`lang` decides three things and is resolved once**, so they cannot disagree: the `lang` attribute,
the `dir` attribute, and the eight words the renderer writes (§2.5). A file whose `lang` we could not
use therefore declares English, renders English and reads left to right.

**There is no `preset` field**, deliberately — see §7.3.

### 4.2 Versioning

**`"version"` is a single integer, and it bumps only when a change would break an older reader.**

Semver's three components encode a patch/minor/major distinction that a data file with one consumer
does not have, so two of the three would always be theatre. A date invites string-comparison bugs and
implies chronology is what you compare, when the real question is "can I read this".

**The bump rule is the load-bearing half.** If every field addition bumped, we would manufacture
incompatibility for changes that are genuinely compatible: adding an optional section breaks no
reader, and bumping would make an older builder _refuse_ a file it could have handled perfectly.

- `version: 1` covers every additive change until something actually breaks.
- Breaking = a rename, a type change, a removal, or a change in what an existing value _means_.
- **A missing `version` reads as `1`** — the lenient assumption, since the only files plausibly
  omitting it are the oldest ones we can definitely read. An explicit `null` reads the same way:
  `null` is JSON's own spelling of _no value_, so it makes no claim either.
- **A `version` that is present but is not a whole number `>= 0` refuses the file** — `"2"`, `1.5`,
  `-1`, `{}`. This is the one place §4.4's _wrong-typed reads as absent_ does not apply, and the
  exemption is the point rather than an oversight.

**Absent and unreadable are different claims.** Absent says the file makes no claim about its
version, and reading it as `1` is safely lenient. A value we cannot read says the file _does_ claim
a version and we cannot tell which — and reading that as "no claim" throws away the only signal
there is. Compose leniency with §4.4 and a file carrying `"version": "2"` reads as absent, therefore
as `1`, therefore **loads**: a v2 file walking past §4.3's forwards refusal on a type error rather
than a version check, into exactly the partial-load-then-autosave data loss §4.3 exists to make
unreachable. Everywhere else in the schema a wrong-typed value costs a preference; here it costs the
file.

Coercion — reading `"2"` as `2` and then refusing it as too new — was considered and rejected. It is
friendlier for the one hand-edit we can guess at, but coercion rules are a surface that only grows,
and the refusal already tells the person who hand-edited the file what they did.

The refusal reuses _"This file appears to be damaged."_ (§4.6) — no new message and no new concept,
since an unreadable `version` is a damaged file by any reading. It also keeps §4.3's **`version` is
the only thing allowed to refuse anything** literally true, and arguably truer: the refusal follows
from the version field either way.

**There is no timestamp and no hash.** A compatibility version answers _can this reader read this
file_ and needs **ordering**; a provenance stamp answers _when was this made_ and does a different
job. A hash can only compare for equality, collapsing the policy into "any change at all → refuse".
A timestamp would also break the property that two owners who reach the same page have byte-identical
files, and it records how the file was _born_ rather than the owner's intent. If provenance is ever
wanted, its home is the exported `index.html` (§6.7), which is disposable.

### 4.3 Compatibility, both directions

**Backwards — an older file in a newer builder: it loads silently.** No notice, no dialog, no badge.
_"Your file was upgraded to version 2"_ is a sentence that cannot land for this audience — upgraded
from what? They have one file and have never seen a version number.

The rule that keeps silence from meaning hidden: **any field defaulted on load must appear on the
review list as an ordinary row** (§7.4). Discoverability comes from the product's normal surface, not
from a modal that fires once and is gone.

Note that with localStorage autosave the upgrade is effectively permanent the moment the file opens.
That is acceptable because the upgrade is non-destructive by construction — it only ever adds defaults
for things that were absent.

**Forwards — a newer file in an older builder: refuse.** And **`version` is the only thing in this
policy allowed to refuse anything.**

Partial loading has the worst failure mode this product can produce: the builder drops the section it
does not recognise, the owner edits, autosave fires, and their durable artifact is permanently short a
section. Preserving unknown keys (§4.5) protects the _file_ but not the _page_ — an unrecognised
section round-trips safely through the JSON while rendering as nothing, so the owner previews a page
missing a section and either concludes the tool is broken or does not notice and publishes it.

Refusing is affordable because **the canonical builder is a static site and is always current**. The
message names the canonical URL, so the fix is following a link. For a self-hoster running a pinned
fork it is a hard stop, but they are a developer holding a JSON file.

There is **no "open it anyway" escape hatch.** The advanced panel (§3.4) earns its place by being
losslessly reversible; this would not be, so it would be an override that quietly does the damage the
refusal exists to prevent.

### 4.4 Unknown enum values

Never an error, never dropped — and the two enum families get different treatment because they hold
different things.

- **`platform` holds the owner's data.** Behind that string is a URL they typed. **Keep the entry,
  render the link with the generic fallback glyph, preserve the value verbatim.** The link is the
  point; the icon is decoration.
- **`shape`, `type`, `mode` hold a preference.** There is no authored content in `"brutalist"`.
  **Fall back to the default for rendering, preserve the original value in the file**, so a newer
  builder restores the choice intact.

As one rule: **fall back on anything that is a preference, preserve anything the owner typed, and let
neither refuse the file.**

This keeps the preview-is-the-export guarantee (§5.2) true: the preview shows the fallback and the
export contains the fallback, so they agree.

Accepted cost: with an unknown `shape`, the _How it looks_ control shows the default selected while
the file says otherwise, and touching the control overwrites the original. An "unrecognised" UI state
does not earn a permanent piece of interface for a rare, self-healing case.

### 4.5 Unknown keys

**Preserved, untouched, through a load-and-save round trip.** This is what makes §4.3's permissive
path and §4.4's preservation safe rather than merely well-intentioned.

Dropping unknown keys was argued as being more honest about what the builder understands — but that
is honesty about _our_ comprehension bought with _the owner's_ data. The cost of preserving is junk: a
hand-typo'd `"hourz"` lives in the file forever, invisible and useless. Permanent junk beats
occasional loss in a file whose entire job is to survive.

Stated as testable guarantees:

- **A file we wrote, opened and saved with no edits, is byte-identical** — same key order, same
  formatting.
- **A hand-edited file, opened and saved, retains every key and value**, with our formatting
  normalised around them.

Implementable by keeping the raw parsed object alongside the typed view and merging on write. This
applies to `project.json` only — unknown keys never reach `index.html`, so export determinism (§6.7)
is untouched.

### 4.6 Malformed and hand-edited input

**Refuse exactly two things, atomically** — parse and validate fully, then swap; never partially
apply, never touch the existing project on the way to failing:

1. It is not parseable JSON, or not a JSON object.
2. Its `version` is one we cannot honour — beyond us, or present and unreadable (§4.2).

**Everything else loads.** A file missing required fields is loaded for what it has, and **anything
required that is missing is collected by the flow** (§7.2). A file with no `style.brand` is exactly
the territory the flow exists for, so the owner is walked through the colour question as if they had
ticked a new section. No error, no repair dialog, no invented default.

**Wrong-typed values follow §4.4's rule:** treated as absent for rendering, preserved verbatim in the
file. **`version` is the sole exception** (§4.2): a wrong-typed `version` refuses, because reading it
as absent is how a file too new to load gets loaded anyway.

**Three refusal messages**, because the owner can act differently on each:

| Case                 | Message                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------ |
| Did not parse        | _"This file appears to be damaged."_                                                       |
| Parsed, wrong thing  | _"This doesn't look like a linkpage file."_                                                |
| `version` unreadable | _"This file appears to be damaged."_ — the same message; it is the same kind of trouble    |
| Version too new      | _"This page was made with a newer version of linkpage"_ — with the canonical URL as a link |

None of them names a JSON path. **Technical detail sits behind a disclosure** — invisible to the owner,
one click away for whoever hand-edited the file.

Repair-and-report — listing what could not be read — is rejected. It is the most transparent option
and the worst for this audience: a report about fields is a report in our vocabulary, and the flow can
simply ask instead.

### 4.7 Where validation lives

**The builder validates. The renderer trusts — and is total. It never throws.**

The renderer cannot hold a schema library (§5.1), so "the renderer validates" means hand-rolling and
maintaining one inside the package meant to stay minimal, and then deciding what it does on failure.
If it throws, `render(project)` stops being total — and since the preview _is_ that string in a
`srcdoc` iframe, a data problem becomes a blank screen instead of a slightly wrong page.

So the renderer is **defensive by construction**: every field treated as optional, missing section
omitted, unknown key ignored, wrong-typed value treated as absent. It always returns a string.
TypeScript types remain the contract, but types are a compile-time promise and the runtime behaviour
must stand alone.

**A total renderer can be property-tested**: throw arbitrary garbage at it and assert it still returns
a string satisfying the three invariants (§5.3).

### 4.8 Growing the schema

Adding a new section type is **additive**, so it does not bump the version; an older builder therefore
opens the newer file, preserves the section it does not understand, and simply does not render it.

**The mechanism by which the section set can ever grow is: add the key, do not bump, old builders
round-trip it safely.** `CONTRIBUTING.md` carries the social half — a new section is an issue first.

---

## 5. Architecture

### 5.1 Two packages

```
packages/renderer   render(project) → the complete text of index.html.
                    Plain TypeScript. Empty `dependencies` block. The artifact contract.
packages/builder    React + TypeScript on Vite, deployed to GitHub Pages.
                    Replaceable chrome around the renderer.
```

**The renderer is the artifact contract and is dependency-free; the builder is replaceable chrome
around it.** Any schema library, sanitiser, encoder or optimiser is builder-side. The renderer
receives opaque strings.

**pnpm via Corepack is load-bearing, not taste.** npm's hoisting would let the dependency-free
renderer `import React` and succeed; pnpm's isolated store makes that fail at build time. This was
probed rather than trusted: `import { useState } from "react"` inside the renderer fails typecheck
with `TS2307` even with React installed for the builder.

Node `>=22` (engines floor), `.nvmrc` pins 24, CI runs 24 and 26. The renderer resolves as TypeScript
source, not `dist/`. Note that **pnpm silently deletes an empty `dependencies` block on rewrite** —
invariant 3 exists partly to catch that.

The renderer is **not published to npm in v1**.

### 5.2 The preview is the export

The builder previews by dropping the renderer's exact output string into a **`srcdoc` iframe**. So
what the owner is looking at _is_ the file, not an impression of it. **WYSIWYG holds by
construction**, and the UI framework stays swappable without touching the export format.

This guarantee is load-bearing and has already cost a feature: direct manipulation — clicking text on
the page and typing — was rejected because **an editable page cannot be the `srcdoc` iframe**. You
cannot put `contenteditable` inside a sandboxed document regenerated on every keystroke, so direct
manipulation means rendering the page a _second_ time in React and letting the owner edit that: two
renderers, one of which is the export contract and one of which is what the owner actually looked at
while deciding they were happy. **Any future proposal to edit on the page must answer this first.**

### 5.3 Tests

Renderer-heavy Vitest: per-section snapshots plus **three invariant guards**, and one Playwright E2E
proving the downloaded file opens standalone and matches the preview.

| #   | Invariant                                                                            |
| --- | ------------------------------------------------------------------------------------ |
| 1   | The export contains no `<script>` tag, no inline event handler, no `javascript:` URL |
| 2   | The export references no external or relative **subresource**                        |
| 3   | The renderer's `package.json` declares no dependencies                               |

**Invariant 2's reading matters:** _navigation_ to another site is the entire point of a link page, so
`<a href="https://…">` is fine. What is forbidden is a **subresource** — anything the browser must
fetch to render the page. Those must be inlined, because the file has to work opened from a desktop
with no network.

No coverage target on the builder UI.

**Two known defects in the current invariant implementation**, both confirmed and both inherited by
implementation:

- **False positive.** The CSS `url()` check scans the whole rendered document rather than only CSS, so
  an inline `<svg>` using a gradient — `fill="url(#g)"` — yields `#g`, fails the `^data:` assertion,
  and breaks the build on an ordinary logo.
- **False negative.** The subresource check inspects only `src="…"` and `<link href="…">`. SVG's
  `<image>` element uses `href` and is not a `<link>`, so `<image href="https://…">` passes.

Neither is reachable from anything v1 generates, because no inline `<svg>` from a logo ever reaches
the export (§6.6). The false negative is nonetheless a genuine hole in the offline guarantee and
should be fixed.

---

## 6. The export

### 6.1 What it is

One `index.html`. CSS in a `<style>` block. Images as `data:` URIs. Nothing else, and nothing fetched.

**The filename `index.html` is fixed and load-bearing.** Beyond being what every host serves at a
directory root, at least one drop-style host skips its file-rename prompt specifically for that name.

### 6.2 The column

**The page is a single column of `min(100%, 25rem)` — 400 CSS px at the browser's default text size —
sitting inside a page gutter.** Below the cap the column is fluid. The cap therefore does nothing on a
phone; it exists to stop the page sprawling on everything wider than one.

**The number is a phone's content width, not a desktop measure.** Phones in use sit between roughly
360 and 430 CSS px of viewport, which is 330–400 px of content once a gutter is taken off. A cap at
400 sits at the top of that range, so on every phone the column runs the full width the reader has,
and the page never leaves a strip of unused screen beside itself. Capping lower — 360, say — would
give a large phone margins it did not ask for, which is the one screen this product cannot afford to
waste.

**Not wider, because §5.2 and §7.6 already spent this decision.** §7.6 drops a "see it on a laptop"
control on the grounds that a wide screen shows "the identical page with more whitespace", and §5.2
makes the preview _be_ the export. Both sentences are true only while the cap is about a phone's
width. A 640 px column would reflow the buttons, change the measure and change the size the logo
renders at, so a desktop visitor would see a page the owner never previewed — the second rendering
§5.2 exists to forbid, arriving through the stylesheet instead of through React.

**Not wider, on the content.** The 45–75 character measure that justifies a wide column is a rule for
paragraphs, and this page has none: six sections of labels, hours rows, an address and at most a
tagline (§2.1). What it does have is a stack of full-width tap targets, and a button much past 400 px
stops reading as a button and starts reading as a rule drawn across the page.

**Not wider, on bytes.** §6.6 sizes the logo at 3× the column, so the raster's pixel count grows with
the _square_ of this number. At 400 the logo is 1200 px and sits inside §6.5's ~120 KB line with
roughly 10× headroom for a real wordmark; at 600 it would be 1800 px and 2.25× the pixels. **The
column width is an input to the size budget**, not just to the layout.

**`rem` rather than `px`, deliberately.** Expressed as `25rem`, the cap tracks the reader's default
text size: someone who has raised it gets a proportionally wider column and keeps the same number of
characters per line, instead of a measure that tightens as the type grows. Page zoom scales `px` and
`rem` alike, so the two choices differ only under the default-font-size setting — which is precisely
the setting a reader with low vision uses.

> The consequence, recorded rather than left to be discovered: §6.6's logo constant is derived from
> the default root size, so for a reader who has enlarged their default text the logo raster falls
> below 3×. The logo is decorative and carries `alt=""` (§6.6). Trading its density for text that
> scales is the right way round.

**The cap is on the content column; the gutter sits outside it.** So "the column width" and "the
maximum CSS width the logo can occupy" (§6.6) are the same 400 px, with no padding to subtract. The
gutter's own size is a shape concern (§3) and is free to differ per shape without moving this number.

**§6.6's provisional 1200 px is confirmed, not replaced.** 3 × 400 = 1200 on the longest edge. Because
the column is capped at the widest phone's content width and is _narrower_ than that on every other
phone, the fixed constant behaves as a floor rather than a target: a 1200 px raster across a 358 px
column on a 390 px phone is 3.35×. The constant is at its stated 3× only in the one case it was sized
for, and better everywhere else.

### 6.3 Type

**Type pairings resolve to system font stacks.** No webfonts — so no bytes and no embedding licence,
accepting that glyphs differ across platforms.

### 6.4 Structured data

**`LocalBusiness` ships as microdata attributes**, not JSON-LD. JSON-LD requires a `<script>` tag,
which invariant 1 forbids. schema.org accepts the free-text address as plain text, so §2.3's decision
costs nothing here.

**`og:image` is structurally impossible** for any single-file tool: scrapers need a fetchable image
URL and there is no second file to point at. **Shared links preview as text, permanently.** This must
be explained to owners rather than quietly accepted.

### 6.5 Size

**A budget, not a gate.**

|                       |                         |
| --------------------- | ----------------------- |
| Total                 | ≤ 150 KB                |
| Chrome (markup + CSS) | ≤ 30 KB, asserted in CI |
| Logo                  | ~120 KB                 |

**The budget measures encoded bytes** — the actual size of `index.html` on disk. That is the file the
owner emails, drops onto a host, and sees in a downloads folder, and it is what CI counts. Any other
reading puts the spec and the test in disagreement.

Worth recording, because it prevents a wrong optimisation: **base64's +33% is a disk and email cost,
not a transfer cost.** Over the wire, gzip recovers almost all of it — measured at about 1% over the
binary. The file is bigger than the image it contains; the page is not slower.

**Enforced by bounding the inputs, never by refusing to export.** A hard cap is the worst possible
failure for this user — refusing would strand an owner from their own page.

### 6.6 Images and logos

There is exactly one image in the product: `header.logo`. Icons are vendored (§2.4) and link buttons
never carry uploaded images.

**Accepted input:** PNG, JPEG, SVG. The file input's `accept` is that explicit list, not `image/*` —
on desktop it greys designer files out of the picker so the failure never happens.

**Everything becomes a raster.** The pipeline runs entirely in the builder:

1. **SVG is accepted and rasterised.** No SVG ever reaches the export.
2. **Format by content:** flat art → **PNG**, photographic → **JPEG**. Detected by counting distinct
   colours in a 64 × 64 point sample, at full colour depth and without smoothing — both of those
   came out the opposite way round from the obvious guess and are measured, see §11 item 2.
   **The two classes overlap**, and the heuristic works on an asymmetry rather than on a gap:
   what sits in the overlap is detailed illustration, for which JPEG is a defensible encoding
   anyway, while the error a reader can _see_ — ringing around crisp type — did not occur once in
   a 205-image corpus. Read §11 before reaching for §11's stated retreat: it would incur the
   costly case on every photograph rather than on a twelfth of them.
3. **Alpha is never sacrificed.** JPEG has no alpha, so anything with meaningful transparency stays
   PNG regardless of content. Compositing onto a background is unavailable: there is a light _and_ a
   dark mode, and baking one in produces a logo visibly wrong in the other.
4. **Dimension is the lever that enforces the budget, not format.** Resize to **3× the maximum CSS
   width the logo can occupy, bounding the longest edge.** §6.2 fixes that width at 400 CSS px, so
   **the constant is 1200 px**. Note 3× does _not_ cover every phone: flagships reporting a
   device-pixel ratio of 3.5 want about 1330 physical pixels for a 380 px column and get 1200 —
   90% of the device's resolution. Whether that is visible on a wordmark is unmeasured and needs a
   device; §11 item 3 carries the arithmetic and the reasoning. **If it is visible, raise the
   constant, not the column** — §6.2's number is load-bearing for §5.2 and §7.6, and §6.5's budget
   absorbs the difference without noticing.
5. Store the result in `project.json` as `{ src, width, height }`.

**Why rasterise SVG rather than embed it.** The export is the artifact we make guarantees about.
Embedding SVG as a data URI puts owner-supplied markup where the invariant tests **cannot inspect
it** — asserting properties of a file we cannot examine. Inlining `<svg>` keeps it inspectable but
loses the browser's secure static mode, making our own sanitiser the security boundary, and requires
weakening invariant 2. **Rasterising sidesteps both: a raster data URI contains no markup at all.**

It is also **safe by construction rather than by correctness** — rasterising through `<img>`/canvas
places the SVG in the browser's secure static mode, where script and external references are forbidden
by spec and enforced by the engine. DOMPurify's SVG profile alone would be insufficient here; it
permits `<image>`, `<style>`, `<a>` and `style`.

What this gives up is resolution independence, and at 3× the observable loss rounds to nothing.

**Guard:** impose a size limit on the uploaded source file. Secure static mode stops scripts, not a
pathologically large or deeply nested document from hanging the tab.

**No WebP and no AVIF.** WebP's only advantage is bytes, and the budget has roughly 10× headroom for a
real logo — a 1024px wordmark with alpha is 6–15 KB in any sane format. WebP also cannot be encoded by
Safari on any platform or version, **and the canvas fallback is silent**: request an unsupported type
and you receive a PNG with no error, which is a bug that ships looking like it works. Since iOS never
gets WebP, the good branch would serve desktop owners and the fallback would serve the phone-first
users this product is built around. AVIF has no cross-browser canvas encode at all.

**Files we cannot decode.** PDF, AI and EPS — what a designer or sign-maker sends — can never be
decoded. HEIC is narrower than it looks: the platform that produces it is the platform that reads it,
so it only fails once moved off Apple hardware.

- **Decode-or-fail on whatever arrives.** No gating on MIME type or extension; both lie, and handing
  the file to the decoder is the only honest test.
- Message: _"We can't read that kind of file. A PNG, JPG or SVG works. If your logo came from a
  designer or sign-maker, ask them for a PNG."_
- **A failed input never damages what is already there.** If a logo exists and the new upload fails,
  the old one stays.

**When the result is worse.** Normalise always; **speak only when the logo will render visibly soft at
the size it is displayed.** Announcing a resize that lost nothing is noise, and it trains owners to
skip a message that will one day matter. Because of the headroom, this case almost only fires when
someone uploaded a photograph, so the message is not about compression:

> _We made your logo smaller so your page loads quickly on a phone._
> _Photos don't shrink as well as logos do — if you have a logo file, it'll look sharper._

In the common case there is **no message at all** — the logo appears in the preview, and that is the
feedback. **No numbers anywhere:** no KB, no percentages, and the word "compression" never appears.

**Alt text: `alt=""`, unconditionally.** `header.name` is required and always rendered as text beside
the logo, which makes the logo decorative in W3C's sense — everything it conveys is already available
as text. An `alt` field the owner fills is the worst option: _"describe your logo for screen readers"_
is a question they cannot answer well, and "logo" is worse than empty.

> **Dependency to preserve:** `alt=""` is correct _only while_ `header.name` is required and rendered.
> A future logo-only header makes the logo non-decorative and this must be revisited.

**Emit `width` and `height` on the `<img>`.** The builder knows both at normalisation time, it costs
about 20 bytes, and it prevents layout shift while the data URI decodes.

### 6.7 Provenance and determinism

**Provenance is an HTML comment and a `generator` meta tag, and no visible credit in any form.**

**Determinism is a stated guarantee: the same `project.json` produces a byte-identical `index.html`.
No timestamps.**

> **This is what rules `Intl` out of §2.5.** `Intl` reads no clock, so the "renders the same bytes on
> two different days" test would not catch it; its output tracks the host's ICU data instead, which
> is a dependency on the runtime rather than on the argument. The eight strings the renderer writes
> are vendored for that reason, and CI asserts that no `Intl` formatter is ever constructed.

> The guarantee attaches to the **renderer**, not the pipeline. Image encoding happens once, in the
> builder, at upload time, and its result is stored in `project.json`. By the time the renderer runs,
> the image is a string it was handed.

Consequently, **"same source logo → same file" is not a property this tool offers**: the same image
processed on iOS and on desktop Chrome yields different bytes. Making it true would require shipping
roughly 1 MB of WASM encoder to a business owner's phone — seven times the entire page budget — to buy
a reproducible-build property this product has no third party to observe.

**No round-trip payload in v1.** Embedding the project data in the exported HTML would double the logo
bytes past the budget, and retrieving a published file is harder than keeping the one you downloaded —
so it serves the user who never needed it. A comment payload stays addable later without breaking
existing exports.

### 6.8 Accessibility

The exported page claims **WCAG 2.2 AA by default**. "By default" is precise: the advanced tier (§3.4)
can be used to produce a page that does not, and it reports contrast rather than preventing it.

SC 3.1.1 is the criterion with a second half: `<html lang>` has to be **true**, which is why the
renderer's own eight words follow it rather than staying English underneath it (§2.5), and why the
page declares `<html dir>` from the same tag.

---

## 7. The builder

### 7.1 Two screens and the rule that joins them

**The flow is the empty state; the review list is the editing screen. They are the same product at two
moments.**

A new owner is walked through **one question per screen**, with the page filling in beside them. When
the questions run out they land on a **review list** — every answer a row, the page beside it — and
that list is where they live from then on. Coming back a month later opens the list, not the flow.

> **The flow re-enters for anything new; the list holds everything that already exists.**

The wizard is not a first-run device that never returns. It is the mechanism for _territory the owner
has not covered yet_. An owner who skipped opening hours and comes back to add them ticks the box, and
the flow picks them up and walks them through hours, then puts them back on the list.

That keeps one mental model instead of two: **you never face a blank field you weren't walked into.**
It also kills the failure the alternative would have shipped — a half-filled _Opening hours_ row
sitting on the list for a month because ticking a box and filling it in were two separate acts the
owner had to connect for themselves.

**A ticked-but-empty section is not a state that exists.**

### 7.2 The flow

Step one is the preset question (§7.3). After that, the flow asks for each thing the owner has not
covered. **Every step carries an always-present "not for us" escape.** Answer it and you have the
section; skip it and you don't.

**A run is planned once, when it is entered. Answering a question inside it never re-plans it.**

That sentence is here because its absence cost the product its central interaction. There are three
ways into the flow — a first run, an existing project resuming because a required field is missing
(§4.6), and a section ticked on from the list (§7.1) — and they plan different sequences. Which one
you are in is decided **on entry**, from the state at that moment, and then held. Answering the
business name creates the project, which makes a first run momentarily indistinguishable from a
resume; an implementation that re-derives the plan as the owner types will silently switch to the
narrower one and skip everything it had not yet asked. It is not a hypothetical: it shipped, and it
skipped the tagline, the logo, the link buttons and every section the preset had selected.

The rule this gives a test to write: assert the **sequence of questions** a run asks, not that it
terminates. A run that ends early terminates perfectly well.

**Two steps are the exception, and the exception follows from §4.6 rather than being a carve-out.**
The business name and the brand colour are the two required inputs (§3.1, §4.1), and §4.6 forbids
inventing either — a file missing `style.brand` is collected _by the flow_ precisely because
defaulting it would be worse. A step that must be answered cannot offer a way past it. Anyone later
tempted to make the escape truly universal should note that the skip would have to write something,
and there is nothing right to write.

**The flow also asks for the header's own fields — the tagline and the logo — which §7.3's preset
table does not cover**, because neither is a preset-selected section; they are header fields (§2.3).
They always run, and no preset selects them. Without them §7.1's promise that you never face a blank
field you weren't walked into would fail for the header, and the logo pipeline (§6.6) would have no
caller.

Required fields missing from an imported file are collected here (§4.6) rather than reported.

### 7.3 Presets

**Step one of the flow is _"What kind of business is this?"_** — not a gallery in front of it. A
pre-flow chooser is a decision made while knowing nothing about the tool and reads as a commitment; as
step one of the same one-question-per-screen sequence it is no heavier than "what's it called?".

**A preset selects which of the four optional section steps the flow runs, and which suggestions appear
on the link step. That is the whole mechanism.**

| Entry                                                          | Steps it runs                   | Buttons it suggests                            |
| -------------------------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| **Food & drink** _(café, restaurant, takeaway, bar)_           | hours, contact, address, social | See the menu · Order for pickup · Book a table |
| **Shop or venue** _(retail, gallery, gym, studio)_             | hours, contact, address, social | Shop online · What's on · Find us              |
| **Appointments** _(salon, barber, clinic, therapist)_          | hours, contact, address, social | Book an appointment · Prices · Our services    |
| **We come to you** _(plumber, electrician, gardener, cleaner)_ | contact, social                 | Get a quote · Call us · See our work           |
| **Online only** _(maker, creator, consultant)_                 | social                          | Shop · Subscribe · Get in touch                |
| **Something else**                                             | **all four**                    | none                                           |

**"We come to you" never asks for an address**, so a sole trader working from home does not publish
their home address because the flow asked and they answered. That is a decision an owner can plausibly
get _wrong_ unaided, and it is where a preset does something better than a well-labelled checkbox
rather than merely faster. Its cost is accepted: an owner on this preset who does have a shop front
adds the address from the list afterwards.

**Rule for growth:** a new entry earns its place only by running a different set of steps _or_
suggesting a different set of buttons. Otherwise it belongs as an example in an existing row's
subtitle — which is why those subtitles are load-bearing rather than decoration.

**What a preset never touches:**

- **The `style` block — not one field.** The style controls already carry a default, so presetting them
  saves zero clicks while spending the entire homogeneity cost; and the brand colour is a required
  question, so the page is never colourless regardless. _The preset knows about your business; "How it
  looks" knows about your brand._
- **Any word that is a claim about the business.** No tagline placeholder, no sample address, and
  specifically **no default opening hours** — a wrong fact the owner never notices we asserted is worse
  than an absent one.
- **The file.** There is no `preset` field (§4.1). A preset is an action, not a property, so two owners
  who reach the same page have byte-identical files whether one took a preset and the other ticked
  boxes by hand.

**Link buttons seed as a pick-list, never as pre-created rows.** One step asks _"which of these do you
have?"_ over the preset's suggestions plus a free _something else_; tap one and the next screen asks
for its URL. **A button exists only once it has a URL**, so nothing without a destination reaches the
list, the file, or the page.

**There is no confirmation screen** — each section's own step, with its escape, is the confirmation.

**One-time, and unreachable once you reach the list.** There is no "change business type" control.
Switching cannot be non-destructive (restaurant → salon means dropping hours that hold real typed
times), and everything it would buy, the list already does. The preset _is_ re-choosable while still
in the flow, since nothing is filled in yet.

### 7.4 The review list

Every answer is a row. The page sits beside it. Also on the list:

- **Download** (§7.7).
- **Import**, in the list's menu (§7.8).
- **How it looks** — the six style controls, with the **advanced disclosure and its contrast readout at
  the foot of that step**. Being last there means the owner has met the six controls before they meet
  the exit from them.
- Any field defaulted during a version upgrade (§4.3) appears here as an ordinary row.

### 7.5 Link buttons: arrows, and a marked top slot

Each button carries an **up and a down arrow. No drag-and-drop, in v1 or planned.**

Drag's advantage only appears at a length this list never reaches — it beats arrows when moving item 12
to position 3, and with four buttons "up, pressed twice" _is_ direct manipulation. Its failure mode is
precisely wrong for a phone-first editor: a finger dragging inside a scrolling column, the browser
guessing between "move this" and "scroll the page", guessing wrong, and the owner concluding the tool
is broken. Building drag properly means building the keyboard path anyway — two mechanisms where one
does.

**The first button is marked in the editor** as the one most people will tap. §2.3 dropped the
"featured" flag because position _is_ the emphasis mechanism — but that mechanism is invisible unless
the editor says so out loud.

### 7.6 Mobile

**Mobile editing is supported and first-class, and it is why this shape won.**

The preview is **not a pane**. It is a **full-width drawer the owner steps in and out of**: tap to
bring the page up over the whole screen, look, step back to the question. On a laptop the drawer has
room to sit open beside the question, so it does. **The same interaction at two sizes**, not a desktop
design with a mobile fallback.

What this deliberately gives up: on a narrow screen you cannot watch the page change _while_ you type.
Being one tap from the page is close enough, and pretending otherwise is what forces a desktop-only
builder.

**The preview is phone-shaped only.** The exported page is a single narrow column, so a "see it on a
laptop" toggle would show the identical page with more whitespace: a control that costs UI and teaches
nothing.

### 7.7 Download: one sheet, two sections

Pressing **Download** on the review list opens a sheet with two sections, in the order they happen:

> **Put your page online**
> This is your web page — `index.html`. Put it online and anyone can visit it.
> ⟨hosting guidance — §8⟩
>
> **Keep a copy of your work**
> This is your saved work — `adas-bakery.linkpage.json`. It's how you make changes later.
> Keep it somewhere safe: **if you lose it, you'd have to build your page again from scratch.**

**The organising idea is that your page is for the internet and your project file is for you.**

The project file shares this sheet rather than sitting in a menu because the risk worth designing
against is not two confusing downloads — it is that **the owner never downloads `project.json` at
all.** localStorage is not durable: cleared caches, a new phone, a browser reinstall. If the project
file is tucked away, most owners never meet it and _you own your file_ quietly becomes false. The
Download sheet is the one place they reliably go.

Two adjacent buttons on the list was rejected as the worst version of the two-files problem: the whole
distinction would rest on two short labels read at a glance, with no room for the sentence that
actually does the work.

**Project file naming:** `⟨business-name⟩.linkpage.json`, slugified, falling back to `linkpage.json`
when there is no name yet. It is identifiable in a downloads folder where `index.html` is anonymous,
and the double extension quietly says what opens it. Import validates by content, not filename.

**The editing screen does not track "downloaded" versus "changed since".** With no backend the file
goes stale the moment the owner edits again, and a badge would catch that — but it loses because it is
a nagging state on a screen this design keeps calm, and because it is wrong for every owner who
exports, decides they hate it, and never uploads. **Download is a button you press when you want a
file. The tool knows nothing about your host and will not imply it does.**

### 7.8 Opening a project you already have

**The first screen when localStorage is empty is the preset question, with one quiet line beneath it:**

> _Already have a project file? Open it._

A statement, not a question — it adds an exit to the screen without adding a decision to it. **The
person with a file arrives knowing they have one** and is scanning for the way in; someone starting
fresh has no reason to look and reads past it. The line opens the OS file picker **directly**; an
intermediate "import a project" screen would be a screen whose only content is a button.

A fork screen — _start fresh or open a file?_ — was rejected for the same reason a pre-flow preset
gallery was: a decision shown before the tool has demonstrated anything reads as a commitment, and this
one would spend a whole screen on the minority.

Once you are in, **import lives in the review list's menu**, not the Download sheet. The sheet is where
things leave; import is the one action that can destroy what is there.

**Import always replaces. It never merges.** Merge has no coherent intent behind a one-page file:
whose name wins, do the buttons concatenate, which hours are real.

- **Empty localStorage → opens immediately, no confirmation.** Nothing is at risk.
- **An existing project → confirm concretely:** _"You're working on **Ada's Bakery**. Opening this file
  will replace it."_ Naming it is what makes the confirmation informative rather than a reflex.
- **The confirmation offers to download the outgoing project first.** This is the part that matters: it
  turns a warning into a fork where both paths are safe.
- Any non-empty project counts as something to lose, including one holding only a typed name.

**No undo** — localStorage holds one project, so undo means inventing a second slot and a lifetime for
it, for a case the download-first escape already covers. **No silent auto-download** of the outgoing
project either: same preservation without consent.

### 7.9 Where failures appear

**In place, attached to the control that opened the picker. Never a modal, never a navigation.**

The existing project is untouched when an import fails (§4.6), so there is nothing to restore. And
_try a different file_ is overwhelmingly the next action — they grabbed the wrong download, or picked
`index.html` instead of the project file. A modal makes recovery _dismiss → re-find the control →
re-open the picker_; in place makes it _pick again_.

- **First screen** — the message appears under the quiet line, the preset question above it untouched.
- **The list's menu** — the message appears in the menu's own surface, the project intact behind it.
- **Missing required fields produce no error surface at all** (§4.6).

---

## 8. Getting the page online

**This section is deliberately incomplete in v1 of this spec.** The walkthrough copy is deferred; what
follows is what is established and may be relied upon.

**Structure is settled** (§7.7): the guidance is section one of the Download sheet, above the project
file.

**What research established:**

- **A single dropped `index.html` is accepted by at least one major drop-style host.** This was
  determined by reading shipped uploader code and **contradicts that host's own prose documentation**,
  so it is undocumented behaviour that can be withdrawn without notice. Treat it as fragile.
- **Two obvious hosts are disqualified on licence terms rather than capability.** One free tier is
  non-commercial only with a definition that explicitly covers advertising a service; another forbids
  using it "to run your online business". Both exclude exactly this product's users. Note the
  asymmetry: the same host may be perfectly legitimate for hosting _the builder_.
- **"Send it to your web person" is a first-class route**, not an afterthought — many small businesses
  have someone who does their website.
- **Shared links will preview as text** (§6.4), and owners should be told so rather than surprised.

**What must not be written until it has been walked:** step-by-step instructions. The two questions
that set the step count — whether a logged-out drop yields a publicly viewable URL, and whether the
path works at all on a phone — are unverified. Writing verified-sounding steps from documentation
alone is the specific failure this section exists to avoid, and the second question matters
disproportionately: **§7.6 makes mobile editing first-class, so a broken mobile path would walk owners
to a dead end.**

---

## 9. Non-goals

Ruled out on purpose. The first contributor to ask "why not?" has a written answer here.

| Not doing                                   | Why                                                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Click analytics, visitor tracking**       | Needs a backend to record events. Whether a paste-your-own-snippet field is acceptable is deliberately left undecided rather than pulled in. |
| **Contact and lead-capture forms**          | A form POST needs a server. `mailto:` and `tel:` links in the contact section are the substitute.                                            |
| **Custom domain setup**                     | DNS is owned by whichever host the owner picks, not by an export tool. May survive only as a link in the walkthrough.                        |
| **Multi-page sites**                        | This is the line between a link page and a website builder. One page, one file, one export.                                                  |
| **Reordering sections**                     | §2.1. Additive later if ever wanted.                                                                                                         |
| **Drag-and-drop button reordering**         | §7.5.                                                                                                                                        |
| **A "featured" link flag**                  | §2.3 — position is the emphasis mechanism.                                                                                                   |
| **An announcement banner**                  | §2.2 — the update model is wrong for time-sensitive content.                                                                                 |
| **Icon or image uploads for links**         | §2.4.                                                                                                                                        |
| **Publishing on the owner's behalf**        | Constraint 6. There is no backend to publish from.                                                                                           |
| **Tracking whether the file was uploaded**  | §7.7.                                                                                                                                        |
| **Editing directly on the previewed page**  | §5.2 — it costs the preview-is-the-export guarantee.                                                                                         |
| **WebP / AVIF export**                      | §6.6.                                                                                                                                        |
| **Round-trip payload in the exported HTML** | §6.7.                                                                                                                                        |
| **Publishing the renderer to npm**          | Not in v1.                                                                                                                                   |

---

## 10. Deferred past v1

- **The hosting walkthrough copy** — §8.
- **A QR code for the finished page.** Small businesses want a printable code for the counter. A QR
  code can only be made once the owner has a web address, and the tool never learns it (§7.7) — so the
  feature would require the owner to return and paste their address in, which is the interaction this
  audience is worst at. That points at one sentence in the walkthrough — _once you have your address,
  any free QR generator will do_ — or nothing at all.
- **A "did it work?" affordance.** The tool cannot verify an upload — no backend, cross-origin. The
  sheet could offer a plain field to paste an address and open it in a new tab: purely client-side,
  remembering nothing, so it does not violate §7.7's no-state decision, and it gives the owner the one
  confirmation they actually want.
- **A services-and-prices section** — a real small-business need with its own design tree (§2.2).
- **Fixing the `<image href>` gap in invariant 2** — §5.3. Not reachable from anything v1 generates.

---

## 11. To verify during implementation

These are facts the design depends on that were reasoned about but not measured. None of them changes
a decision above; each could change a constant or a code path.

**Four of them were taken up when the logo pipeline was built (#31), and the findings are recorded
under each.** They are labelled **measured** or **reasoned**, and the labels are load-bearing: the
work was done headless, with no browser and no device, so nothing that needs one was run. A finding
written in the register of a measurement that was not taken is worse than no finding, because the next
person stops looking.

1. **The iOS `accept` behaviour.** Whether a restrictive `accept` list causes the iOS photo library to
   hand over a JPEG rather than a HEIC, and under which value. §6.6 assumes it helps; it is a hint
   either way, since "All files" is always one tap away.

   > **Reasoned, not measured — no iOS device was available.** The documented platform behaviour is
   > that a photo-library item is transcoded to JPEG on the way out unless the page's `accept` names
   > a HEIC media type, and that a file reached through _Browse_ rather than _Photo Library_ is handed
   > over untouched. Both point the same way: the explicit list is worth keeping and is worth **not**
   > naming HEIC in.
   >
   > **What did change is that `accept` now carries media types only, and no file extensions.** The
   > usual advice is to list both. On iOS an `accept` containing extensions has been reported to
   > disable the Photo Library option outright, and on a phone-first product that is not a degraded
   > picker, it is the picker. §6.6's stated benefit — greying a designer's `.ai` out on desktop — is
   > delivered by the media types alone.
   >
   > **The consequence of being wrong is bounded, which is why this stayed a hint.** iOS can decode
   > HEIC in an `<img>`, so a HEIC that arrives on an iPhone rasterises normally; §6.6's decode-or-fail
   > path already covers the same file arriving anywhere else. **Still to check on a device:** whether
   > the Photo Library option survives this list, which is the one failure that would be silent.

2. **The flat-vs-photo heuristic's reliability.** §6.6. If unique-colour counting proves flaky, the
   honest retreat is **PNG-only plus aggressive resizing** — simpler, no detection, correct for every
   logo that is actually a logo, and wrong only for the photograph case.

   > **Measured. The retreat was not taken — but §6.6's stated reason for the heuristic is wrong, and
   > the real one is different.**
   >
   > 205 images were classified by the shipped counting code: 35 photographs, 6 wordmarks set in 3
   > faces and delivered 8 ways each (PNG, JPEG at q72 and q40, on white, on transparency, with a drop
   > shadow, over a full-frame gradient, and blurred-and-speckled to imitate a photographed sign), 40
   > SVG logos rasterised at the constant both flattened and transparent, and 30 icon files. The
   > corpus and the sampler were assembled for the purpose and run in Node, **not in a browser**: what
   > this measures is the statistic and its thresholds, not a canvas.
   >
   > **§6.6 says "wordmarks have tens, photographs have thousands". Half of that is true.** Wordmarks
   > measured 29–510 distinct colours in a 64 × 64 point sample, across every provocation above.
   > Photographs measured 523–3844 — hundreds, often, and not thousands. **The two classes overlap**,
   > and what sits in the overlap is not a wordmark: it is detailed illustration flattened onto white,
   > for which JPEG at this size is a defensible encoding anyway.
   >
   > So the heuristic survives on an asymmetry rather than on a gap. At a threshold of **1200**, 5 of
   > 135 opaque flat images were sent to JPEG — every one of them an illustration, never a wordmark —
   > and 3 of 35 photographs were sent to PNG. **The error that a reader can see, ringing around
   > crisp type, did not occur once, with a margin of better than two to one at the worst.** The error
   > that does occur costs bytes, which §6.5 absorbs by resizing, and which the retreat would have
   > cost on _every_ photograph rather than on a twelfth of them. Detection is therefore strictly
   > better than the retreat here, not merely defensible.
   >
   > Two parameters came out the opposite way round from the obvious guess, both measured:
   >
   > - **Quantising the colour before counting makes the separation worse.** Five bits per channel —
   >   the obvious defence against a resampler inventing colours along an antialiased edge — collapses
   >   a low-key photograph (a rose, a sunset, an overcast street) into a handful of buckets far
   >   faster than it collapses an edge. Counting at full depth separates the classes best.
   > - **The sample must be drawn without smoothing, and 64 × 64 beats 128 × 128.** An averaging
   >   resampler invents colours along every edge and loses them in the middle of a photograph, moving
   >   both classes toward each other.
   >
   > **What was not measured:** a browser canvas's own downscaling, which is what the sample is drawn
   > with in production and which is not identical to the sampler used here; and a corpus of real
   > small-business logos, which does not exist to hand. The wordmark margin is wide enough that
   > neither seems likely to move the answer, and both would move it in a direction the threshold's
   > placement already allows for.

3. **Whether 3× is enough at the highest device-pixel ratios.** The column is now pinned (§6.2) and
   the logo constant with it: **1200 px on the longest edge**. §6.6 claims 3× covers every phone
   shipping today, and the case to check is the Android flagships running a device-pixel ratio of
   3.5 — a 380 px column there asks for about 1330 physical pixels, and 1200 is short of it. If the
   softness is visible on a wordmark, **the honest fix is to raise the constant, not the column**:
   §6.2's number is load-bearing for §5.2 and §7.6, and §6.5's budget has the headroom.

   > **Half measured, half not — and the half that matters is the half nobody can settle without a
   > phone.**
   >
   > **§6.6's claim that "3× covers every phone shipping today" is false, and this is arithmetic
   > rather than opinion.** A device-pixel ratio of 3.5 is what the Pixel Pro line and the Galaxy S
   > Ultra line at full resolution report, so a 1200 px raster is short of the device's pixels
   > wherever the column is wider than 1200 ÷ 3.5 = **343 CSS px** — which is every phone the column
   > was sized for. On a 412 px viewport with a 16 px gutter each side the column is 380 px, wants
   > 1330 physical pixels, and gets 1200: **90% of the device's resolution, an upscale of about 11%.**
   >
   > **Whether 11% is visible on a wordmark was not measured and cannot be, headless.** The reasoning
   > that says it is not: at 3.16 raster pixels per CSS pixel the logo still resolves past roughly 450
   > ppi on such a screen, well beyond where the eye stops resolving at reading distance. That is a
   > reasoned estimate and is written here as one.
   >
   > **The cost of removing the question entirely is small enough to record.** 1400 px is 3.5 × 400
   > and 1.36× the pixel count, which on a real wordmark is single-digit kilobytes against §6.5's
   > ~120 KB line — the budget cannot feel it. **This was not done**, because the constant appears in
   > §6.6 and again in §6.2 as a confirmed number and moving it is a spec change rather than an
   > implementation detail. It is a one-token change in the builder, where the constant is written as
   > the column times a density rather than as 1200.
   >
   > The second-order case §6.2 already records — a reader who has raised their default text size gets
   > a proportionally wider column while the constant stays derived from the default root — compounds
   > with this one rather than being separate from it.

4. **Real encode and decode timing** for a large image on a genuinely low-end Android and an older
   iPhone. No trustworthy data was found, and none is assumed above.

5. **The iOS canvas-area ceiling** and its silent-empty-result behaviour, which bounds how large a
   source image can be decoded before resizing.

   > **The ceiling itself: reasoned. The response to it: implemented and tested.**
   >
   > The figure in circulation for modern iOS is about 16.7 million pixels of canvas backing store,
   > with the failure being a canvas that stays transparent and a `drawImage` that returns normally.
   > No device was available to confirm either the number or the behaviour.
   >
   > **What can be stated without a device is that the pipeline never approaches it.** It draws
   > exactly twice — once at 64 × 64 to look at the content, once at the output size — and the output
   > is bounded by the constant, so the largest canvas it ever allocates is 1200 × 1200 ≈ 1.4
   > megapixels, better than ten times under the figure above. **The ceiling therefore binds on
   > decoding the source, not on anything this code allocates**, which is a different limit and one
   > the source-file size guard (§6.6) is the lever on.
   >
   > **The silent-empty-result behaviour is handled by construction rather than by staying under a
   > number.** Every draw is read back and checked for having drawn nothing before it is encoded; a
   > blank result at the output size halves the size and retries, and a blank result at 64 × 64 —
   > where no ceiling can plausibly bind — is reported as a file we cannot read. The recovery is
   > exercised by unit tests against a decoder that fails exactly this way. It is worth noting that
   > this is the one guard here that costs something on every upload: a full pixel read-back per
   > draw, which is also item 4's territory.

6. **The final icon and social-platform lists.** ~~The mechanism is decided (§2.4); the contents are
   transcription.~~ **Settled** — both lists are enumerated in §2.4, along with the membership rule
   that keeps them honest: a glyph earns its place only by serving a preset suggestion in §7.3, and
   that is asserted in both directions, so an unserved suggestion and an unused glyph each fail the
   build.

---

## 12. Provenance

Every decision in this document was made in a wayfinder effort recorded on this repository's issue
tracker. The [map](../../issues/1) indexes them, and each decision's full reasoning — including the
options rejected and why — lives on its own closed issue. Where this spec says "was rejected", the
argument is there.

This document is the destination of that effort. Implementation is a separate effort that starts here.
