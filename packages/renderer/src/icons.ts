/**
 * The curated icon set, vendored into the renderer as inline SVG (`SPEC.md` §2.4).
 *
 * The renderer declares no dependencies (§5.1), so it cannot import an icon library —
 * whatever it uses has to be copied in, with attribution. That constraint is what makes the
 * set **small and closed**, which suits the rest of the design: the owner picks a glyph from
 * a short list rather than hunting through ten thousand of them, and no icon can be
 * uploaded (§2.4), so a blurry JPEG never sits where a crisp glyph belongs.
 *
 * **Sources and licences** — the full text lives in `NOTICES` at the repository root.
 *
 * - Generic glyphs: **Lucide** (ISC). Some are derived from Feather (MIT).
 * - Social brand marks: **Simple Icons** (CC0).
 * - **Font Awesome Free is specifically avoided:** CC BY 4.0 attaches an attribution
 *   obligation that would follow every exported page, and this tool exports a file the owner
 *   then owns outright.
 *
 * **Why the geometry is stored as markup rather than as a bare `d` string.** Several Lucide
 * glyphs are drawn with `<circle>` and `<rect>` as well as `<path>`. Flattening those to
 * path data by hand is a silent-visual-bug risk for no gain, so each glyph keeps the exact
 * body Lucide ships and `glyphSvg` supplies the wrapper. `icons.test.ts` holds the bodies to
 * a strict element and attribute allowlist, so "it is markup" does not mean "it is
 * arbitrary markup".
 *
 * **Only the glyphs a page references are emitted.** `iconSvg` is called per link, so the
 * set's size costs the export nothing — which matters against the ≤ 30 KB chrome budget
 * (§6.5).
 *
 * **Everything here is total** (§4.7). `iconSvg` and `socialIconSvg` take `unknown`, because
 * what reaches them came out of a hand-editable `project.json`; a wrong-typed or
 * unrecognised value reads as absent rather than throwing.
 */

/**
 * The closed set of link-button glyphs (`Link.icon`).
 *
 * Each entry earns its place by serving a preset suggestion in §7.3 — the mapping is in the
 * spec's table and is asserted in `icons.test.ts`, so an unused glyph or an unserved
 * suggestion both fail the build. `link` is the exception: it is the fallback for an
 * unrecognised social platform (§4.4), the one glyph that exists for a case the owner never
 * deliberately creates.
 */
