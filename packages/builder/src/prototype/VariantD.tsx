/**
 * PROTOTYPE — throwaway. Issue #5. Variant D — "One column, preview on demand".
 *
 * The same single scrolling column at every width: phone, tablet, laptop. There is no preview
 * pane, because a preview pane is what forces a two-column layout and a two-column layout is
 * what makes the builder desktop-only. Instead the preview is a deliberate full-screen step —
 * a sticky "See my page" that opens the real exported file over the whole screen.
 *
 * The trade this variant is here to expose: mobile editing works properly and nothing is
 * side-by-side, so you never see the effect of a change until you go and look.
 */

import { useState } from "react";
import { ExportSheet, Preview, UI, btn } from "./kit.js";
import {
  AddressEditor,
  ContactEditor,
  HeaderEditor,
  HoursEditor,
  LinksEditor,
  SocialEditor,
  StyleEditor,
} from "./editors.js";
import type { Project } from "./model.js";

type Update = (fn: (p: Project) => void) => void;
type SectionKey = "hours" | "contact" | "address" | "social";

export const NAME = "One column, preview on demand — works on a phone";

export function VariantD({ project, update }: { project: Project; update: Update }) {
  const [openCard, setOpenCard] = useState<string | null>("business");
  const [previewing, setPreviewing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const started = Boolean(project.header.name && project.style.brand);

  const card = (
    id: string,
    title: string,
    summary: string,
    body: React.ReactNode,
    opts: { toggle?: SectionKey; locked?: boolean } = {},
  ) => {
    const open = openCard === id;
    const on = opts.toggle ? project.on[opts.toggle] : true;
    return (
      <section
        style={{
          border: `1px solid ${open ? UI.ink : UI.line}`,
          borderRadius: 12,
          background: "#fff",
          marginBottom: 10,
          opacity: opts.locked ? 0.45 : 1,
          pointerEvents: opts.locked ? "none" : "auto",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
          <button
            onClick={() => setOpenCard(open ? null : id)}
            style={{
              flex: 1,
              textAlign: "left",
              border: 0,
              background: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <div style={{ font: `600 15px ${UI.font}` }}>{title}</div>
            <div style={{ font: `13px ${UI.font}`, color: UI.dim, marginTop: 2 }}>{summary}</div>
          </button>
          {opts.toggle && (
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => update((p) => void (p.on[opts.toggle!] = e.target.checked))}
              style={{ width: 18, height: 18 }}
            />
          )}
        </div>
        {open && (on || !opts.toggle) && <div style={{ padding: "0 16px 16px" }}>{body}</div>}
      </section>
    );
  };

  const linkSummary = project.links.length
    ? project.links
        .map((l) => l.label || "untitled")
        .slice(0, 3)
        .join(" · ") + (project.links.length > 3 ? ` +${project.links.length - 3}` : "")
    : "Nothing yet — this is the main thing on the page";

  const hoursSummary = (() => {
    const openDays = Object.values(project.hours.days).filter((d) => d.length).length;
    return openDays ? `Open ${openDays} days a week` : "Not filled in";
  })();

  return (
    <div
      style={{ font: `14px ${UI.font}`, color: UI.ink, minHeight: "100vh", background: UI.ground }}
    >
      <header style={{ padding: "16px 16px 8px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ fontSize: 13, color: UI.dim }}>linkpage · saved on this device</div>
        <h1 style={{ fontSize: 20, margin: "4px 0 0" }}>
          {project.header.name || "Your new page"}
        </h1>
      </header>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: "8px 16px 110px" }}>
        {!started && (
          <div
            style={{
              background: "#111318",
              color: "#fff",
              borderRadius: 12,
              padding: "16px 18px",
              marginBottom: 12,
              lineHeight: 1.5,
            }}
          >
            <strong style={{ display: "block", marginBottom: 4 }}>Start here</strong>
            <span style={{ color: "#c9cdd6", fontSize: 13 }}>
              Two things and you have a page: what the business is called, and your colour.
              Everything below unlocks once those are in.
            </span>
          </div>
        )}

        {card(
          "business",
          "Your business",
          project.header.name || "Name — needed",
          <HeaderEditor project={project} update={update} />,
        )}
        {card(
          "look",
          "How it looks",
          project.style.brand
            ? `${project.style.brand} · ${project.style.shape}`
            : "Colour — needed",
          <StyleEditor project={project} update={update} compact />,
        )}
        {card("links", "Buttons", linkSummary, <LinksEditor project={project} update={update} />, {
          locked: !started,
        })}
        {card(
          "hours",
          "Opening hours",
          hoursSummary,
          <HoursEditor project={project} update={update} />,
          {
            toggle: "hours",
            locked: !started,
          },
        )}
        {card(
          "contact",
          "Contact",
          project.contact.phone || project.contact.email || "Not filled in",
          <ContactEditor project={project} update={update} />,
          { toggle: "contact", locked: !started },
        )}
        {card(
          "address",
          "Find us",
          project.address.lines.filter(Boolean)[0] ?? "Not filled in",
          <AddressEditor project={project} update={update} />,
          { toggle: "address", locked: !started },
        )}
        {card(
          "social",
          "Follow us",
          project.social.map((s) => s.platform).join(", ") || "Not filled in",
          <SocialEditor project={project} update={update} />,
          { toggle: "social", locked: !started },
        )}
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: `1px solid ${UI.line}`,
          padding: "10px 16px",
          display: "flex",
          gap: 8,
          justifyContent: "center",
        }}
      >
        <button
          onClick={() => setPreviewing(true)}
          style={{ ...btn(false), flex: 1, maxWidth: 260, padding: "12px" }}
        >
          See my page
        </button>
        <button
          onClick={() => setExporting(true)}
          style={{ ...btn(true), flex: 1, maxWidth: 260, padding: "12px" }}
        >
          Download it
        </button>
      </div>

      {previewing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "#fff",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              borderBottom: `1px solid ${UI.line}`,
            }}
          >
            <button onClick={() => setPreviewing(false)} style={btn(false)}>
              ← Keep editing
            </button>
            <span style={{ color: UI.dim, fontSize: 12 }}>This is the file people will see</span>
            <button onClick={() => setExporting(true)} style={{ ...btn(true), marginLeft: "auto" }}>
              Download it
            </button>
          </div>
          <div style={{ flex: 1 }}>
            <Preview project={project} />
          </div>
        </div>
      )}

      {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}
