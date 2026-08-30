# linkpage v1 — specification

This document is the complete design for linkpage v1. It is written so that someone who has never
seen the project can implement it without asking a question. Where a decision looks arbitrary, the
reasoning is given — not as history, but because the reasoning is usually the thing that stops an
implementer from "improving" it into something that breaks a guarantee elsewhere.

**Status:** built and released as `v1.0.0`. Every decision here is settled and every one of them is
implemented — the build order that did it is indexed in §12 alongside the efforts that decided it. The
[deferred](#10-deferred-past-v1) and [to verify](#11-to-verify-during-implementation) sections at the
end are the only places where anything is open, and both are explicit about it.

**§11 is the one to read before trusting this number.** A tag says the work is done, not that every
assumption under it has been checked, and §11 lists what has not: most of it needs a real phone, which
is the device §7.6 calls the primary case.

**The title says v1 because the tag does.** This document was amended after the beta by a second
wayfinder effort (§12), and whether to retitle it was asked rather than assumed: what the beta released
was a pre-release _of v1_, so the version being described never changed and neither did its name. **The
tool's version and `project.json`'s `version` (§4.2) are different numbers with different rules and
must never be moved together.** There is no changelog section, deliberately — the amendments are
indexed in §12, and each decision's reasoning travels with the decision itself, in place, for the same
reason this document gives its reasons at all.

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

**Links.** A link is a **label, a URL, and optionally an icon** — nothing else. What the URL has to look
like, and what happens when it does not, is _Derived targets_ below.

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

Times are stored as 24-hour `"HH:MM"`. `clock` and `weekStart` are display preferences, **seeded once
from the browser at first run and then stored**, exactly as `lang` is (§4.1). _Seeded_ rather than
_asserted_ is why §7.3's no-defaulted-facts rule permits it: neither is a claim about the business.

**Runs are never collapsed.** "Mon–Fri 9–5" does not appear on the exported page, and that is a decided
refusal rather than a deferral. A shop open weekdays gets five rows; a corner shop open every day gets
seven identical ones. **The reason is not that collapsing is hard — it is that nobody has ever
complained about these rows.** Hours _entry_ was measured, found wanting, and fixed (§7.10); the page's
hours block produced no finding at all. Collapsing buys about 110 px on a phone and costs a permanent
synthesis step in the one component that must never state an opening time the business does not keep.
**This is the mirror of §7.10: entry moved on measurement, display stays put on the absence of it.**
Reopened by a real complaint from someone reading an exported page, and not by a new capability — the
data to do it has been available all along.

> **The four hazards are all answerable, and the dispatching rule is recorded here so that the refusal
> is not overturned by someone rediscovering that it is possible.** Compute runs in _display_ order and
> the `weekStart` wrap disappears. Require every day in a run to be _present_ and an unspecified day can
> never sit inside one. Require an **identical formatted interval list** and both the multi-interval
> mismatch and the closed-day-inside-a-run disappear at once, because an empty list never equals a
> non-empty one. Minimum run length 3. **Correctness was never the obstacle**, which is exactly why the
> reason above has to be the one on record.

**The builder's review row no longer shows the times at all** (§7.4). It did, uncollapsed, and the
argument that kept it uncollapsed has not changed — it has stopped reaching. `Mon–Fri` would have cost
nothing there (the builder has no localisation layer, no §6.5 budget and no determinism guarantee, §3.1)
and was refused on **adjacency**: the page preview sits beside the list, so `Mon–Fri` in the row against
five rows in the preview reads as the page being broken. That objection is about a **smaller copy** of
the block next door. The row now reads _Open 7 days_, which is a description rather than a copy — no
more a version of the hours block than `1200 × 400` is a version of the logo — so nothing in the preview
contradicts it. **The refusal above, about the page, is untouched.**

The seven weekday abbreviations and the word for a closed day are **eight of the ten translatable
words the page writes** — the other two are the hidden names §6.9 gives this panel and the address
link — and they are written in the page's own language, see §2.5.

**Contact.** Phone and email, rendered as `tel:` and `mailto:` links — see _Derived targets_ below for
what reaches the link and what happens when nothing can.

**Address.** **Free-text lines plus an optional directions URL** — not structured street/city/region/
postcode. Structured fields are what a developer reaches for and they are a localisation trap: a UK
florist filling in "state", a Japanese owner facing "street address". The owner types their address
the way they would write it on an envelope. Nothing in this project reads the address as data, so
structure buys nothing and costs comprehensibility.

The `directionsUrl` matters because an embedded map is forbidden by the no-external-subresources
invariant (§5.3) — a link out is the only remaining answer to "where are you". It is one of the three
URL fields governed by _Derived targets_ below.

**Social.** A platform identifier and a URL. The platform selects a brand icon.

#### Derived targets

**Five fields are the owner's text plus a machine target derived from it**: the contact phone (`tel:`),
the contact email (`mailto:`), a link button's URL, `address.directionsUrl`, and a social URL. The
renderer already worked this way for one of them — `0161 496 0000` renders inside
`<a href="tel:01614960000">` with the typed spacing left on the page — so what follows closes an
inconsistency rather than adding a capability.

**Where the mend lives split in two at §7.9 decision 4 (#142).** For **phone**, the original position
holds in full: the text is the owner's and is never rewritten, the target is mended silently at render
time, nothing derived is ever stored, and a later builder that gets cleverer re-derives from the
owner's original. A number is written the way a local reader expects to see it, and showing our
normalisation would be showing our results rather than the owner's intent. For **the four URL and
email fields**, the builder now stores the _mended_ value — `mysite.com` commits as
`https://mysite.com`, an email's spaces are stripped — because §7.9's amended decision 4 requires the
correction to be visible where the owner typed it rather than met for the first time on the exported
page. The mend functions live in the renderer beside their href siblings so the builder and the page
cannot disagree; what cannot be mended stores as typed, and §7.9's mark still points at it. **§4 gains
no field for any of this** — the stored string is still the only string, mended or not — and §4.4's
_preserve anything the owner typed_ now reads _preserve, or mend visibly and store the mend_ for
exactly these four fields and no others.

**Where no target can be derived there is no link — and what happens next differs by field, because
the fields are not the same kind of thing.**

- **The contact rows keep their text.** A phone number or an address is _information_: it reads
  correctly on the page and a visitor can act on it by hand, so only the tap-to-call or tap-to-mail is
  withheld.
- **A link button and a social entry are omitted from the page entirely**, which is §7.3's existing rule
  — _a button exists only once it has a URL_ — reaching a case it did not previously have. **These two
  are pure affordance**: a labelled thing whose only content is that it goes somewhere. Rendering one
  that goes nowhere puts a lie on the owner's page rather than an inconvenience.

**That second bullet has a real cost and it is stated rather than buried: the owner's button disappears
from their published page until they fix it.** Before the derivation rule existed, a broken button at
least still appeared. What makes the trade acceptable is that the disappearance is never silent _to the
owner_ — §7.4 marks the row and §7.7 says so before they publish — while a dead button is silent to
every _visitor_ who taps it. **The owner can be told; the visitor cannot.**

What the owner is told, and where, is §7.9.

**The phone rule is four clauses, and no country is ever learned, inferred or asked for.**

1. Allowed characters are digits, space, `(`, `)`, `-`, `.`, and `+` **leading only**.
2. Any other character → no target.
3. A parenthesised `(0)` directly after a leading `+CC` is dropped. That is reading the owner's own
   notation rather than guessing at a trunk prefix — they supplied the country themselves.
4. Fewer than 4 or more than 15 digits → no target.

> **Why no country.** `lang` does carry a region, and §4.1 establishes that a wrong region is _harmless_
> today — so making the phone depend on it would make a wrong region **harmful**. A Manchester baker on a
> US-configured laptop is tagged `en-US`, never chose it, cannot see it, and would be read as `+1`.
> Asking outright spends a screen (§7.2) on §2.3's structured-address trap in another costume. A
> phone-metadata library is ruled out by the same decision rather than by its size: its useful entry
> points need a default region, so without one it says nothing at all about `020 7123 4567` — and it
> would be this project's first non-React runtime dependency.
>
> **Four of the six notations businesses actually print were broken without these clauses**, which is why
> a rule this small earns its place: `+44 (0)161 496 0000` produced a dead target (the trunk `0` kept
> inside a `+44` number), `020 7123 4567 ext 12` and two numbers typed in one box dialled _wrong_
> numbers, and `0800 CHICKEN` became `tel:0800` — a dialable wrong number rather than a visibly dead one.
> The caution against guessing at trunk prefixes produced exactly the outcome it was avoiding.
>
> **The limit, stated rather than buried: nothing merely mistyped is caught.** `07700 90012`, a digit
> short, still links. Catching that needs the country we have just declined. Extensions, vanity numbers
> and second numbers survive on the page untouched; they simply do not dial.

**The URL rule is one rule for all three URL fields**, written once here rather than left to three call
sites. A value that already carries a scheme is untouched. For a value with **no** scheme: take
everything before the first `/`, `?` or `#`; prepend `https://` **only if** that part is non-empty,
contains a dot, and contains no `@` and no whitespace. Otherwise there is no target.

> **The gate is the whole rule**, and testing the reflex is what put it there. A naive prepend does not
> produce dead links, it produces confident links to the _wrong host_: `/menu` becomes `https://menu/`,
> inventing a hostname out of a real relative path, and `@mybakery` becomes `https://mybakery/`. Today
> `/menu` at least 404s on the owner's own site; a naive mend sends the visitor somewhere else entirely.
>
> **`https://` unconditionally, because we cannot tell.** A builder-side probe is opaque under CORS, and
> `https://` is what a browser itself tries on a bare domain. The escape is that the mend fires **only**
> where there is no scheme, so an http-only owner types `http://` and is left alone.
>
> **Two implementation choices that are decisions rather than details.** It is a **string prepend, not
> `new URL`** — `new URL` normalises, adding a trailing slash and percent-encoding, which rewrites the
> owner's target and is the class §6.7 is wariest of. And it lives **beside `safeUrl`, not inside it**:
> that name is exported and promises _safe_, not _mended_.
>
> **No host-specific exceptions.** Matching known social hosts in order to turn a handle into a URL was
> rejected because it fires hardest on correctly-pasted addresses — `wa.me` is right for WhatsApp and
> `youtu.be` for YouTube.
>
> **A handle never becomes a URL**, and the platforms are the argument rather than the maintenance cost:
> _handle_ is not one concept. **Mastodon is federated**, so `@user@instance.social` has no derivable
> host; **WhatsApp's URL takes a phone number**; **Bluesky handles are themselves domains**; and **X's
> host changed** from `twitter.com`. A template table would go stale silently, and stale means a 404.
>
> **The limit, stated rather than buried:** `mybakery.couk` mends into a confident link to a domain that
> does not exist, and nothing available to us can tell.

**The email floor** is one `@`, non-empty either side, no whitespace, no control characters, and at
least one dot after the `@`. **Recorded as a floor**, so that the next reader does not tighten it toward
RFC 5322. It is looser in charset than an ASCII-only test, because such a test **rejects real
addresses** — `josé@café.fr` is one — and identical in structure. **The whitespace clause is
load-bearing**: a `mailto:` target does not pass through `safeUrl`, which makes it the one URL in the
document with no scheme check behind it.

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

**Matching an identifier ignores case and surrounding space; storing it does not.** The owner types
this field, and the builder offers the ten as completions whose _label_ reads `Instagram` while the
value behind it is `instagram` — so an owner who types what the list shows them must reach the same
mark as one who clicks it. `project.json` still holds what they typed, per §4.4: the loose match is a
read-time resolution, not a rewrite. A form that matches nothing is unchanged — it keeps its URL and
takes the generic glyph — so this widens what is recognised without narrowing what is kept.

**LinkedIn is absent, and not by preference:** Simple Icons removed the mark at LinkedIn's request,
and a source that still carries it would carry the attribution obligation this section exists to
avoid. A LinkedIn URL renders with the generic glyph — the same path every unnamed platform takes,
which is the useful proof that the path works.

**An entry with no mark shows its name; an entry with a mark does not.** A row of marks identifies
each entry _by_ its mark, so an entry without one has nothing identifying it — and two of them are
two identical chain-links side by side with nothing to tell them apart. Assistive technology was
never affected, because the accessible name is real text either way; this is the sighted reader
getting what a screen reader already had.

The name costs nothing to show: it is already computed for the accessible name, and a platform name
is a proper noun, so unlike §2.5's vocabulary it needs no translation. **The asymmetry is
information rather than untidiness** — a labelled entry is one we have no mark for, which is exactly
what the owner is looking at. LinkedIn makes this routine rather than hypothetical, since it is a
platform a consultant or tradesperson plausibly publishes.

**A glyph earns its place in one of two ways, and both are named.** Almost every generic glyph earns it
by serving a preset suggestion in §7.3 — asserted in both directions, so an unserved suggestion and an
unused glyph each fail the build. **Two do a different job and are listed as exceptions rather than
counted:** the generic `link` glyph is §4.4's fallback for a platform we have no mark for, and the
`clock` glyph **names the hours panel on the exported page** (§6.9) — work no suggestion could justify,
because it is the job a heading would do, and the heading §2.5 now spends a word on is visually
hidden (§6.9), so the glyph is still the only thing naming that panel on screen. A third exception is
a change to this section.

**Growth rule.** A new platform earns a mark by being one a small business plausibly publishes, and
costs nothing else: adding one is additive, never a version bump (§4.8), and removing one degrades to
the fallback rather than dropping the link. A new _generic_ glyph earns its place only by serving a
preset suggestion, so the set grows when §7.3 does and not otherwise.

### 2.5 The words the page writes

The page declares `<html lang>` from the owner's `lang` (§4.1) because WCAG 2.2 SC 3.1.1 asks for it
and because the content is the owner's own words. **The renderer then writes ten words of its own:
the seven weekday abbreviations, the word for a closed day, and the words for _opening hours_ and
_directions_ that name the hours panel and the address link to assistive technology (§6.9).** They
must be in the language the page declares, or the declaration is not true — a Cardiff bakery shipping
`lang="cy"` alongside `Mon`, `Tue` and `Closed` has told a Welsh screen reader to pronounce English
abbreviations with Welsh phonetics, and the declaration is what we asked assistive technology to
trust.

**Ten strings is the whole translatable surface, by design rather than by luck.** §2.3 made the
address free text, and the contact rows are identified by a glyph rather than by the word "Phone" —
a phone number and an email address say what they are. Nothing else on the exported page is our
prose, and a change that adds an eleventh string is a change to this section.

**Two of the ten are new, and they were bought rather than found.** For most of this project the
count was eight, and §6.9 refused a ninth on the ground that a hidden word is still a word the
renderer writes. That refusal was priced by analogy to a glyph and the analogy was wrong — a word
carries no `<svg>` wrapper — so the two words are in, and §6.9 records the reversal. **They are
hand-authored, like the closed word and unlike the CLDR abbreviations**, which is the cost the
decision actually paid: the un-citable half of this table more than doubles, from **42 hand-written
words to 126**. Every one of them can only ever be checked by someone who speaks the language.

**One correction, because this section claimed more than was true.** On a 12-hour page the renderer also
writes `AM` and `PM`. They are built as literals in the time formatter and are carried by no vocabulary,
so a Welsh page has always read `9:00 AM`. **They stay English, on CLDR's own evidence rather than on
convenience.** ICU prints `AM` for Welsh, French, German, Hebrew and Polish — English `AM` on a Welsh
page is what the reference data itself produces. And the languages that _do_ translate the meridiem
**move** it: `ja` and `zh` render `午前9:00` with the period in front, and `ar` and `he` read right to
left. So translating it is not two more rows in a table; it is a per-language _pattern_ plus a direction,
against a formatter whose shape is fixed. Forcing 24-hour on languages that do not use a meridiem was
rejected as worse than an English word — it silently overrides an owner who deliberately chose _9:00am_
on _How it looks_.

So the accurate claim is this: **ten strings are the translatable surface, and the meridiem is a
deliberate English constant outside it.** The ten are what the growth rule below governs.

**The growth rule has now been tested in both directions, and both are worth recording.** The meridiem is
the rule _failing_ — a string reached the page without this section noticing. A day-range pattern for
collapsed hours rows is the rule _holding_: it was proposed, and §2.3 refused to collapse for reasons
that had nothing to do with the string. Note that the string was never the obstacle there either.
**CLDR ships weekday-range patterns per locale** — `月～金` unspaced, `월 ~ 금` spaced, `ma–pe`,
`จ. - ศ.` — so a day range would have been the _first_ kind of string below, pinned and checkable against
a version number, not the second. §2.3's refusal rests on the absence of a complaint, and this section
gains nothing either way.

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
- **The other three are not CLDR fields.** No locale database holds the word a shop puts on its
  door, nor the words it would head its own opening hours with or put on a link to directions, so
  each one is hand-authored. **That asymmetry is the table's weak point and it is stated rather than
  hidden:** an abbreviation can be checked against a version number, and a hand-written word can only
  be checked by someone who speaks the language. **The two words §6.9 bought make that half of the
  table three times the size it was** — 126 hand-written words against 42 — and the growth rule below
  is where that cost is paid, one language at a time.

#### Growth rule

A language earns a place when all four halves are answerable: CLDR ships abbreviated weekday names
for it, **and** someone can name the three words a business in that language writes for itself — the
one it puts on its own opening hours for a day it is shut, the one it would **head those hours
with**, and the one it would put on a link to **directions**. The last two are the halves §6.9's
reversal added, and they are answered the same way as the first: by a speaker, not by a version
number. The set is the languages the repository could answer all four for; it is not a claim about
which languages matter.

- Adding a language is **additive and never a version bump** (§4.8). `project.json` does not change
  shape, and an older reader of the same file renders English.
- **A correction is not a version bump either.** A speaker saying "that is not the word" is the
  highest-quality evidence this table can receive, and `CONTRIBUTING.md` asks for it by name. This is
  the one part of the renderer that is explicitly provisional.
- **An unknown language degrades to English, never to a failure and never to a guess.** English
  abbreviations on a Welsh page are a visible limitation; the wrong word in the owner's own language
  is worse than the honest foreign one. **The rule stands unchanged for the two hidden words, with
  one addition it now needs:** they are not on screen, so the limitation is no longer visible, and an
  unmarked English word inside a `lang="cy"` page is read by a Welsh voice with Welsh phonetics —
  #48's bug with nothing to reveal it. A fallen-back **hidden** word therefore carries
  `lang="en"`, which is what keeps the declaration true rather than what replaces this rule. The
  visible ones do not, and that is the same rule rather than an exception to it: the limitation
  shows itself on the glass, which is what this bullet has always rested on.

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

| Control             | Values                                                                               |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Main colour**     | required — picked from a field of **twelve named colours**, or typed as an exact hex |
| **Second colour**   | optional, encouraged                                                                 |
| **Shape**           | `centred` \| `colourBlock` \| `floatingCard` \| `ruledLeft`                          |
| **Type pairing**    | `classic` \| `modern` \| `friendly`                                                  |
| **Corner softness** | slider, 0 (sharp) … 1 (rounded)                                                      |
| **Light / dark**    | `light` \| `dark`                                                                    |

Those six are unconditional: every page has them, and they are what _How it looks_ opens with.

#### The twelve are named, and a typed hex is quoted back

|                       |                         |                      |                      |
| --------------------- | ----------------------- | -------------------- | -------------------- |
| `#b0122f` **Crimson** | `#c2185b` **Raspberry** | `#7b1fa2` **Grape**  | `#4527a0` **Violet** |
| `#1565c0` **Cobalt**  | `#00695c` **Teal**      | `#2e7d32` **Forest** | `#556b2f` **Olive**  |
| `#a05a00` **Amber**   | `#bf360c` **Rust**      | `#5d4037` **Cocoa**  | `#37474f` **Slate**  |

**Naming our own palette is a curated claim we can check; naming the owner's colour is asserting
something about their brand.** That is §7.3's rule — a wrong fact the owner never notices we asserted —
at its sharpest, on the most personal decision on the page: telling a bakery that their `#5d4037` is
"muted orange" when they call it brown is exactly that. So **we name what we chose and quote back what
they chose**, which lands on doctrine already written. §3.3 honours a typed hex exactly, and the review
row reports the owner's answer rather than the derivation's version of it (§7.4).

**Computing the names was tried before it was rejected, and the trial is the argument.** The OKLCH
conversion already exists and its hue is perceptually uniform, so the machinery was there and the colour
space was the right one. An untuned hue-bucket pass over these twelve calls `#b0122f` _orange_ and
`#5d4037` _deep muted orange_, and collides two swatches on one name. Tuning cannot fix the shape of it:
`#b0122f` and `#bf360c` sit **15° apart** and want different families, and **brown, pink and navy are not
hue bands at all** — they exist only at particular lightness and chroma, so they need rules rather than
buckets.

**Naming is a property of the colour, not of how it arrived.** `project.json` stores a hex and nothing
about whether it was picked or typed, so a typed `#c2185b` is called _Raspberry_ just as a pressed one is
— and that is right rather than a rounding error: the name is then still a claim about **our** twelve,
which is exactly the claim we can check. What is never named is a colour that is not one of ours.

**The names never reach `project.json`**, which stores the hex, so changing one is not a schema change
and not a version bump. **The table is provisional in exactly the sense §2.5's closed-day words are**,
and for the same reason: there is no database of what a colour is called, each name is hand-authored, and
someone saying _"that is not raspberry"_ is the highest-quality evidence it can receive. `CONTRIBUTING.md`
asks for that by name.

**The names are builder vocabulary, not page text.** The builder has no localisation layer — every string
in it is hardcoded English — and `lang` is a property of the _exported page_. A swatch name is chrome,
exactly like _Corner softness_. Nothing here costs §2.5 anything.

**Two further controls appear only when a section that uses them does.** `clock` (12h/24h) and
`weekStart` are display preferences belonging to opening hours (§2.3), and they live at the foot of
the same step, shown when the page has hours and absent when it does not. They are listed apart from
the six deliberately — the six are the styling model, these two are settings that had nowhere better
to live. The distinction is what stops the screen accreting a ninth.

**Both are seeded from the browser at first run and then stored** (§4.1), rather than defaulting to `12h`
and `mon` for everyone — which is what made every page this tool has ever exported read 12-hour, the
Welsh ones included.

**`clock` now governs a second surface.** §7.10's time box echoes the stored preference, so an owner who
changes this control later changes the entry boxes with it. That is the intended relationship rather than
a side effect: the box is a view of the stored time, not a field of its own.

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

**One name is deliberately asymmetric, and the reason belongs beside it.** The CSS custom property is
`--lp-accent-text`; the stored palette role it is derived from is `accentInk`. They differ on purpose.

The property was renamed because **`-ink` was carrying two different meanings**: `--lp-fill-ink` is text
_on_ the fill, while the accent one is the accent adjusted to work _as_ text on the ground. There was
never a contrast failure to fix — `#c2185b` on `#fdf7f8` is 5.55:1, and across five brands measured the
adjusted value simply _equals_ the accent in light mode four times out of five, because the adjustment is
a no-op whenever the accent already clears 4.5:1. A naming trap gets a naming fix, and nothing is
re-derived.

**The role does not move, because it is a stored schema key.** The advanced tier (§3.4) reads
`advanced.colors[role]` straight off `project.json`, so renaming it either breaks every advanced-tier
file or spends a §4.2 version bump on cosmetics, and §4.5's round-trip makes that a needless risk.
`palette.ts` carries a comment saying so, because the next reader's instinct will be to tidy the
asymmetry away.

### 3.3 The readability guarantee

Readability is guaranteed **by a constrained colour field rather than by warnings**. The owner cannot
easily pick a combination that fails, so they are never told off for picking one.

A hand-typed hex is **honoured exactly**. If it cannot carry the page — too light for a button, too
dark for a ground — it **steps back to a quieter role** rather than being rejected or corrected.

**A typed hex is inside this guarantee; the advanced tier is outside it.** That is why the exact-colour
field sits beside the swatches rather than moving down to §3.4, and it is a spec fact rather than a
layout preference: §3.1 defines the main colour as picked _or typed_, while opening §3.4 is precisely the
acknowledgement that this guarantee has stopped applying. Stepping a typed hex back to a quieter role is
the guarantee working, not a retreat from it.

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
the `dir` attribute, and the ten words the renderer writes (§2.5). A file whose `lang` we could not
use therefore declares English, renders English and reads left to right.

**`hours.clock` and `hours.weekStart` are seeded the same way** — derived from the browser once, at
first run, and then stored. `clock` comes from the locale's hour cycle; `weekStart` maps a locale whose
first day is Sunday to `"sun"` and everything else to `"mon"`.

**Storing is the decision, not an implementation detail.** §6.7 bans `Intl` in the _renderer_, and the
distinction is load-bearing rather than pedantic: `cy-GB` resolves to a 12-hour cycle in one runtime and
a 24-hour cycle in another, so deriving at render time would make a Welsh page's times depend on which
runtime drew it. A value computed once in the builder and written into the file is not a render-time
read.

**§7.3's no-defaulted-facts rule is not in tension with this**, because §2.3 calls both of them display
preferences rather than facts about the business. §4.3's consequence follows automatically: a field
defaulted on load appears on the review list as an ordinary row, and both already do.

**A Saturday-first week stays unrepresentable** and lands on `"mon"` — exactly where it lands today.
Widening the type was rejected as a §4.8 schema change to a v1-stable type for one rounding: never worse
than today, often better.

**`lang` itself is unchanged**, and now stands on a reason rather than on inertia. Asking the owner
outright was rejected — it spends a screen (§7.2) on a question whose whole consequence is ten strings
and a screen-reader voice, and most owners cannot predict what their answer changes. Storing the bare
language (`en-US` → `en`) was rejected too: it discards the voice hint for every owner whose region was
right in order to fix the ones where it was wrong.

**A wrong region costs less than it looks, and that is what rules out inferring one.** `en-US` and
`en-GB` render **byte-identically**, because the vocabulary lookup truncates on a miss — so the only real
cost of a wrong region is the single thing this attribute is for: a screen reader switching voice.
Reading the region off the owner's address would therefore spend §2.3's address-as-data line in order to
change a subtag that alters nothing rendered.

> A loose end recorded rather than fixed: the renderer falls back to `24h` when `clock` is absent, while
> the builder has always written `12h`. Nothing this tool produces reaches that path, but a hand-authored
> file renders the opposite of every builder-made page. Left alone deliberately — a renderer's fallback
> for a _missing_ field is a different question from a builder's default for a _new_ one.

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
  render the link with the generic fallback glyph and its name visible (§2.4), preserve the value
  verbatim.** The link is the point; the icon is decoration.
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

**The builder uses Tailwind CSS v4; the renderer never will.** `packages/builder` takes the Tailwind Vite
plugin as a **devDependency**, and `packages/renderer` keeps its hand-written `stylesheet.ts`.

**This is not a preference about CSS.** The export's stylesheet is derived per project from the owner's
brand colour (§3.2), so static class extraction is the wrong shape for it — and §6.7's byte-determinism
guarantee must not come to depend on a third party's output ordering across versions. It is the same
reasoning that rules out `Intl` in §2.5, one layer up.

**v4 rather than v3, recorded from evidence rather than taste.** The builder's handful of custom
properties are declared **four times over** across its stylesheets, with the preview holding the same
values a fifth time under different names; nothing but habit keeps them agreeing. v4's `@theme` is one
block that both defines the properties and generates the utilities from them, where v3 needs a JS config
_plus_ a separate `:root` block to keep the properties alive. §7.6's breakpoint likewise stops being a
number agreed by hand between two files and becomes one token.

**Invariant 3 grows to cover `devDependencies`** (§5.3). As written it checks `dependencies` only, so a
Tailwind devDependency in the renderer would pass CI green while breaking the rule above. Builder-only is
currently kept by people; this is what gives it teeth.

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

Renderer-heavy Vitest: per-section snapshots plus **three invariant guards**, and a browser tier of
**five Playwright end-to-ends** — one proving the downloaded file opens standalone and matches the
preview, and four making measurements that cannot be made anywhere but a browser.

| End-to-end                  | What it holds                                                                    |
| --------------------------- | -------------------------------------------------------------------------------- |
| `download.e2e.ts`           | the downloaded file opens standalone and matches the preview                     |
| `exported-page-a11y.e2e.ts` | `axe-core` over the exported page — every shape, both modes, both widths         |
| `focus-ring.e2e.ts`         | a focus ring is painted on every tab stop (§7.12 commitment 2)                   |
| `reachability.e2e.ts`       | what Tab reaches, against every control a screen is showing (§7.12 commitment 3) |
| `tap-target.e2e.ts`         | the rendered box of every tab stop, against the tap floor (§7.12 commitment 5)   |

They sit in `packages/builder/e2e/`, which holds a sixth file — `walk.ts`, the shared walker the
last three ride. The runner collects `**/*.e2e.ts` and nothing else, so a library there is never
picked up as a spec, and the file count in that directory is not the test count.

**Four of the five are in a browser because jsdom cannot answer their question, not because a
browser was to hand** — and that is the same distinction §7.12's commitments are built on, so a
reader who takes these for slow unit tests will try to move them back and quietly break them.
`:focus-visible` is a judgement about _how focus arrived_, which only the thing that moved the
focus can make. **jsdom does not implement `inert`** — it neither blocks focus nor prunes the tree —
so a test there can read the attribute and learn nothing about what the keyboard can reach. And **a
class string is not a rendered box.** Two of the three replaced a jsdom guard that was green over a
real defect: a dead tab stop that survived 847 passing tests, and §7.2's progress-bar header at
350×36 ([#305](https://github.com/mandyMooreFan/linkpage/issues/305)), which the class-string check
never read. **Moving one of these into Vitest would not make it faster; it would make it stop
measuring the thing it is named after.**

**What the tier costs, because this is where someone stands when deciding to add a sixth file.**
The End-to-end job in CI ran **44 s** with two of them, **59 s** with three, **1 m 16 s** with four
and **1 m 35 s to 1 m 51 s over three runs** with all five — about fifteen seconds a walk, and
cheap because each walk presses keys and reads computed styles rather than photographing anything.
**The job's old 30-to-70-second band belongs to the two-file era**; call it a minute and three
quarters now, and take a single run's figure as a sample, not the cost. That
is against a **10-minute
bound on the job and `retries: 0` in the runner, and neither is decoration.**
[#119](https://github.com/mandyMooreFan/linkpage/issues/119) saw three runs in one 40-minute window
sit on the browser install for 12, 19 and 37 minutes and need cancelling by hand — an unbounded job
that hangs is worse than one that goes red, because a check that never returns cannot be acted on.
`retries: 0` is the other half of the same argument: a browser test that goes green on the second
attempt is one nobody will trust the first time it goes red. **A sixth file is priced in seconds
against that bound and in the trust that a red here means something.**

**Two checks sit outside all of this and fail nothing that they find.** `pnpm shots` (§7.4's
appearance ritual) writes pictures for a person to look at; `pnpm a11y` (§7.12) drives the real
builder flow through 76 screens in Chromium and reports what `axe-core` finds there. **They are not
a cheaper tier of the five above and must not be read as one**: the end-to-ends are gates, these two
are reports for a person, and **§7.12's commitments rest on the gates alone.** Both are run by hand
when a person wants to look at what they say.

**But CI reads whether they _worked_, which is a different question** (#339), and the two answers
must not be run together. Both instruments grade their own exits — `1` could not run at all, `2`
frames missing or _"this report cannot be believed"_, and, for `pnpm a11y`, `3` rules violated. **The
`Instrument health` job fails on 1 and 2 and passes on 3**, deliberately: a finding is for a person
to judge, and `pnpm a11y` returns 3 today for the three rules §7.12 records as a successor effort's
work. **A job that went red on those would be permanently red, which is how a check becomes one
people switch off.**

**Until this existed, the grading was read by nobody**, which is the whole of #270: from `be7aaff`
every run printed a skip line, exited 0 as far as anyone was watching, reported a cheerful
`70 shots →`, and two frames were absent from every set taken **for three months** while tickets
read past the line and reported a pair as a before and after. `review-shots`'s exit 2 was added
_"for the reader who did not scroll up"_ — and there was no such reader.

**What a check owes, and what it must say it misses.** Every check here — the five gates, the Vitest
suite, the two hand-run instruments and the three invariants below — is held to two things. **It
ships with a control that has been _observed red_**: run against a known-bad case and watched to
fail. And **where it covers less than its name suggests, the limit is written beside it, in the
code.** A check that has no control names why, in the same place, rather than leaving the absence to
be inferred.

**This is set down as a ratification, not a new standard, and reading it as new would be reading it
wrongly.** It had been stated six times before it was ever stated as a rule, each time scoped to the
file it was discovered in: `census.mjs` twice — _a check over nothing reports "nothing wrong"
forever_, and _a guard that only reports what some other line already noticed is not a guard_ — this
section once, _a class string is not a rendered box_,
[#287](https://github.com/mandyMooreFan/linkpage/issues/287) on CL-8, whose controls _"were not
argued, they were **induced**"_, and, most sharply, the control in `focus-ring.e2e.ts`: **a
measurement that cannot detect the absence of what it measures reports a clean screen when its own
driver is broken.** The sixth is §7.12, which states the other half — _each line says what its test
actually reaches_ — and is the only place in this document that already does it. Three of the five
gates already comply — `focus-ring`, `reachability` and
`tap-target` each carry a named _"the walk goes red when…"_ test, and the two known defects at the
end of this section are the second half of the rule being kept before it was written.

**Two ways a check can be worth nothing, and the second is the one that has actually cost this
repository time.** A check that **cannot fail** is the obvious case and, measured, this repository
has none: **zero identical-operand assertions across 2,396**
([#317](https://github.com/mandyMooreFan/linkpage/issues/317)). A check that is **misaimed** — alive,
and pointed slightly to one side of the defect it names — is what every miss here has been. §7.2's
progress-bar header stands at 350×36 under a 44px floor, and went unseen because the guard of the day
read a class string and never read that button ([#305](https://github.com/mandyMooreFan/linkpage/issues/305)); the file-picker
guard in `pickers.test.tsx` counted roles, and a file input made into a second accessible button _by
a name alone_ carries no role to count. Both guards ran, passed, and were pointed just past the
thing. **A rule written only against "cannot fail" would have caught neither**, which is the whole
reason this one is written against both.

**A misaimed check is deleted where something else already covers the defect, and re-aimed where
nothing does.** Annotating it is not enough and is the tempting wrong answer: **a line that reads as
the guard and is not stops the next person looking**, which is worse than the absence it disguises.
Where the defect has no other cover, the check is re-aimed at it — §7.12 commitment 6 states the form
this repository prefers, _counting the named controls a screen renders rather than asserting an
absence_.

**What binds, and what does not.** The rule binds new checks, and the four gaps named when it was
settled ([#323](https://github.com/mandyMooreFan/linkpage/issues/323)). It is **not** a re-audit of
the suite: seven corpora were emptied at their definitions and every one was caught — `VOCABULARIES`
by 194 failing tests, `PRESETS` by 76, `TOPICS` by 61, `WEIGHT` by 45 — and 52 non-emptiness
assertions were already in place across 11 files. **The small numbers are the interesting ones,
though**: `SHAPES` drives six assertion loops and emptying it failed five tests, `MODES` five loops
and two. The mutants were caught — by other tests, while the loops iterating them said nothing. **A
corpus can be well defended and still not defended by the checks that read it.**

**The bound of the measurement this rule rests on**, stated here because a section requiring checks
to declare their reach must not overstate its own: **eight known-bad cases were run against 2,396
assertions.** That is not a mutation-testing run and is not offered as one — it tested the shapes
that had already failed here, and the corpora most likely to carry them. The working is in
[`docs/checks-that-cannot-fail.md`](https://github.com/mandyMooreFan/linkpage/blob/main/docs/checks-that-cannot-fail.md).

**It binds the two hand-run instruments as well, and _fails nothing_ is not an exemption from it.**
The paragraph above stays exactly true — `pnpm shots` and `pnpm a11y` are reports for a person and
stop no merge — because **this rule is about whether a check can see, not about whether it can
block.** The two are independent, and treating the first as a privilege of the second is what
[#270](https://github.com/mandyMooreFan/linkpage/issues/270) cost: a report that failed nothing, told
nobody it had skipped the import screens, printed a cheerful `70 shots →` and exited 0, and was wrong
in the same way for **three months** while several tickets read past the line. **A gate that cannot
see wastes a red. A report that cannot see is believed.**

**Four ways a check discharges that, and a module owes one of them — not all four.** The rule above
says what a check owes; this says what paying it looks like, because three of these four were being
used here for a year and none of them was written down. A count of _test files_ was mistaken for a
count of checked code and came back four times too pessimistic
([#325](https://github.com/mandyMooreFan/linkpage/issues/325)).

1. **By a test.** `census.mjs` (189 lines, 186 of test), `stability.mjs` (106/106), `port.mjs`
   (30/72), `variants.mjs` (88/66). These are the modules built so they _could_ be tested —
   `census.mjs` says so of itself: it compares two lists of names, so it can be checked red
   _"without a browser, a server or a screenshot."_ **That property was designed in, not found.**
2. **By a control.** `a11y-sweep.mjs` carries `CONTROLS` — a table of known failures, each with the
   rule it must make `axe-core` fire — and `emptyRun`, and **runs every one of them on every
   invocation** before it reports anything. It breaks the document on purpose and checks the
   checker noticed.
3. **By delegation to a tested module.** `review-shots.mjs` does not verify its own work: it
   imports `covered`, `intended`, `missing` and `unreached` from `census.mjs` and `compare`,
   `digest` and `verdict` from `stability.mjs`, and both of those are tested. **The 885 lines are
   the driving; the judging is somewhere it can be checked red.**
4. **By a gate exercising it.** `axe.mjs` and `scripts/wizard.mjs` have no test of their own and
   need none: the End-to-end job runs both on every push. `wizard.mjs` arrived in this category by
   [#332](https://github.com/mandyMooreFan/linkpage/issues/332), which moved the wizard's answering
   half out of two copies into one — **the gated tier's copy was the one that survived**, so the
   hand-run instruments' answering half is now run in CI as a side effect of being shared.

**`a11y-sweep.mjs` is the exemplar, and its two facts must be read together rather than as a
contradiction.** This section says it _fails nothing_, and that is true — it is a report for a
person and stops no merge. It is also the most thoroughly controlled thing in this repository,
proving on every run that its checker can see. **Those are not in tension: failing nothing is about
gating, being controlled is about seeing**, which is the distinction the rule above turns on. A
report is exactly where a control matters most, because nothing else is watching it.

**Two modules are held honest by none of the four**, and are the whole of the gap:
`scripts/serve.mjs` (76 lines) and the route left in `scripts/flow.mjs` (163). The route is watched
indirectly — the census names a frame that never arrived, which is how
[#270](https://github.com/mandyMooreFan/linkpage/issues/270) was caught in the end, **after three
months.** _Indirect and slow_ is the case a control exists for, and both are
[#336](https://github.com/mandyMooreFan/linkpage/issues/336).

**The three invariant guards** named at the top of this section, which the Vitest tier carries:

| #   | Invariant                                                                                 |
| --- | ----------------------------------------------------------------------------------------- |
| 1   | The export contains no `<script>` tag, no inline event handler, no `javascript:` URL      |
| 2   | The export references no external or relative **subresource**                             |
| 3   | The renderer declares no dependencies, and develops against nothing but its own toolchain |

**Invariant 2's reading matters:** _navigation_ to another site is the entire point of a link page, so
`<a href="https://…">` is fine. What is forbidden is a **subresource** — anything the browser must
fetch to render the page. Those must be inlined, because the file has to work opened from a desktop
with no network.

**Invariant 3's second half is an allowlist, not a count, and the difference is the whole of it.**
`devDependencies` cannot be asserted empty: a package that typechecks and tests itself needs a compiler,
a runner and Node's types, and the renderer has always declared exactly those three. So the guard names
what the renderer may develop against and fails on anything else. **What it is guarding is not "few
dependencies", it is `stylesheet.ts` staying ours** (§5.1) — and a CSS toolchain would arrive as a
`devDependency`, which is precisely the shape checking `dependencies` alone could never see. **Adding a
name to that list is a spec change, not a build fix.**

**A consequence of that reading, worth stating because it looks like a hole and is not.** A link button
whose URL was typed as `facebook.com/mybakery` exports as `<a href="facebook.com/mybakery">` — a relative
link that 404s on the owner's own published page — and invariant 2 passes it, **correctly**: that is a
navigation, not a subresource. **The fix belongs in derivation (§2.3), not in the guard.** Tightening
invariant 2 to catch it would forbid the one thing a link page exists to do.

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

**A short page is centred in the viewport.** `min-height:100svh` and `display:flex` on the body, with
`margin-block:auto` on the column — 65 bytes, and shape-agnostic by necessity, since two of §3.1's shapes
already restyle the header and a header treatment was therefore never available to all four.

**`svh`, not `dvh`.** `dvh` tracks the mobile URL bar, so content sitting in the band between the small
and the large viewport would recentre itself while the reader scrolls. `svh` never changes. Recorded as
**reasoned rather than measured**: headless Chromium reports `svh`, `dvh` and `lvh` as equal, so this is
one of the things only a real phone can check (§11).

**It cannot misfire, and that is what chose it over the alternatives.** Its trigger is free space itself —
`margin-block:auto` resolves to zero when there is none — so a full page is pixel- and byte-identical
before and after, and a mid-length page benefits without being asked to.

> **The honest limit, recorded next to the change: it relocates the emptiness, it does not reduce it.**
> The sparsest page this tool produces — a name and two social links — is 88% empty before and 88% empty
> after. What changes is that the void becomes symmetric above and below rather than a column that stops
> a third of the way down, which is what a deliberately minimal page looks like. **741 px of viewport
> cannot be filled without inventing content, and §2.2 closed the section set at six.** Anyone reopening
> this in search of a fuller page is asking for a seventh section.
>
> **A general fact underneath, so that nobody re-derives the alternative: CSS has no height query.** Any
> "grow when the page is thin" rule must proxy content thinness by markup shape, and markup shape does
> not track height — a links-only page 409 px tall has exactly the same two children as an almost-empty
> one, because every button lives inside a single list element. That is a wrong mechanism rather than a
> mistuned one.

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

**The number that actually governs is not in the table above, and belongs beside it.** CI's chrome
tripwire is **26 KB**, and the measurement that has to clear it is not the one usually quoted: the size
test renders the largest fixture in **every language in the table**, and Thai is the widest — three
bytes to a character where English spends one. So the governing figure is `MAXIMAL` in Thai, and the
history is:

|                                       | largest fixture (`MAXIMAL`) | worst language (`MAXIMAL` in `th`) | headroom under 26 KB |
| ------------------------------------- | --------------------------- | ---------------------------------- | -------------------- |
| before §6.9                           | 24.04 KB                    | —                                  | —                    |
| §6.9, as costed in this section       | 24.75 KB                    | —                                  | 1.25 KB claimed      |
| with §6.9 and the hover state shipped | 25.03 KB                    | 25.12 KB                           | 0.86 KB              |
| after the spacing and type ladders    | **25.58 KB**                | **25.67 KB**                       | **0.33 KB**          |

Two corrections are recorded in that table rather than smoothed over. **24.75 KB was never re-measured
after §6.9 finished landing**, so the 1.25 KB it claimed was a third more headroom than existed; and the
number quoted has always been the English fixture, which is not the assertion CI actually makes. About
15 KB of the total is vendored SVG:
**the icon set, not the stylesheet, is what fills this budget**, which is why §2.4's membership rule and
this number are the same conversation.

**A third of a kilobyte is what is left, and it is not a lot.** The ladders bought naming rather than
pixels — **566 B**, spent on saying what the page's twenty-odd loose lengths meant — so the next idea
should expect to argue about the price rather than to discover it afterwards. §6.9 already recorded that
a glyph is never as cheap as its drawing; a token block is never as cheap as the value it names either,
because it is paid once in the declaration and again at every use. A spec whose numbers are both looser
than the test's is a spec that invites the next contributor to spend headroom that is not there, which is
exactly what happened twice. **The next presentation idea is the one that breaks the build**, and it
should learn that here rather than in CI — and where it earns its place, moving the 26 KB tripwire in a
diff that says why is the right answer, not silence.

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
> is a dependency on the runtime rather than on the argument. The ten strings the renderer writes
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
renderer's own ten words follow it rather than staying English underneath it (§2.5), and why the
page declares `<html dir>` from the same tag.

### 6.9 Presentation

Three further decisions about how the page presents itself, priced against §6.5's real headroom. §6.2
holds the fourth — centring a short page — because that one is about the column.

**Together they spend 726 B.** That is **171 B more than the 555 B the decision was
costed at**, and the difference is worth recording rather than smoothing over: the estimate was taken on
a prototype, and a glyph carries `glyphSvg`'s full `<svg>` wrapper — the viewBox, the paint attributes,
`aria-hidden` and `focusable` — before any path data. **A glyph is never as cheap as its drawing.**
Anyone costing the next one should price the wrapper first. What this section left behind was a headroom
figure it never re-measured; **§6.5's table is the live one**, and this paragraph is the spend, not the
balance.

**The address underlines its street line only.** The whole block stays the directions link; the underline
moves to the first line, at `text-underline-offset:0.18em` and `text-decoration-thickness:1px`. Today all
three lines are underlined, which reads as three separate links, and the underline beneath a postcode
collides with its descenders. This is the only option that acts on the finding as written — _separate the
directions affordance from the address text_ — while staying inside §2.5 as it then stood, which forbade
the ninth string a "Directions" label would need, and it kills both halves of the complaint at once.
**§2.5 has since spent that word**: the underline is what a sighted reader gets, and a visually hidden
_directions_ word inside the anchor is what a screen reader gets — see below. **Removing the
underline entirely was rejected**: the pin glyph would leave colour as the sole indicator, and §6.8 is
not negotiable.

> It needs three `<span class="lp-line">` inside the existing `<span itemprop="address">`. The spans add
> no text, so `textContent` is unchanged and §6.4's microdata still reads `12 Baker Street London NW1
6XE`. **The build ticket asserts that**, because this is the one place a purely visual change touches
> structured data.

**The hours rows get more room, not less.** The grid's row gap goes `0.375rem` → `0.5rem`, growing a
seven-row block from 204 px to 216 px. That is the opposite direction from relieving the repetition §2.3
declined to collapse, and it is deliberate: seven identical rows read as a legible list rather than as
noise, so the density lever went to legibility instead. §2.3 refused to save ~110 px; this spends 12 more.

**The hours panel gets a clock glyph, and the gap it leaves is stated rather than papered over.** Icons
are not words, so a glyph can name the panel where a heading could not (§2.5). **It names the panel to a
sighted reader and changes nothing for a screen reader**: every glyph is `aria-hidden` by standing rule,
and naming the panel to assistive technology needed a ninth string — a visually hidden word is still a word
the renderer writes, and would still need translating across every vocabulary. That was weighed against
cost and word count, and the gap was left open rather than described as fixed.

**That refusal has been reversed, and why the price changed matters more than the reversal.** The ninth
string was refused on a byte cost, and **that cost was priced by analogy to a glyph** — by the very
`<svg>` wrapper this section had just overrun its own estimate on. **A word carries no wrapper**: no
viewBox, no paint attributes, no `aria-hidden`, no `focusable`, nothing before the characters themselves.
Measured rather than estimated, in the tightest of the 42 languages with real Thai words: the dearest of
the four mechanisms weighed is **41 B**, and the two changes together spend **132 B** of the **347 B**
§6.5 had left — **215 B** still standing, and `.lp-sr` already exists and is already paid for by the
social links, so the CSS costs nothing. **The byte argument was the whole objection and it was not
real.** What remains is the
translation cost — one more hand-authored word per language, twice over — which was weighed on its own
and paid: §2.5 now writes ten words, and its un-citable half more than doubles.

So the gap is closed by decision rather than described as fixed. **The hours panel is named** by a
visually hidden `<h2>` the `<dl>` points at with `aria-labelledby` — real text rather than an
`aria-label`, on the renderer's own argument that a visually hidden span is text a translator and a
"find in page" can both see. **And the address link says it opens directions**, by a visually hidden span
first inside the anchor: this section rejected that in a single clause while giving the hours panel three
sentences, and **it was the worse of the two gaps** — an unnamed list whose rows still read `Mon` and a
time against a link that announced an address and nothing about what pressing it does. The contact panel
still needs nothing, though not for the reason given here: it is the text that does the work — a phone
number and an email address say what they are — not the glyphs, which are `aria-hidden` like every other.

**A glyph is never as cheap as its drawing. A word is.**

**A derived vignette on the ground was measured and rejected as invisible.** In light mode it interpolates
`#ffffff → #fdf7f8`; §3.2's ground tint is deliberately almost invisible, and a gradient drawn between
that tint and its own surface inherits the invisibility.

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
the flow picks them up and walks them through hours.

**A re-entry run contains every unanswered topic, opening at the one ticked** (#146). Ticking _hours_
asks hours first, and the rest of the uncovered territory is then in the same run — jumpable via
§7.2's bar or walked in order — with a **"Done for now"** row in the bar's topic list that ends the
run at will and returns to the list. The alternative, a run of exactly one topic, made the run's own
navigation pointless at the very place the #138 walk demanded it: a single-topic run shows "0 of 1"
with nothing to jump to. Leaving after the ticked topic is one tap, so this is breadth on offer, not
a gauntlet.

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

**One _question_ per screen, not one field per screen.** _When are you open?_ is one question whose
answer happens to have seven parts, in the same way the link step is one question with several picks.
That reading is what lets §7.10 keep the hours on a single screen, and it is written here so the rule is
not read as forbidding it.

**The flow carries a progress bar from the preset onwards, and the arithmetic that once refused one is
defeated rather than dodged** (#139, revisited at exactly the seam the previous version of this section
named). The old refusal was sound about _screens_: the link run appends one per pick, so any
screen-denominated count must jump backwards or be clamped — a lie told visually. The bar therefore
counts **topics**. The topic set is fixed the moment the preset is picked — link picks add screens,
never topics — so the total exists, never grows, and never retreats. On screen one no total exists yet,
so **the bar is absent there**, which is the old argument kept where it was right.

**What the bar is:** the standard labelled progress-bar pattern — the current topic's name, a count in
the shape _"3 of 8 done"_, and a filled rounded track — sitting above the question as **static chrome**
(§7.11). **The fill means completion, not position**: topics answered this run over topics in the run.
It never overstates and never moves backwards, whatever order the owner visits topics in.

**The bar is the run's navigation** (#146). Tapping it drops open the run's topic list — full-width
named rows, done-state visible, a _"Done for now"_ row on a re-entry run — and tapping a topic jumps
there. Only the current run's topics are listed: editing what already exists is the review list's job,
and the bar never becomes an editor. Jumping applies to every run, first included — jumping forward is
several skips at once, which the escapes already permit. **Jumping away from a half-answered screen
discards it, exactly as `Back` does**: nothing is written until something is answered, and a jump that
silently committed half-typed text would be §7.9's "did that save?" fear built into navigation. A run
still ends as it always did — walking off its last screen — and jumped-over topics stay unanswered,
visible as the gap between the bar's count and its total, waiting as unticked rows.

**The page is still the progress that matters.** The step order _is_ §2.1's page order, the store is
**write-through** — answers reach storage as they are given — so closing the tab at screen four loses
nothing. **The flow is not a gauntlet that has to be finished.** The bar reports; it never demands.

> **Provenance.** The refusal this section replaced was overturned by evidence, not preference: the
> #138 cold phone walk produced no "how much more?" moment on the first run (the arithmetic held where
> it applied) and a direct demand for jump-around structure at re-entry (where a fixed topic total
> exists and the arithmetic never reached). The #139 prototypes are on `prototype/phone-seam-issue-139`.

**The one count that is true is given.** Each screen in the link run keeps its title and gains one
sentence — _"The second of four."_ — because there the count can neither stale nor jump: the picks are
fixed the moment the links screen is answered, skipping one leaves the plan alone, and the run is
contiguous. It costs no chrome, reusing the two-sentence hint §7.10 uses. **Collapsing the run into one
screen** was licensed by the one-question reading above and rejected anyway: §7.3 says that tapping a
button leads to a screen asking for its URL, so it is a spec change rather than a layout choice, and it
trades four small asks that each carry their own escape for one tall screen.

### 7.3 Presets

**Step one of the flow is _"What kind of business is this?"_** — not a gallery in front of it. A
pre-flow chooser is a decision made while knowing nothing about the tool and reads as a commitment; as
step one of the same one-question-per-screen sequence it is no heavier than "what's it called?".

**One quiet line of orientation sits above that question's title, and nothing precedes the screen**
(#141): _"About ten quick questions. Everything stays on this device — stop anytime, nothing is
lost."_ Small sans in quiet ink; the screen's first words are orientation, its first act is still the
question. The rejection above is re-read and holds as written — it refused a pre-flow **choice**, and
this asks for nothing — but a whole orientation _screen_ would still tax every arrival with a tap and
read as a brochure to exactly the impatient owner it hopes to reassure. The line carries the three
doubts a cold owner actually holds — how long, can I leave, where does this go — and no more: free and
no-signup are demonstrated by never being asked to sign up, and saying them is noise. _"About ten"_ is
honest where a counter is not: a range stated once, before anything is fixed and never updated, is
true of every path through the flow, and §7.2's bar carries the exact count from screen two onward.

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

**§7.10's carry-down does not breach the no-defaulted-facts rule above, and it does not by
construction.** Nothing carries until the owner has typed a first time, so the first day of the week is
always their own and the screen still opens asserting no fact at all. What carries afterwards is the
owner's own answer moved, and it says on screen where it came from.

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

**Arriving from a run says so, once.** _"Your page is ready. Look it over, then download it."_ — at the
top of the list, on arrival from the flow, and never again. The list was never blank on arrival: it is
headed with the owner's own business name, Download sits in the bar and the page is beside it. What was
missing is that the owner has just answered ten questions and has never once been told what happens next,
with §8's guidance living inside a sheet they have no reason to open. **It is held in memory rather than
in the file** — no flag in `project.json`, and a reload simply lands on the list without it — because it
belongs to the _transition_ and not to the list. A closing _step_ was rejected as a screen whose only
content is an acknowledgement that has to be dismissed.

> Recorded because it is easy to get wrong later: the line also fires for a run that began from a project
> that already existed, where _your page is ready_ is not quite true. **No second line is added for that
> case** — the row now showing its content is its own confirmation.

**Two rows say what they control instead of describing it.**

- **The colour row reads `● Raspberry · Centred · Light`**, and `● #7a5c3e · Centred · Light` for a typed
  colour. Three of the six controls rather than all six: the row's job is recognition, the page preview
  sits beside it, and six parts is an inventory that wraps on the screen §7.6 calls the primary case. The
  dot carries the colour for anyone who can see it and the name carries it for anyone who cannot, so the
  dot is decorative and takes no accessible name of its own. **The swatch grid stays a grid** — the name
  appears once, under it, for the colour chosen (_Your colour: Raspberry_), with every swatch carrying its
  name as its accessible name, so a screen reader hears twelve names rather than twelve codes. Twelve
  labelled rows would turn a compact field into a long list, and an owner hunting for their green scans
  colours rather than words. Announcing without showing was rejected: the owner would meet _Raspberry_ for
  the first time in the review row, with nothing on the screen where they chose it to say where the word
  came from.
- **The page-language row becomes a picker that shows the words it picks** — each language labelled in its
  own language, showing the abbreviations it produces: _English · Mon Tue Wed · Closed_, _Cymraeg · Llun
  Maw Mer · Ar gau_. **The control demonstrates its consequence instead of describing it.** Today it asks
  a bakery owner for a BCP 47 tag, on a product whose standing tiebreaker is that the owner is not a
  developer. **A quiet "or type a code" escape stays**, and not as a nicety: §4.5 preserves unknown values,
  so a hand-edited file declaring `sw` — English words, correct tag, a perfectly sensible state — must be
  displayable without the control silently rewriting it to `en`.
  **A collapsed row says what is there, not what it says. Every row is one short line.**

A row whose answer is a **list of things** reports how many of them — _12 link buttons_, _Open 7 days_,
_11 accounts_. A row whose answer is **one short thing** still shows it, because a tagline is already a
line and already says what is there.

**The address row shows the address, then says a link is there** — _12 Bridge Street, Hebden Bridge, HX7
8AA · directions link_. You can tell at a glance that you added one; the link itself appears in the field
that can change it when the row is open. The same middle dot as the hours row's note, and for the same
reason: it reads as _and also_ without claiming a grammar. What the row says about the link is decided by
whether there is one, never by what it is — so a hand-edited file that is a link and no address still has
this much to say.

**This is the logo row's own rule applied to the rest, not a new idea imported.** The logo has always
described what it holds — `1200 × 400`, or `Added` — because there was never anything else it could say;
every other row concatenated the owner's answer. With a real project that produced a paragraph: at 390px,
twelve button labels end to end made the Link buttons row **fourteen lines**, seven days of times made
Opening hours **ten**, and the first screen held **three rows of nine**. The list's job — _see every
topic of your page at once and press the one you want_ — was gone before the owner had done anything
unusual.

**What it costs is on the record rather than discovered later: you can no longer spot a typo in a button
label without opening the row.** That was put and taken. A row that needs its answer visible is a change
to this rule, not a detail of it.

**Nothing is cut off.** A row is one line because of what it _contains_, so **trimming stays refused** —
here and for the address. A trimmed web address is unreadable, and a clamp would have hidden the address
row's sideways scroll rather than fixed it. If a row still will not fit one line, that is a finding
rather than a reason to reach for a clamp: with the worst realistic project the rows still over one line
are the four holding a single long answer — a long business name, a long tagline, a phone and an email
together, and an address written on five lines — and none of them is a list.

**A word wider than the column breaks, rather than running off the edge.** Wrapping breaks at spaces, so a
run of characters with none in it — a pasted web address, a long email, a place name — is as wide as it is,
and no column above it can make it narrower. The ink then runs past the right edge and **the whole screen
scrolls sideways**, which is the failure §7.4 already knows this layout has and §7.6 refuses on the size the
shape was chosen for: with the directions URL printed in the address row, the review list measured **754px
against a 390px phone**, on arrival and on every collapsed row. **The owner's own words are printed on this
screen in exactly two places** — its heading, which is their business name, and a row's summary, which is
their answer; everything else here is either the tool's own words or a field they can scroll. Both of those
two say the word may break anywhere. It is a floor and not a look: it fires only on a word the column cannot
hold, which the tool's own words never are, so no screen the review ritual photographs moves at all.

> Worth writing down, because the obvious spelling is the wrong one. **`overflow-wrap: break-word` is not
> this floor.** It breaks a word that will not fit on a line but leaves the box's _minimum_ width at the
> whole word, so a summary — which is a flex line — goes on refusing to shrink and the row overflows
> exactly as before. Measured: with `break-word` at both places, a maps URL typed as a business name still
> made the list 846px wide inside a 390px viewport and the row never wrapped, while the heading, an
> ordinary block, was fixed. `anywhere` is the one that reaches how narrow a box is allowed to be.

**A row whose value we cannot use is marked** — a quiet note that this one will not work, in §7.9's words.
Editing the row opens the same question, with the same message.

**The exact-colour field stops teaching notation.** Its example moves out of the hint and into the
placeholder, so it stops being instruction, and **the hint names who the field is for** — _"From a
designer or a brand guide."_ An owner handed a code by their designer needs that code to be the least
ambiguous thing on the screen, and it still is.

**The builder's visual language is _paper_** — a warm off-white ground, one ink, hairline rules, and
**structure from space rather than from containers**. Nothing is elevated, nothing is carded, and type is
the only decoration. It was judged on two screens rather than one, because a design vocabulary is only
judged where it repeats: of three directions drawn, it was the only one that does not look like software,
which is this product's whole pitch, and the only one that **holds a long summary without truncating** —
a carded direction clipped the hours row, colliding directly with the row decisions above. §7.1 calls the
flow and the list the same product at two moments, so they share it, and the migration to it happens in
one pass rather than screen by screen: a half-migrated tree contradicts §7.1 visibly for as long as it
runs.

**Paper carries one deliberate exception: §7.2's progress bar** (#139). The bar uses the standard
pattern's own vocabulary — a rounded grey track with a coloured fill — which is progress _chrome_, and
a second colour the tool shows beside `notice`. The exception was chosen with the collision in view,
against a paper-native alternative (an advancing hairline) that was built, judged on a phone, and
rejected as reading like a rule rather than progress. It is scoped to the bar and its topic list:
nothing else gains a card, a shadow, or a colour from it.

**No dark mode in the builder, and not on cost.** It is one variant and it works. **The builder is a
viewing booth for the owner's page, and a dark surround changes how a colour reads** — §3.3 guarantees the
page's readability and §3.1 makes light or dark the owner's own choice, so the tool must not tint the
decision they are in the middle of making. A toggle would also be a seventh control on a product that
closed its styling set at six, and one the owner would first have to understand is about the _tool_ rather
than the _page_.

**Controls are React components, not repeated utility strings and not `@apply`.** The `Field` seam already
exists — every labelled control routes through it — and §7.9's message slot is written once in a component
against fourteen times in class lists. `@apply` rebuilds the indirection utilities exist to remove: a
class whose meaning lives in another file.

**The builder's appearance has no standing regression suite, deliberately.** This is recorded as a
position because the obvious reading is that one went missing, and it never existed: the screenshot script
is run by hand and never by CI, and the end-to-end test asserts that a download happens. A
screenshot-diffing suite was rejected as precisely the flaky instrument this repo already refuses by
setting `retries: 0` — a dozen images diffed per push, failing on font hinting and antialiasing, is that
test a dozen times over. **The builder's look is checked by people, on purpose**, with a deliberate
before-and-after set captured for the review of any change that moves it — `scripts/review-shots.mjs`
produces it, every screen at both of §7.6's sizes, and nothing it writes fails a build.

**The tool's own markup carries `data-*` hooks where a test needs to name a thing it cannot reach by
role.** Utilities are styling and may change with the design; a hook is a contract and does not. This is
what stopped the migration from turning the test suite into a second copy of the stylesheet, and it
follows the convention the refusal notice already used.

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
builder. §7.2's bar is what tells you where you are in the meantime.

**On the review list, the drawer defaults open at every size** (#147). The laptop always landed with
the page beside the list; the phone was the only size where arriving hid it, and the #138 walk's
verdict on that was _"on mobile I only care what it looks like"_. So a phone landing on the list shows
**the page itself, full-screen**, with the list one tap beneath — and the default applies to **every
arrival without an expressed preference, the end of a run included**: finishing a run means the
finished page rising to meet you, which is §7.11's one set-piece. The choice stays what it always was —
a default, not a mode, one boolean, session-only. Remembering a hide across visits was rejected because
it quietly recreates the old behaviour for exactly the returning owner this decision serves. §7.4's
arrival line sits where it always did, first seen when the owner steps back to the list. **The open
drawer's control on the list reads _"Edit your page"_** ("See the page" when closed is unchanged, and
the flow's labels are unchanged): same drawer, same control, same interaction — the word now names why
an owner landing on their page would tap it.

**The one width at which the drawer opens beside the question is a single token** (§5.1), not a number
agreed by hand between two stylesheets — which is what it was, and what let them drift.

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

**When something the owner typed cannot be used, the sheet says so — conditionally, and in the first
section.** It sits under that section's own sentence and above §8's guidance, because it is about the
page, and because the last moment before publishing is when it is worth mentioning. **When nothing is
wrong the sheet is byte for byte the calm screen above**, and that is the constraint on implementing it.

**At most two lines, and they cannot become a list.** §7.9 gives the phone its own sentence and puts all
three URL fields under one, so two distinct warnings is the ceiling and a third is unreachable. Each names
its own field, because away from its row the sentence has no referent:

> **Order online** won't work — paste the address from your browser.
> **Your phone number** won't dial — add the number in digits if you want it tappable.

No count, no lead-in sentence and no icon. A line reading _2 problems_ is a diagnosis in our own
vocabulary, which §7.9 bans.

The objection was weighed rather than waved past: the _changed since you downloaded_ badge this section
rejects below was turned down for nagging a screen this design keeps calm. **The distinction is that the badge fired for everyone,
always, about a state that is normal and unfixable**, where this fires rarely, only when something is
genuinely broken, and is actionable.

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

**Two kinds of failure, one posture.** A file that cannot be opened, and a value the owner typed that we
cannot use. Both appear **in place, never as a modal and never as a navigation** — the first half below
is the import case, the second the typing case, and they share that rule and nothing else.

#### When a file cannot be opened

**In place, attached to the control that opened the picker.**

The existing project is untouched when an import fails (§4.6), so there is nothing to restore. And
_try a different file_ is overwhelmingly the next action — they grabbed the wrong download, or picked
`index.html` instead of the project file. A modal makes recovery _dismiss → re-find the control →
re-open the picker_; in place makes it _pick again_.

- **First screen** — the message appears under the quiet line, the preset question above it untouched.
- **The list's menu** — the message appears in the menu's own surface, the project intact behind it.
- **Missing required fields produce no error surface at all** (§4.6).

#### When the owner types something we cannot use

Five fields carry a derived machine target (§2.3), and sometimes no target can be derived. **The tool
mends what it can, says nothing when it succeeds, and never stops the owner — but what it cannot use
leaves a mark that outlives the screen.**

**1. It never blocks.** `Continue` keeps its single existing meaning — _you haven't answered yet_ — and
nothing about the _shape_ of an answer can take it away. §3.3 already committed to report-never-block for
contrast, which is the one thing that can genuinely make a page unreadable; it would be strange to hold a
phone number to a stricter standard than legibility. **The deciding asymmetry is that our rules go stale
and the owner's phone number does not.** A number we wrongly judge unusable would, if it blocked, lock an
owner out of publishing their own page — a failure with no recovery inside the product. A value we
wrongly _accept_ costs one broken button, which decisions 5 and 6 then catch.

> **Immediate consequence for the colour screen**, today the only screen that blocks on shape: the half
> of its condition that watches the hex box goes. As it stands, picking a swatch and then typing junk into
> the box kills `Continue` even though a perfectly good answer is selected. Under this rule `Continue`
> depends only on whether an answer exists; junk in the box is ignored, the swatch stands, and the message
> explains why the typing had no effect.
>
> **And typing into the box is an answer having been attempted** (CL-1, finding A-1). That first pass
> fixed the swatch case and left the harder one: with **nothing** picked and junk in the box, there was
> still no answer, so `Continue` went away — **and a disabled button leaves the tab order.** A keyboard
> owner tabbed the whole step, wrapped, and met no button, no sentence, and no cue that anything was
> wrong; the shape of what they typed was taking `Continue` away after all, one step further back. So
> **anything in the box keeps the button**, and pressing it is answered with the sentence. This is the
> only screen where it can arise — the two that block on presence are the two with no escape (§4.6), and
> this is the one of those whose answer can be typed. Judging on a keystroke instead is the option
> decision 2 refuses.

**2. It speaks on `Continue`, and not before** (#142). Nothing judges the owner while they are still
answering — not on a keystroke, and not on leaving a field, which on a phone is half of typing. Tapping
`Continue` is the invitation to check; once it has spoken it re-checks live, so it disappears the moment
the value becomes usable. Late to speak, quick to stop. This is the standard shape of form validation,
and the implementation is standard with it — **react-hook-form, with each base input a component**
(#142, superseding this section's earlier speak-on-blur position). The #138 walk supplied the moment:
the hours screen marking answers wrong before they were finished was the single clearest "I am being
told off" in the run.

**3. It sits below the control, the hint stays, and the field says it is the one in error.** `Field`
becomes label → hint → message, with the
message **joining** the hint in `aria-describedby` rather than replacing it, the control carrying
`aria-invalid` for exactly as long as the sentence stands, and the sentence itself being the
`role="alert"` this section already owns for a refused file — **one mechanism, not a visible sentence
and a hidden announcer beside it** (CL-1). Below the control, because
that is where the eye already is; the hint stays, because a hint is frequently _the fix_, and deleting it
at the moment of complaint is the worst possible timing. One optional line per field, with no layout
reserved when it is absent. That is the component §7.4's component layer is built around.

**4. A mend is shown, not said** (#142, superseding the silent mend). When the tool fixes a web address
or an email — a scheme added to a bare domain, spaces stripped — **the fixed value appears in the field
itself on submit, and on the review row after it**: type `mysite.com`, continue, and what stands where
you typed is `https://mysite.com`. No message narrates it — a sentence about something the owner can now
see would fire constantly on input that was fine, which is the rarity argument this decision keeps. What
it retires is the invisible correction: a mend the owner never sees is one they cannot trust or undo,
and one they would otherwise meet for the first time on the exported page. It is trustworthy because it
is visible and undoable because it is just text where they typed. **The message stays reserved for input
we genuinely cannot make a target from.**

**5. What cannot be used is marked in two places that outlive the screen** — the review-list row (§7.4)
and, conditionally, the Download sheet (§7.7). This is the decision that stops _never blocks_ from meaning
_never notices_.

**6. Consequence first, then the fix.** One sentence pattern, because decision 5 puts the same idea in
more than one place and three voices would read as three problems. **Banned throughout: _invalid_,
_format_, _valid_, and any other word that names our diagnosis rather than the owner's situation.**

| Field                         | Sentence                                                                            |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| A link button's URL           | _"**This button won't work** — paste the address from your browser."_               |
| `directionsUrl`, a social URL | _"**This link won't work** — paste the address from your browser."_                 |
| Phone                         | _"**Tapping this won't dial** — add the number in digits if you want it tappable."_ |
| A time (§7.10)                | _"**This time won't reach your page** — try 5:30pm."_                               |

**Email's sentence is written to phone's shape rather than to the buttons'**, and for phone's reason: an
address the floor cannot use is not a broken link either, and the same hint promises tap-to-email in the
same breath as tap-to-call. Recorded because this table was first written with no email row at all —
§2.3's floor can refuse an address, so the omission was a gap rather than a decision.

**One noun of variation, not a second voice.** Directions and social are not buttons, so calling them one
would be untrue. **Phone gets its own sentence because nothing is broken** — a vanity number, an extension
or a second number is deliberate and correct, and _this button won't work_ would be a false claim about
it. What justifies marking it at all is that **the contact screen's hint already promises** _"they become
a tap-to-call and a tap-to-email link"_: the message corrects a promise the screen made rather than
volunteering a diagnosis, and the copy must not read as though the tool has found a mistake.

**No pre-emptive hint on a field merely because it can carry a message.** If every case the message covers
also gets a hint, decision 4's rarity argument is gone and the message stops meaning anything.

**The message carries more weight on the two affordance fields than on the contact rows, and whoever
writes the copy should know it.** §2.3 keeps a phone number on the page without its `tel:`, so the
message there describes a degraded row the visitor can still use. A link button or a social entry with
no target is **absent from the page altogether**, so the message is the owner's _only_ notice that
something they built is not being published. It is the same sentence in both places by decision 6, and
that is still right — three voices would read as three problems — but the second case is the one where
the mark failing to appear would cost the most.

**A time is the one field where nothing outlives the screen**, and that asymmetry is deliberate — §7.10
gives the reason.

### 7.10 The hours screen

**Seven days stay, made short, and the times carry down wearing where they came from.** This is one
question with seven parts, not seven questions (§7.2).

- **Each day is one line**: the day, then a segmented control showing all three of §2.3's states at once —
  **`Open · Closed · Not shown`**. There is no `<select>`. Three states that need no opening is what makes
  a closed or an unshown day cost a line rather than a block.
- **`Not shown` names the consequence rather than our vocabulary**, because the consequence is a deletion.
  An unspecified day gets no row on the exported page at all, so a customer cannot tell it from a closed
  one. §2.3 leaves the page's silence alone — there it is §7.3 working correctly — but the control has to
  make clear that this third state **removes the day from the page**, which is a stronger requirement than
  merely giving the state a readable name.
- **Opening a day that holds nothing takes the last times the owner typed**, and **says so**: _"Same as
  Mon — change it below if it isn't."_ The line survives until the owner touches that day's times, and
  then goes, because touching it makes the answer theirs again. A day that already holds times keeps them:
  reopening is never a reason to overwrite an answer.
- **Explicit bulk survives alongside the carry**, as _Copy these times… → to weekdays / to every day_, from
  a day already filled in. The carry is the implicit path and the copy the deliberate one; they are not
  redundant, and the third errand below is why.
- **Entry does not acknowledge hours past midnight**, deliberately. `20:00–02:00` is enterable and renders
  literally, so a control would only add a name for something that already works — vocabulary the owner
  must learn in order to dismiss, which is what §7.9's banned words guard against from the other side. An
  owner who wants to explain it has the free-text note (§2.3).

> **Marked rather than silent was the real §7.3 call.** A carried time is not a default — it is the
> owner's own answer, moved. But **§7.3's teeth are in _never notices_, not in whose value it was**: tap
> _Open_ on Thursday on the way to _Closed_, tap away, and a silent carry has published 9–5 on a day the
> business meant to shut. The line costs 77 px across a full week, and is the cheapest thing on the screen
> to ignore once it is true.
>
> **The measurements are the argument, so they are recorded.** Today's screen is **1516 px tall on an
> 844 px viewport**, with `Continue` below all of it, and `Mon–Fri 9–5` costs **15 interactions**. Density
> alone takes 1504 px to 1363 px and stops, **because the height was never the day rows** — five open days
> cost five time rows, and compressing the day rows cannot touch them. So the carry, not the layout, is
> what buys anything; and it buys it on the week no _copy_ can help. Mon–Thu 9–5, Fri 9–9, Sat 10–4 goes
> from about 60 keystrokes to about 25.
>
> **Two shapes that lost are worth naming.** A statement list whose unit is a _span of days_ rather than a
> day was strongest on every number, because there a lunch closure is simply a second sentence; it lost on
> judgement of the whole and is the one to revisit if this is ever reopened. A shape with one shared
> open/close pair won the easy week outright and then collapsed on a restaurant open 11–2 _and_ 5–9,
> because a single shared pair is exactly what a second interval cannot use.

#### The time control is ours, not the browser's

**`<input type="time">` is replaced by a text box that takes a time the way an owner would say it** — `9`,
`930`, `9:30`, `9.30`, `9am`, `9:30 pm`, `17:00` — and reads the stored time back.

**The argument is speed, not the clock.** The clock mismatch is the prettiest reason and the weakest:
storage is 24-hour either way (§2.3) and the page is always right, so an owner reading `17:00` back from a
page that says `5:00 pm` has friction rather than a wrong fact. What decided it is that the native picker
costs about five presses against one for a typed `9`, on the screen this section has just spent its whole
budget making cheaper — and that a browser clipping `10:00 AM` to `0:00 AM` at a phone width **cannot be
fixed while the control is the browser's**. The clock alignment then arrives free, which is the right
order to hold these reasons in.

> **The cheap way out was checked first and does not exist.** The page's `lang` has no influence on how the
> native control renders; the browser's own locale governs it entirely. The same document containing
> `<input type="time" value="14:30">` shows `02:30 PM` under one browser locale and `14:30` under another.
> Declaring the page's convention and letting the control conform was never available.

**The box rewrites what was typed** — `9am` becomes `9:00 AM`, or `09:00` if the owner has set _How times
read_ to 24-hour. **This is the one place §2.3's _mend the target, never the text_ does not reach, and the
difference is worth stating rather than assuming.** Phone, email and the URLs are the owner's text plus a
derived target, so the text is protected and the target is mended quietly. **A time has no text**: §2.3
stores only `"HH:MM"` and the page prints it through `clock`, so the stored value _is_ the derived target
and the box is a view of it. There is nothing of the owner's to preserve, and the rewrite is the cheapest
confirmation that we understood them. §7.9's _a successful mend is silent_ still holds — a rewritten box is
not an announcement.

**What the box accepts is short because its vocabulary is the page's**: digits, a separator, and `am`/`pm`.
**Not `noon`, not `midnight`** — the page will never print either word back (§2.5), so they would be a
kindness only English speakers can reach, for a convention the page does not have.

**An unreadable time is said and then dropped, and nothing outlives the screen.** §7.9's line on
`Continue`, blocking nothing; then the value is simply not stored. This used to read _on leaving the field
and again on `Continue`_ — §7.9's speak-on-blur position, which **decision 2 replaced (#142)** and this
sentence was never brought along with. The code has judged on `Continue` only ever since: `TimeBox` commits
`onBlur`, but takes its message from `useJudged`, the same submit-time judge `TextField` uses. The stale
half sat here long enough to nearly turn a build into an escalation (#294), which is the argument for
correcting it in place rather than quietly. **This is the one field where §7.9's mark does not extend past
the screen, and that is deliberate.** The other four store the owner's text, so the page carries it and
only the machine target is missing — the mark can be re-derived from the file forever. A refused time
never enters the file at all, so carrying a mark would mean storing a value that is not page content and
never will be: a §4.8 schema change that no other field asks for, and one that inverts §4.4's whole
posture.

> **The renderer's existing rule is what makes this safe**, and it is load-bearing rather than incidental:
> an open day whose intervals all fail to parse **drops back to unspecified** rather than surviving as
> present-and-empty, which §2.3 would print as _Closed_. So an unreadable time can never publish "we're
> shut" on a day the business is open. **The known cost is that a lost second interval of a split shift is
> far less visible than a lost day**, and that should not have to be discovered again later.

**The convention is taught once**, as a second sentence in the hint the screen already has: _"Type times how
you'd say them. Leave a day alone if you'd rather not say."_ Zero new chrome on the screen this section has
just spent its budget shortening, and the convention taught once rather than fourteen times. Placeholders
stay as a quiet second example and are not carrying the teaching on their own.

**Costs taken knowingly.** We own a parser from here on. We lose the free accessibility and free
localisation of the entry convention. And **iOS loses its drum-roll picker** — genuinely good under a thumb,
the single biggest thing given up here, and still unjudged on a real phone (§11).

> **Sequencing worth knowing:** on a first run the owner enters every time _before_ they have ever seen _How
> times read_, which lives at the foot of the review list's How-it-looks step and appears only once there
> are hours to read. So the first echo is always the seeded default (§4.1), and it can change under them
> later. Accepted — it changes a display, never a fact.

### 7.11 Motion

**The builder's motion language is _frame_: still chrome, fading content** (#140). A run's chrome —
§7.2's bar, and any footer the wizard gains — **never animates and never remounts**. Only the content
between moves. This is paper's own physics: the sheet stays put, what is written on it changes. The
diagnosis that produced it, judged live against a whole-surface alternative: _animating the whole page
reads as a layout shift, not motion._

- **The one verb is the fade.** A screen change is fade out (~170ms, ease-in), swap, fade in (~320ms,
  ease-out) — identical forwards, on `Back`, on a jump, and on the preset pick. Translation lost on
  contact; nothing slides, so nothing ever implies elevation, which is §7.4 violated in time rather
  than in space.
- **The bar advances by tween, never by remount** — its fill slides to the new width (~500ms,
  ease-out). This falls out of the bar being static chrome, and it is the fix for the bar blinking
  along with every screen. **It is the language's one movement that is not a fade**, so it is a
  named class in the stylesheet like the fades are, and never a duration written on an element:
  motion nobody can select is motion the rule below cannot reach (#246).
- **The drawer fades**, and §7.6's run-end arrival — the finished page rising to meet the owner — is a
  fade-in, the language's one set-piece.
- **The list moves exactly as the flow does** (§7.1: both or neither) — **one set of verbs across
  both screens, and the list has fewer events to spend them on.** Both roots carry the same 320ms
  arrival fade, and that is what "both or neither" holds: neither screen may grow motion the other
  does not have. It is a rule about the _language_, not a promise that every gesture on one screen
  has a counterpart on the other. **So opening a review row runs nothing, deliberately** (#247).
  The fade is the verb for a **screen change**, and it works because the frame holds still while
  the content inside it swaps; a row opening is the frame itself changing — the rows below move
  313px. Both ways of animating it were built and photographed rather than argued: scoped to the
  row body, the rows below jump at full speed and a 313px hole stands open for 320ms while the
  editor fades into it, so the fade lags the layout instead of carrying it; scoped to the whole
  surface, every row ghosts over its own new position, which is the whole-surface alternative
  §7.11's own diagnosis rejected, in the words at the top of this section. **The list is still
  here because the language has no verb for this, not because it was forgotten** — and #190's
  reading that the open row's Save _is_ the flow's Continue is untouched by that: what the two
  screens share is the question and its shell, not the transport between questions.
- **§7.9's messages are ordinary content** — they appear with standard form validation and carry no
  arrival choreography of their own (#142).
- **`prefers-reduced-motion` shortens every duration toward instant rather than substituting a
  lesser language** — **every**, the bar's tween included. This used to read _"honest by
  construction: the language is already opacity-only"_, and that reason was not true: the bar
  widens, which is the one thing here that is not opacity. The reason mattered, because a language
  that is reduced by construction is a language nobody has to maintain a rule for — so the tween
  was written on the element, out of the stylesheet's reach, and under `reduce` the bar was the
  only thing on the screen still moving, for **483 ms after everything else had settled** (#246).
  A reader who asks for less motion should not be left with the most. Collapsing the tween is not
  the blink the tween exists to prevent: that blink was a _remount_, and the fill keeps its
  identity and only stops interpolating. **So it is a rule, not a property**, and the rule is
  worth what its coverage is worth — twice now it has missed something (#201, #246), and both
  times the thing it missed was a duration written somewhere it did not look.
- **Motion is reviewed the way it was judged — a person walking flow and list on a phone.**
  `scripts/review-shots.mjs` remains the appearance ritual; stills cannot review motion, and no
  automated capture is added. The language is a handful of named classes, so the review is
  read-then-walk.

Durations are felt-approved indicative values from the #140 prototype; the decision is the frame and
the verb, and implementation tunes within them. Nothing here touches the exported page (invariant 4).

### 7.12 Accessibility

**The builder makes no conformance claim.** It commits to six things, each with a standing test behind
it, and **each line says what its test actually reaches** — because _"the rule is in the stylesheet"_
and _"the ring appears on screen"_ are different facts, and the gap between them is where accessibility
defects live. A dead tab stop survived 847 green tests here.

1. **The tool's own text clears 4.5:1 against both of its backdrops.** _Measured_ — the test computes
   the ratio.
2. **A focus ring is painted on every tab stop, and the line owns it.** _Measured_ — a browser walk
   presses Tab around every screen of the builder at both of §7.6's sizes and reads what focus
   painted on each stop: an outline of at least 2px that was not there at rest, or, on the fields
   that are a line, the bottom border thickening instead. It reaches 17 screens and every stop on
   them — 133 at 390, 144 at 1440. **jsdom could never say this**: `:focus-visible` is a judgement
   about how focus arrived, so the browser is the only instrument that can be asked. What Chromium
   computes, on every stop but the preview iframe — the one place a ring was not observed, and the
   one place the browser rather than the builder decides.
3. **What the tool covers, it puts out of reach, and what it leaves on the glass stays in reach.**
   _Measured_ — the same browser walk counts every control each screen is showing and then presses
   Tab around it, at both of §7.6's sizes: **159 controls over 17 screens, 133 of them reachable at
   390 and 144 at 1440**. Two screens account for the whole difference. On the review list at 390
   the preview page comes down over the column, and **2 of its 13 controls stay in reach** — _Edit
   your page_ and _Download_, the two the drawer put on its own glass, so that what it covers is
   not a dead end; the other 11 are still on the page and the keyboard cannot get to any of them.
   Behind §7.7's download sheet, 3 of 18. **jsdom does not implement `inert`** — it neither blocks
   focus nor prunes the tree — so the attribute was all its test could see, and that test still
   holds where the statement is. The measurement is of what Tab reaches, which is the one question
   both of the tool's two mechanisms answer: the drawer holds the keyboard out with `inert`, the
   sheet holds it in with a focus trap, and those are not the same guarantee.
4. **Motion collapses under `prefers-reduced-motion`.** _Guarded at the stylesheet_ — the `@media`
   block must exist, be non-empty, and name every duration a screen change runs. Durations are not
   measured by a standing test.
5. **Every control the keyboard reaches clears the tap floor**, except the deliberate inline
   weight and §7.2's progress bar header. _Measured_ — the same browser walk reads the rendered box
   of every tab stop at both of §7.6's sizes and holds it to `tap`'s 44px: 133 stops at 390, 144 at 1440. **A control is not always its own target**, and a check that read only the control would
   fail fourteen honest ones at each width — the 20×20 checkboxes are pressed through a 350×44
   `<label>`, §7.10's 1×1 day modes through a 98×44 one, and the web-address box through the ruled
   line it stands on. So what is measured is the label or the line, and only where the browser or a
   declared hook says the press is forwarded. Height is the axis, because `tap` is a `min-height`
   and most controls here must not take a width floor; `tap-square` is for glyph buttons and this
   walk reaches none. **Two controls are under it, and they account for thirteen stops at each
   width** — the check prints both numbers every run, because they are not the same number and the
   larger one is the honest one. The `inline` weight is the deliberate one this line has always
   carried — a word inside a sentence, which 44px would push apart; it is one control and one stop.
   The other is §7.2's bar header at 350×36, **a real miss the class string could not see because
   it never read that button** (#305) — one control the walk meets on twelve screens, which is the
   whole of the difference. Both are named in the check, and a third fails it.
6. **One control, one accessible name.** _Guarded at the rendered tree_ — the three screens that open
   a file dialog are mounted, and so is the shared `FilePicker` they all follow, whose own test counts
   the named controls it renders rather than asserting an absence. `getByRole` matches strictly, so a
   second name for one action fails. jsdom gives `<input type="file">` no role, so that count is over
   the attributes a name is computed from; the roles themselves were read once, in Chromium.

**What these are checked against.** What the browser exposes to assistive technology — names, roles,
focus order, what is and is not reachable. **Not what a screen reader announces.** No screen-reader
pass has been done, and none is claimed.

**What this does not cover.** Colour swatches, where the colour is the content and a ratio is
meaningless. The preview's contents, which are the exported page and answer to §6.8. The colours an
owner chooses, which §3.4 reports on and does not refuse.

**The exported page has a check of its own.** `axe-core` runs over it in CI — every shape, both
modes, both widths — tagged **WCAG 2.2 A and AA plus axe's `best-practice` rules**, because the
WCAG tags alone silently drop 30 of axe's 105 rules, `tabindex` and `heading-order` among them.
That makes §6.8's claim _checked_, never _proven_: the 23-of-55 ceiling below applies to it too.

**The builder's own screens are swept by the same checker under the same tags, and that tier's
findings are hand-read.** `pnpm a11y` drives the real flow in Chromium — every wizard step, §7.9's refusal, the
review list, every row opened, the download sheet, the menu and the import fork, at both of §7.6's
sizes. **Nothing it finds gates a merge**, deliberately, the way §7.4's appearance ritual does not
— but CI does run it, and fails when it reports it could not see (§5.3's `Instrument health` job,
#339). The three rules it reports today are a successor effort's, and the job passes them on
purpose.
Reaching the list takes sixty-odd driven steps, and the check would not have caught #254, #255,
#244 or #246. **The two tiers are not interchangeable**: the exported page's is a gate and this one
is a report for a person, and the six commitments above do not rest on it.

**What it must not be read as saying.** That the builder meets WCAG 2.2 AA. It may well; nobody has
checked. Of 55 A and AA criteria, an automated checker reaches 23, and every defect this project has
found sat in the other 32.

---

## 8. Getting the page online

**We describe the shape of the problem. We do not write steps, and we name no hosts.**

That is the decision, and it is not a deferral. An earlier draft of this section deferred the
walkthrough until someone had walked it; the walkthrough is now ruled out entirely, which is a
different and better answer.

### Why no steps

Three reasons, and the first is the one that decides it.

**Steps rot and we cannot maintain them.** Every host redesigns its uploader, moves its free tier and
rewrites its terms, on its own schedule, without telling us. A page of instructions in this tool is
wrong from some unannounced date onward, and the owner cannot tell the difference between a step we
got wrong and a step that used to work. Copy with no steps in it cannot go stale — which is why every
option for _managing_ staleness felt unsatisfying: the problem was the steps, not the maintenance.

**Naming a host is a recommendation, and a recommendation carries a shelf life and a liability.** The
moment we print a name we have told a business owner where to put their livelihood, on the strength
of terms we read once. See the licence trap below for how quickly that goes wrong.

**We have not walked them.** That was the original reason, and it still holds — but it is now the
least important of the three, because even a walked path would rot.

### What the copy does instead

**Explain the shape.** The owner has one file. Somewhere on the internet, a computer has to hand that
file to anyone who asks for it. That is the whole of it: no database, no account with us, no software
running anywhere. **Every hosting option is the same idea wearing different clothes** — a service you
drag the file onto, a bucket on a cloud provider, a folder on a server someone already rents.

That single idea is worth more to a non-technical owner than any set of steps, because it is what lets
them recognise a workable answer when someone offers them one.

**Name the kinds of place, not the places.**

- **Someone who already looks after your website.** First, because it is the only route that needs no
  verification from us and no learning from them: the file is an ordinary web page, and anyone who
  does this for a living will know what to do with it in a minute.
- **A service you drag a file onto.** These exist, several are free, and this is the shortest path for
  an owner doing it themselves.
- **Object storage on a cloud provider.** This is the plumbing under most of the others. Worth naming
  because it is what a technical helper will reach for, and worth _not_ recommending directly: it
  means an account, a bucket, a public-access setting and a region, which is a developer's afternoon
  and not a shopkeeper's.

**Say which device this is easier on.** The editing screen is mobile-first (§7.6), so the owner may
well reach this sheet on a phone — and dragging a file onto a web service is a desktop-shaped
interaction almost everywhere. Rather than verify that claim host by host and re-verify it forever,
the copy simply says it is usually easier on a computer and worth waiting for one. **That is true
whichever way the phone path happens to work**, which is the point: it protects a mobile-first
audience from a dead end without depending on a fact that would rot like every other step.

**Tell them how to get current steps.** Say plainly that instructions change, that we deliberately do
not carry them, and that asking an AI assistant — or a search engine, or the person in the previous
paragraph — for the steps for whichever service they picked will get them something current in a way
a page in this tool never can.

**And give them a check that does not depend on the instructions being right.** This is the part that
makes the previous paragraph safe rather than a shrug. An AI assistant will produce confident,
outdated, plausible steps, and **this owner is precisely the person who cannot audit them.** So the
copy must not send them off with instructions and no way to grade the result. It tells them what
success looks like:

> **You have a web address, and opening it on someone else's phone shows your page.**

Someone else's, because their own browser may be showing them a file from their own computer. That
test is independent of every step that preceded it, and an owner who applies it cannot be quietly
left with a page only they can see.

### Two things the copy must say outright

**Free does not always mean allowed.** At least two well-known free hosts will serve this page
perfectly and forbid it in their terms — one is non-commercial only, with a definition that explicitly
covers advertising a service, and another rules out running your business on it. This is exactly the
trap a business owner falls into and never finds out about until it matters. We say the trap exists;
we do not police it. Note the asymmetry that makes this easy to get wrong: the same host may be
entirely legitimate for hosting _the builder_.

**Your link will look plain when you share it.** Paste the address into a message and it appears as
text with no picture. `og:image` is structurally impossible for any single-file tool (§6.4) — there is
no second file for a scraper to fetch — so this is permanent, not a bug and not a missing feature. An
owner who is not told will assume something broke.

### What this is not

**We do not deploy on the owner's behalf, and this section is not a step toward doing so.** Constraint
6 says the last mile is guidance rather than integration, and the reason is not squeamishness: a
deploy button needs credentials, a server to hold them and someone to answer when it breaks, and that
is a hosting business rather than a feature. If it were ever wanted it should be built and priced as
one, by someone who wants to run it — not smuggled into a free static tool as a convenience.
---

## 9. Non-goals

Ruled out on purpose. The first contributor to ask "why not?" has a written answer here.

| Not doing                                              | Why                                                                                                                                          |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Click analytics, visitor tracking**                  | Needs a backend to record events. Whether a paste-your-own-snippet field is acceptable is deliberately left undecided rather than pulled in. |
| **Contact and lead-capture forms**                     | A form POST needs a server. `mailto:` and `tel:` links in the contact section are the substitute.                                            |
| **Custom domain setup**                                | DNS is owned by whichever host the owner picks, not by an export tool. May survive only as a link in the walkthrough.                        |
| **Multi-page sites**                                   | This is the line between a link page and a website builder. One page, one file, one export.                                                  |
| **Reordering sections**                                | §2.1. Additive later if ever wanted.                                                                                                         |
| **Drag-and-drop button reordering**                    | §7.5.                                                                                                                                        |
| **A "featured" link flag**                             | §2.3 — position is the emphasis mechanism.                                                                                                   |
| **An announcement banner**                             | §2.2 — the update model is wrong for time-sensitive content.                                                                                 |
| **Icon or image uploads for links**                    | §2.4.                                                                                                                                        |
| **Publishing on the owner's behalf**                   | Constraint 6. There is no backend to publish from.                                                                                           |
| **Tracking whether the file was uploaded**             | §7.7.                                                                                                                                        |
| **Editing directly on the previewed page**             | §5.2 — it costs the preview-is-the-export guarantee.                                                                                         |
| **WebP / AVIF export**                                 | §6.6.                                                                                                                                        |
| **Round-trip payload in the exported HTML**            | §6.7.                                                                                                                                        |
| **Publishing the renderer to npm**                     | Not in v1.                                                                                                                                   |
| **Collapsing "Mon–Fri" on the page**                   | §2.3 — refused on the absence of a complaint, not on difficulty. The dispatching rule is recorded there.                                     |
| **A progress indicator in the flow**                   | §7.2 — no honest global count exists; the page is the progress display.                                                                      |
| **Blocking `Continue` on the shape of an answer**      | §7.9 — our rules go stale and the owner's phone number does not.                                                                             |
| **Learning, inferring or asking the owner's country**  | §2.3 — it would make a wrong `lang` region harmful, where §4.1 keeps it harmless.                                                            |
| **A phone-number mask, or a phone-metadata library**   | §2.3 — the mask rewrites the owner's text; the library needs the country we declined.                                                        |
| **Turning a social handle into a URL**                 | §2.3 — _handle_ is not one concept, and a template table goes stale silently.                                                                |
| **Computing a name for the owner's colour**            | §3.1 — naming their brand is a claim we cannot check.                                                                                        |
| **Asking the owner for the page's language**           | §4.1 — a screen spent on a consequence the owner cannot predict.                                                                             |
| **`<input type="time">` in the builder**               | §7.10 — five presses against one, and a clipping bug we cannot reach.                                                                        |
| **Tailwind, or any CSS toolchain, in the renderer**    | §5.1 — the export's CSS is derived per project, and §6.7 must not depend on a third party's output ordering.                                 |
| **Dark mode in the builder**                           | §7.4 — a dark surround changes how the owner's colour reads.                                                                                 |
| **A standing visual-regression suite for the builder** | §7.4 — precisely the flaky instrument `retries: 0` already refuses.                                                                          |
| **A _visible_ heading on the exported hours panel**    | §6.9 — §2.5 now spends a word on a visually hidden one; on screen the glyph is what names the panel.                                         |

---

## 10. Deferred past v1

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

6. **Whether `svh` behaves as reasoned on a real phone.** §6.2 centres a short page with
   `min-height:100svh` specifically so that the content does not recentre when a mobile URL bar hides.
   Headless Chromium reports `svh`, `dvh` and `lvh` as equal, so the choice between them **cannot be
   demonstrated here at all**. It is one glance at one page on one real phone, and it is the first thing
   that phone should do.

7. **What a real phone says about the decisions §7.10 already took.** Every measurement behind §7.10 and
   §7.2 is Chromium at a phone viewport, which is not a phone. Three things need a finger and an iOS
   Safari rather than a viewport:

   - **The typed time box under a thumb and an iOS keyboard.** §7.10 replaced the native control, so
     **iOS's drum-roll picker is not a thing we are choosing between — it is a thing we have decided to
     give up unseen.** That is the largest untested consequence in this document.
   - **The segmented three-state control at finger accuracy.** Three targets on one line, on the screen
     §7.10 spent its whole budget shortening.
   - **The native pickers generally**, which is where a viewport-only walk is weakest.

   Recorded as one item rather than as a checklist against each decision, because it is one sitting with a
   device, and because none of it changes a decision above — each could change a constant or a control.

8. **The final icon and social-platform lists.** ~~The mechanism is decided (§2.4); the contents are
   transcription.~~ **Settled** — both lists are enumerated in §2.4, along with the membership rule
   that keeps them honest: a glyph earns its place only by serving a preset suggestion in §7.3, and
   that is asserted in both directions, so an unserved suggestion and an unused glyph each fail the
   build.

---

## 12. Provenance

Every decision in this document was made in a wayfinder effort recorded on this repository's issue
tracker, and each decision's full reasoning — including the options rejected and why — lives on its own
closed issue. Where this spec says "was rejected", the argument is there.

- **[Map: linkpage v1 spec and scaffolded repo](../../issues/1)** produced this document.
- **[Map: the version after beta — polish the builder and the page](../../issues/76)** amended it, after
  `v0.9.0-beta` was released and the built product was walked. Its thirteen decisions are what changed
  §2.3, §2.5, §3.1, §3.2, §3.3, §4.1, §5.1, §5.3, §6.2, §6.5, §6.9, §7.2, §7.3, §7.4, §7.6, §7.7, §7.9,
  §7.10, §9 and §11 — including two places where **this document was found to be claiming more than was
  true**, and says so in place rather than quietly correcting itself.

This document is the destination of both efforts. **Implementation was a third, and it is finished:**
[After the beta: build order](../../issues/116) turned the amended document into fourteen tickets and
closed all of them, which is what `v1.0.0` tags.

Worth recording, because it is the argument for building from a document rather than trusting one:
**six errors in this specification were found by implementing it**, every one caught by a test or a
screenshot rather than by re-reading. The closing comment on that build order lists them. The recurring
shape is a document asserting something the code has never done.
