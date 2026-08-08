/**
 * PROTOTYPE — throwaway. Issue #5.
 *
 * A stand-in for `@linkpage/renderer`, which is still a placeholder on `main`. The variants
 * need a preview that looks like a real link page, or every layout question is being judged
 * against a grey box. It follows the spirit of #6 — one document, no script tag, system fonts,
 * no external references — but it is NOT the export spec and nothing here should be copied
 * into the renderer.
 */

import { derive, type Palette } from "./derive.js";
import { DAYS, DAY_LABEL, type Day, type Project } from "./model.js";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONTS: Record<Project["style"]["type"], { heading: string; body: string; extra: string }> = {
  classic: {
    heading: "Georgia, 'Times New Roman', serif",
    body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    extra: "",
  },
  modern: {
    heading: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    body: "system-ui, -apple-system, 'Segoe UI', sans-serif",
    extra:
      "h1{letter-spacing:-.02em}h2{text-transform:uppercase;letter-spacing:.09em;font-size:.72rem}",
  },
  friendly: {
    heading: "'Trebuchet MS', Verdana, sans-serif",
    body: "'Trebuchet MS', Verdana, sans-serif",
    extra: "body{letter-spacing:.01em}",
  },
};

const ICONS: Record<string, string> = {
  link: '<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/>',
  cart: '<circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/><path d="M2 3h2l2.6 12h11.2L21 7H6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  gift: '<rect x="3" y="9" width="18" height="12" rx="1"/><path d="M2 9h20M12 9v12M12 9S9 3 6.5 5 12 9 12 9zM12 9s3-6 5.5-4S12 9 12 9z"/>',
  phone:
    '<path d="M5 3h4l2 5-3 2a13 13 0 0 0 6 6l2-3 5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  "map-pin":
    '<path d="M12 21s7-6 7-11a7 7 0 1 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  star: '<path d="m12 3 2.7 5.7 6.3.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.3-.9z"/>',
  instagram:
    '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1"/>',
  facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v7h4v-7h3l1-4h-4V8.8c0-.5.4-.8 1-.8z"/>',
  tiktok: '<path d="M15 3v9.5a4.5 4.5 0 1 1-4-4.47"/><path d="M15 6.5A5.5 5.5 0 0 0 20 9"/>',
  x: '<path d="m4 4 16 16M20 4 4 20"/>',
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3z"/>',
  linkedin:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 10v7M7 7v.01M11 17v-4a2 2 0 0 1 4 0v4"/>',
  whatsapp: '<path d="M4 20l1.2-3.6A8 8 0 1 1 8 19.2z"/><path d="M9 10c0 3 2 5 5 5"/>',
};