export const ICON_NAMES = [
  "menu",
  "cart",
  "bag",
  "shop",
  "calendar",
  "location",
  "phone",
  "mail",
  "message",
  "document",
  "price",
  "services",
  "portfolio",
  "link",
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/**
 * The platforms with a vendored brand mark.
 *
 * **This is not the set of platforms a project may name.** `SocialLink.platform` stays an
 * open string: behind an unrecognised value is a URL the owner typed, so the entry is kept
 * and rendered with the `link` glyph (§4.4). This list decides only which entries get a
 * brand mark instead.
 *
 * **LinkedIn is absent, and not by preference.** Simple Icons removed the mark at LinkedIn's
 * request, and the alternative sources carry the attribution obligation §2.4 exists to
 * avoid. A LinkedIn URL still renders — with the generic glyph — which is the same mechanism
 * that carries every platform this list does not yet name.
 */
export const SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "x",
  "tiktok",
  "youtube",
  "whatsapp",
  "pinterest",
  "threads",
  "bluesky",
  "mastodon",
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

/** The glyph shown for a social entry whose platform we do not recognise (§4.4). */
export const FALLBACK_ICON = "link" satisfies IconName;

/**
 * One vendored glyph.
 *
 * `draw` decides the paint attributes on the wrapper, and the two families genuinely differ:
 * Lucide is a 24×24 stroked outline, Simple Icons a 24×24 filled silhouette. Both are drawn
 * in `currentColor`, so a glyph takes the colour of the text beside it and the palette
 * (§3.2) reaches it without knowing it exists.
 */
export interface Glyph {
  readonly draw: "stroke" | "fill";
  /** The `<svg>` element's children, exactly as the source ships them. */
  readonly body: string;
}

/** A brand mark, plus the platform's own spelling of its name. */
export interface SocialGlyph extends Glyph {
  /**
   * The platform's proper name — `"TikTok"`, not `"tiktok"`.
   *
   * A social link whose only visible content is a brand mark still needs an accessible name,
   * and the renderer cannot capitalise a platform identifier correctly by rule.
   */
  readonly label: string;
}

/** Lucide, ISC. See `NOTICES`. */
export const ICONS: Readonly<Record<IconName, Glyph>> = {
  menu: {
    draw: "stroke",
    body: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  },
  cart: {
    draw: "stroke",
    body: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  },
  bag: {
    draw: "stroke",
    body: '<path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>',
  },
  shop: {
    draw: "stroke",
    body: '<path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5"/><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244"/><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05"/>',
  },
  calendar: {
    draw: "stroke",
    body: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>',
  },
  location: {
    draw: "stroke",
    body: '<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  },
  phone: {
    draw: "stroke",
    body: '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>',
  },
  mail: {
    draw: "stroke",
    body: '<path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/><rect x="2" y="4" width="20" height="16" rx="2"/>',
  },
  message: {
    draw: "stroke",
    body: '<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>',
  },
  document: {
    draw: "stroke",
    body: '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  },
  price: {
    draw: "stroke",
    body: '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  },
  services: {
    draw: "stroke",
    body: '<path d="M3 5h.01"/><path d="M3 12h.01"/><path d="M3 19h.01"/><path d="M8 5h13"/><path d="M8 12h13"/><path d="M8 19h13"/>',
  },
  portfolio: {
    draw: "stroke",
    body: '<path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/>',
  },
  link: {
    draw: "stroke",
    body: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  },
};

/** Simple Icons, CC0. See `NOTICES`. */
export const SOCIAL_MARKS: Readonly<Record<SocialPlatform, SocialGlyph>> = {
  instagram: {
    draw: "fill",
    label: "Instagram",
    body: '<path d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>',
  },
  facebook: {
    draw: "fill",
    label: "Facebook",
    body: '<path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>',
  },
  x: {
    draw: "fill",
    label: "X",
    body: '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/>',
  },
  tiktok: {
    draw: "fill",
    label: "TikTok",
    body: '<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>',
  },
  youtube: {
    draw: "fill",
    label: "YouTube",
    body: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
  },
  whatsapp: {
    draw: "fill",
    label: "WhatsApp",
    body: '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>',
  },
  pinterest: {
    draw: "fill",
    label: "Pinterest",
    body: '<path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>',
  },
  threads: {
    draw: "fill",
    label: "Threads",
    body: '<path d="M18.263 11.097c-.03-3.486-1.92-5.586-5.111-5.586-2.13 0-3.922.963-4.863 2.499l2.062 1.438c.535-.843 1.272-1.543 2.628-1.543 1.528 0 2.318.85 2.544 2.431a15 15 0 0 0-2.236-.173c-4.125 0-6.068 1.867-6.068 4.336s1.943 3.99 4.804 3.99c3.139 0 5.013-2.115 5.781-4.735.798.361 1.348 1.204 1.348 2.47 0 3.387-3.907 5.232-7.22 5.232-4.885 0-8.077-3.207-8.077-8.424 0-6.392 4.223-10.487 9.9-10.487 3.808 0 5.69 1.671 6.97 3.914l2.108-1.475C21.44 2.078 18.331 0 13.663 0 6.227 0 1.168 5.277 1.168 12.934c0 7 4.953 11.066 10.856 11.066 4.878 0 9.809-2.846 9.809-7.716 0-2.545-1.46-4.231-3.569-5.187m-6.33 4.855c-1.077 0-2.026-.512-2.026-1.453 0-1.483 1.822-1.934 3.606-1.934.678 0 1.34.045 1.927.173-.422 1.927-1.671 3.215-3.508 3.214Z"/>',
  },
  bluesky: {
    draw: "fill",
    label: "Bluesky",
    body: '<path d="M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026"/>',
  },
  mastodon: {
    draw: "fill",
    label: "Mastodon",
    body: '<path d="M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z"/>',
  },
};

/**
 * The class every emitted glyph carries, so the renderer's stylesheet can size and align the
 * whole family with one rule.
 */
export const ICON_CLASS = "lp-icon";

const STROKE_PAINT =
  'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
const FILL_PAINT = 'fill="currentColor"';

export function isIconName(value: unknown): value is IconName {
  return typeof value === "string" && Object.hasOwn(ICONS, value);
}

/**
 * An exact platform key, and nothing else.
 *
 * Kept strict deliberately, now that `socialPlatform` below matches loosely: this narrows to
 * `SocialPlatform`, so a caller that passed `"Instagram"` and got `true` would go on to index
 * `SOCIAL_MARKS` with a key that is not in it. A type guard has to be honest about the value it
 * was handed, not about the value it could be turned into.
 */
export function isSocialPlatform(value: unknown): value is SocialPlatform {
  return typeof value === "string" && Object.hasOwn(SOCIAL_MARKS, value);
}

/**
 * However the owner wrote a platform, resolved to the key we hold a mark under.
 *
 * **The owner types this, so the owner's capitalisation has to work.** The builder offers the
 * ten as completions whose *label* reads `Instagram` while their *value* is `instagram` — so
 * anyone who typed what the list showed them, rather than picking it with a mouse, stored
 * `"Instagram"`, matched nothing, and silently got the generic glyph and a bare domain in place
 * of their brand mark. Worse, that outcome is indistinguishable from the legitimate one this
 * fallback exists for (LinkedIn, and anything else with no vendored mark), so it read as a
 * decision rather than a fault.
 *
 * Matching here rather than normalising on the way in, because §4.4 keeps `platform` as the
 * owner's data: `project.json` goes on holding what they typed, and a builder that later learns
 * a mark for it still has the original string to work from.
 *
 * `toLowerCase` and not `toLocaleLowerCase`: these keys are ASCII identifiers, and a Turkish
 * locale would fold `INSTAGRAM` to `ınstagram` and match nothing.
 */
export function socialPlatform(value: unknown): SocialPlatform | undefined {
  if (typeof value !== "string") return undefined;
  const key = value.trim().toLowerCase();
  // `Object.hasOwn`, so `"constructor"` and `"__proto__"` are misses rather than inherited hits.
  return Object.hasOwn(SOCIAL_MARKS, key) ? (key as SocialPlatform) : undefined;
}

/**
 * Wrap a glyph in its `<svg>`.
 *
 * `width`/`height` are `1em` rather than a pixel size so a glyph tracks the text it sits
 * beside without the stylesheet having to say so — and so the markup is still right if the
 * CSS is ever scoped away.
 *
 * **`aria-hidden`, always.** A glyph is decoration: the link's label carries the meaning, and
 * a social link's accessible name is the caller's job (`SocialGlyph.label` exists for exactly
 * that). An icon that announced itself would double every link button in a screen reader.
 */
export function glyphSvg(glyph: Glyph): string {
  const paint = glyph.draw === "stroke" ? STROKE_PAINT : FILL_PAINT;
  return (
    `<svg class="${ICON_CLASS}" viewBox="0 0 24 24" width="1em" height="1em" ` +
    `${paint} aria-hidden="true" focusable="false">${glyph.body}</svg>`
  );
}

/**
 * The markup for a link button's icon, or `""` when there is none.
 *
 * An absent icon and an unrecognised one both render as nothing, deliberately: `Link.icon` is
 * a preference with no authored content behind it, so §4.4's fallback rule applies and a link
 * without a glyph is an ordinary, complete link. The unrecognised value is still preserved in
 * `project.json` by the builder (§4.5), so a newer version restores the choice.
 */
export function iconSvg(icon: unknown): string {
  return isIconName(icon) ? glyphSvg(ICONS[icon]) : "";
}

/**
 * The markup for a social entry's brand mark. **Never empty.**
 *
 * This is §4.4's other half: `platform` holds the owner's data, so an unrecognised value is
 * kept rather than dropped and renders with the generic `link` glyph. The link is the point;
 * the icon is decoration.
 */
export function socialIconSvg(platform: unknown): string {
  const resolved = socialPlatform(platform);
  return resolved === undefined ? glyphSvg(ICONS.link) : glyphSvg(SOCIAL_MARKS[resolved]);
}

/**
 * The platform's proper name, or `""` when we do not recognise it.
 *
 * Empty rather than guessed: an unrecognised platform is a string the owner typed, and the
 * renderer has better material for an accessible name — the URL's host — than a
 * capitalisation rule applied to `"my-forum"`.
 */
export function socialLabel(platform: unknown): string {
  const resolved = socialPlatform(platform);
  return resolved === undefined ? "" : SOCIAL_MARKS[resolved].label;
}
