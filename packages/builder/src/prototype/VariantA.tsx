/**
 * PROTOTYPE — throwaway. Issue #5. Variant A — "Workbench".
 *
 * The conventional shape: a scrolling form on the left, a phone-framed live preview pinned on
 * the right. Sections are an accordion in render order; the preview never moves. Empty state is
 * a first-run dialog that collects the two required fields (name, colour) before the workbench
 * is shown at all — the screen cannot open on a blank page because the colour is required.
 * Mobile: refused honestly, with the reason and a way through.
 */

import { useState } from "react";
import { ExportSheet, PhonePreview, Preview, UI, btn, input } from "./kit.js";
import { ColourField } from "./kit.js";
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

export const NAME = "Workbench — form left, phone right";

export function VariantA({ project, update }: { project: Project; update: Update }) {
  const needsFirstRun = !project.header.name || !project.style.brand;
  const [open, setOpen] = useState<string | null>("header");
  const [exporting, setExporting] = useState(false);
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [narrow] = useState(() => window.innerWidth < 900);

  if (narrow) return <MobileRefusal />;
  if (needsFirstRun) return <FirstRun project={project} update={update} />;

  const panel = (
    id: string,
    title: string,
    subtitle: string,
    body: React.ReactNode,
    toggle?: SectionKey,
  ) => {
    const isOpen = open === id;
    const on = toggle ? project.on[toggle] : true;
    return (
      <section
        key={id}
        style={{
          border: `1px solid ${UI.line}`,
          borderRadius: 12,
          background: "#fff",
          marginBottom: 8,
          opacity: on ? 1 : 0.72,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", padding: "12px 14px", gap: 10 }}>
          <button
            onClick={() => setOpen(isOpen ? null : id)}
            style={{
              flex: 1,
              textAlign: "left",
              background: "none",
              border: 0,
              cursor: "pointer",
              padding: 0,
            }}
          >
            <div style={{ font: `600 14px ${UI.font}`, color: UI.ink }}>{title}</div>
            <div style={{ font: `12px ${UI.font}`, color: UI.dim }}>{subtitle}</div>
          </button>
          {toggle && (
            <label style={{ font: `12px ${UI.font}`, color: UI.dim, display: "flex", gap: 5 }}>
              <input
                type="checkbox"
                checked={on}
                onChange={(e) => update((p) => void (p.on[toggle] = e.target.checked))}
              />
              Show
            </label>
          )}
          <span style={{ color: UI.dim }}>{isOpen ? "▾" : "▸"}</span>
        </div>
        {isOpen && <div style={{ padding: "0 14px 14px" }}>{body}</div>}
      </section>
    );
  };

  return (
    <div
      style={{
        font: `14px ${UI.font}`,
        color: UI.ink,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: UI.ground,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "10px 16px",
          borderBottom: `1px solid ${UI.line}`,
          background: "#fff",
        }}
      >
        <strong style={{ fontSize: 14 }}>linkpage</strong>
        <span style={{ color: UI.dim, fontSize: 13 }}>{project.header.name}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: UI.dim }}>
          Saved on this device
        </span>
        <button onClick={() => setExporting(true)} style={btn(true)}>
          Download my page
        </button>
      </header>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <div style={{ width: "44%", minWidth: 380, overflow: "auto", padding: 16 }}>
          {panel(
            "header",
            "Your business",
            "Name and one line about it",
            <HeaderEditor project={project} update={update} />,
          )}
          {panel(
            "links",
            `Buttons (${project.links.length})`,
            "What you want people to tap",
            <LinksEditor project={project} update={update} />,
          )}
          {panel(
            "hours",
            "Opening hours",
            "Optional",
            <HoursEditor project={project} update={update} />,
            "hours",
          )}
          {panel(
            "contact",
            "Contact",
            "Optional",
            <ContactEditor project={project} update={update} />,
            "contact",
          )}
          {panel(
            "address",
            "Find us",
            "Optional",
            <AddressEditor project={project} update={update} />,
            "address",
          )}
          {panel(
            "social",
            "Follow us",
            "Optional",
            <SocialEditor project={project} update={update} />,
            "social",
          )}
          {panel(
            "style",
            "How it looks",
            "Colours, shape, lettering",
            <StyleEditor project={project} update={update} />,
          )}
          <div style={{ height: 40 }} />
        </div>

        <div
          style={{
            flex: 1,
            borderLeft: `1px solid ${UI.line}`,
            background: "#eef0f4",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 20,
            overflow: "auto",
          }}
        >
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {(["phone", "desktop"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDevice(d)}
                style={{
                  ...btn(false),
                  background: device === d ? UI.ink : "#fff",
                  color: device === d ? "#fff" : UI.ink,
                  border: `1px solid ${device === d ? UI.ink : UI.line}`,
                }}
              >
                {d === "phone" ? "On a phone" : "On a laptop"}
              </button>
            ))}
          </div>
          {device === "phone" ? (
            <PhonePreview project={project} scale={0.92} />
          ) : (
            <div
              style={{
                width: "100%",
                maxWidth: 820,
                height: "100%",
                background: "#fff",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,.12)",
              }}
            >
              <Preview project={project} />
            </div>
          )}
          <p
            style={{
              fontSize: 12,
              color: UI.dim,
              marginTop: 14,
              textAlign: "center",
              maxWidth: 320,
            }}
          >
            This is the actual page — what you download is exactly what you see.
          </p>
        </div>
      </div>
      {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}

function FirstRun({ project, update }: { project: Project; update: Update }) {
  const [name, setName] = useState(project.header.name);
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        background: UI.ground,
        font: `14px ${UI.font}`,
      }}
    >
      <div
        style={{
          background: "#fff",
          padding: 28,
          borderRadius: 14,
          width: 420,
          boxShadow: "0 20px 50px rgba(0,0,0,.12)",
        }}
      >
        <h1 style={{ fontSize: 19, margin: "0 0 6px" }}>
          Two questions and you&rsquo;ve got a page
        </h1>
        <p style={{ color: UI.dim, margin: "0 0 18px", lineHeight: 1.5 }}>
          Everything else is optional and you can change all of it afterwards.
        </p>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
            What&rsquo;s the business called?
          </div>
          {input({
            value: name,
            autoFocus: true,
            placeholder: "Ada's Bakery",
            onChange: (e) => setName(e.target.value),
          })}
        </div>
        <ColourField
          value={project.style.brand}
          onPick={(hex) => update((p) => void (p.style.brand = hex))}
          label="Which colour is closest to your sign?"
        />
        <button
          disabled={!name.trim() || !project.style.brand}
          onClick={() => update((p) => void (p.header.name = name.trim()))}
          style={{
            ...btn(true),
            marginTop: 20,
            width: "100%",
            opacity: !name.trim() || !project.style.brand ? 0.4 : 1,
          }}
        >
          Start my page
        </button>
      </div>
    </div>
  );
}

function MobileRefusal() {
  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        height: "100vh",
        padding: 24,
        font: `15px ${UI.font}`,
        color: UI.ink,
        textAlign: "center",
      }}
    >
      <div style={{ maxWidth: 340 }}>
        <h1 style={{ fontSize: 20 }}>This needs a bigger screen</h1>
        <p style={{ color: UI.dim, lineHeight: 1.6 }}>
          The editor puts your page side by side with the controls, and there isn&rsquo;t room for
          both here. Open this on a laptop — or email yourself the link and come back to it.
        </p>
        <p style={{ color: UI.dim, fontSize: 13 }}>
          (Widen this window past 900px to see the editor — the prototype checks width once, on
          load.)
        </p>
      </div>
    </div>
  );
}