function icon(name: string, size = 20): string {
  const path = ICONS[name] ?? ICONS.link;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

function fmtTime(t: string, clock: "12h" | "24h"): string {
  if (clock === "24h") return t;
  const [h, m] = t.split(":").map(Number) as [number, number];
  const suffix = h < 12 ? "am" : "pm";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hh}${suffix}` : `${hh}:${String(m).padStart(2, "0")}${suffix}`;
}

function hoursRows(p: Project): string {
  return DAYS.map((d: Day) => {
    const iv = p.hours.days[d];
    const value = iv.length
      ? iv.map(([a, b]) => `${fmtTime(a, p.hours.clock)}–${fmtTime(b, p.hours.clock)}`).join(", ")
      : "Closed";
    return `<div class="row"><span>${DAY_LABEL[d]}</span><span>${esc(value)}</span></div>`;
  }).join("");
}

/** Section heading, or nothing at all for the shape that leads with the content. */
function h2(text: string): string {
  return `<h2>${esc(text)}</h2>`;
}

export function renderPage(project: Project): string {
  const pal: Palette = derive(project.style);
  const f = FONTS[project.style.type];
  const r = Math.round(project.style.corners * 16);
  const shape = project.style.shape;
  const name = project.header.name || "Your business name";
  const tagline = project.header.tagline;

  const linkList = project.links.length
    ? `<nav class="links">${project.links
        .map(
          (l) =>
            `<a class="btn" href="${esc(l.url || "#")}">${icon(l.icon)}<span>${esc(l.label || "Untitled link")}</span></a>`,
        )
        .join("")}</nav>`
    : "";

  const sections: string[] = [];
  if (project.on.hours)
    sections.push(
      `<section class="block hours">${h2("Opening hours")}<div class="rows">${hoursRows(project)}</div>${
        project.hours.note ? `<p class="note">${esc(project.hours.note)}</p>` : ""
      }</section>`,
    );
  if (project.on.contact)
    sections.push(
      `<section class="block contact">${h2("Contact")}<div class="pairs">${[
        project.contact.phone
          ? `<a href="tel:${esc(project.contact.phone.replace(/\s/g, ""))}">${icon("phone", 17)}<span>${esc(project.contact.phone)}</span></a>`
          : "",
        project.contact.email
          ? `<a href="mailto:${esc(project.contact.email)}">${icon("mail", 17)}<span>${esc(project.contact.email)}</span></a>`
          : "",
      ].join("")}</div></section>`,
    );
  if (project.on.address)
    sections.push(
      `<section class="block address" itemscope itemtype="https://schema.org/LocalBusiness">${h2("Find us")}<address itemprop="address">${project.address.lines
        .map((l) => esc(l))
        .join("<br>")}</address>${
        project.address.directionsUrl
          ? `<a class="quiet" href="${esc(project.address.directionsUrl)}">${icon("map-pin", 17)}<span>Get directions</span></a>`
          : ""
      }</section>`,
    );
  if (project.on.social)
    sections.push(
      `<section class="block social">${h2("Follow us")}<div class="pills">${project.social
        .map(
          (s) =>
            `<a class="pill" href="${esc(s.url || "#")}" aria-label="${esc(s.platform)}">${icon(s.platform, 18)}</a>`,
        )
        .join("")}</div></section>`,
    );

  const header =
    shape === "colourBlock"
      ? `<header class="head band"><h1>${esc(name)}</h1>${tagline ? `<p>${esc(tagline)}</p>` : ""}</header>`
      : `<header class="head"><h1>${esc(name)}</h1>${tagline ? `<p>${esc(tagline)}</p>` : ""}</header>`;

  const shapeCss: Record<Project["style"]["shape"], string> = {
    centred: `
      .page{max-width:34rem;margin:0 auto;padding:2.5rem 1.25rem 3rem;text-align:center}
      .head h1{font-size:1.85rem}
      .btn{justify-content:center}
      .rows .row{justify-content:space-between}
      .pairs{align-items:center}
      .block{margin-top:2rem}
      h2{color:${pal.accent}}
    `,
    colourBlock: `
      .page{max-width:34rem;margin:0 auto;padding:0 0 3rem;text-align:center}
      .band{background:${pal.buttonFill};color:${pal.buttonText};padding:2.75rem 1.25rem 2.25rem;margin-bottom:1.5rem}
      .band h1{font-size:1.9rem}
      .band p{opacity:.85}
      .body{padding:0 1.25rem}
      .btn{justify-content:center}
      .block{margin-top:2rem}
      h2{color:${pal.accent}}
    `,
    floatingCard: `
      body{background:${pal.surface}}
      .page{max-width:32rem;margin:1.75rem auto;padding:2rem 1.5rem 2.5rem;background:${pal.ground};border-radius:${Math.max(r, 8)}px;box-shadow:0 1px 2px rgba(0,0,0,.06),0 12px 32px rgba(0,0,0,.10)}
      .head h1{font-size:1.7rem}
      .btn{justify-content:center}
      .block{margin-top:1.9rem}
      h2{color:${pal.accent}}
    `,
    ruledLeft: `
      .page{max-width:33rem;margin:0 auto;padding:2.5rem 1.25rem 3rem}
      .head h1{font-size:1.9rem}
      .btn{justify-content:flex-start}
      .block{margin-top:1.6rem;border-top:1px solid ${pal.rule};padding-top:1.4rem}
      h2{color:${pal.accent};border-left:3px solid ${pal.accent};padding-left:.5rem;margin-left:-.75rem}
    `,
  };

  const inner =
    shape === "colourBlock"
      ? `${header}<div class="body">${linkList}${sections.join("")}</div>`
      : `${header}${linkList}${sections.join("")}`;

  return `<!doctype html>
<html lang="${esc(project.lang || "en")}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)}</title>
<meta name="generator" content="linkpage (prototype preview)">
<style>
*{box-sizing:border-box}
body{margin:0;background:${pal.ground};color:${pal.text};font-family:${f.body};line-height:1.5;-webkit-text-size-adjust:100%}
h1,h2{font-family:${f.heading};margin:0;font-weight:600;line-height:1.2}
h2{font-size:.95rem;margin-bottom:.6rem;letter-spacing:.02em}
.head p{margin:.5rem 0 0;color:${pal.muted}}
.links{display:flex;flex-direction:column;gap:.6rem;margin-top:1.75rem}
.btn{display:flex;align-items:center;gap:.6rem;background:${pal.buttonFill};color:${pal.buttonText};text-decoration:none;padding:.85rem 1rem;border-radius:${r}px;font-weight:600;font-size:.98rem}
.rows{display:flex;flex-direction:column;gap:.3rem;font-size:.93rem}
.row{display:flex;justify-content:space-between;gap:1.5rem}
.row span:last-child{color:${pal.muted}}
.note{font-size:.85rem;color:${pal.muted};margin:.75rem 0 0}
.pairs{display:flex;flex-direction:column;gap:.4rem}
.pairs a,.quiet{display:inline-flex;align-items:center;gap:.45rem;color:${pal.text};text-decoration:none;font-size:.95rem}
.quiet{margin-top:.6rem;color:${pal.accent}}
address{font-style:normal;font-size:.95rem;color:${pal.muted}}
.pills{display:flex;gap:.5rem;justify-content:inherit}
.pill{display:inline-flex;align-items:center;justify-content:center;width:2.35rem;height:2.35rem;border-radius:${Math.max(r, 6)}px;background:${pal.surface};color:${pal.accent};text-decoration:none}
${f.extra}
${shapeCss[shape]}
</style>
</head>
<body>
<div class="page">${inner}</div>
</body>
</html>`;
}
