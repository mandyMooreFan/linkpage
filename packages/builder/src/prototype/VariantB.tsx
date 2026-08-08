/**
 * PROTOTYPE — throwaway. Issue #5. Variant B — "Edit the page itself".
 *
 * No form pane at all. The page fills the screen and you edit it in place: click any text and
 * type, hover a section for its handful of controls, and switched-off sections sit there as
 * ghost prompts you tap to add. Design controls live in one floating popover.
 *
 * Note the cost this variant makes visible: an editable page cannot be the `srcdoc` iframe, so
 * this screen is a *second* implementation of the page's look, in React. That is exactly the
 * WYSIWYG drift #4 designed the iframe preview to prevent — so this variant keeps a "the real
 * file" toggle that swaps in the true renderer output, and the gap between the two is the thing
 * to judge it on.
 */

import { useState } from "react";
import { derive } from "./derive.js";
import { ExportSheet, Preview, UI, btn } from "./kit.js";
import { AddressEditor, ContactEditor, HoursEditor, SocialEditor, StyleEditor } from "./editors.js";
import { DAYS, DAY_LABEL, type Project } from "./model.js";

type Update = (fn: (p: Project) => void) => void;
type SectionKey = "hours" | "contact" | "address" | "social";

export const NAME = "Edit the page itself — direct manipulation";

export function VariantB({ project, update }: { project: Project; update: Update }) {
  const pal = derive(project.style);
  const [popover, setPopover] = useState<null | "design" | SectionKey>(null);
  const [exporting, setExporting] = useState(false);
  const [showReal, setShowReal] = useState(false);
  const r = Math.round(project.style.corners * 16);
  const needsColour = !project.style.brand;

  const Editable = ({
    value,
    placeholder,
    onCommit,
    style,
  }: {
    value: string;
    placeholder: string;
    onCommit: (v: string) => void;
    style?: React.CSSProperties;
  }) => (
    <span
      contentEditable
      suppressContentEditableWarning
      onBlur={(e) => onCommit(e.currentTarget.textContent ?? "")}
      style={{
        display: "inline-block",
        minWidth: 40,
        outline: "none",
        borderRadius: 4,
        boxShadow: value ? "none" : `inset 0 0 0 1px ${pal.muted}`,
        color: value ? "inherit" : pal.muted,
        padding: "0 2px",
        cursor: "text",
        ...style,
      }}
      data-placeholder={placeholder}
    >
      {value || placeholder}
    </span>
  );

  const sectionShell = (key: SectionKey, title: string, body: React.ReactNode) => {
    if (!project.on[key])
      return (
        <button
          key={key}
          onClick={() => {
            update((p) => void (p.on[key] = true));
            setPopover(key);
          }}
          style={{
            display: "block",
            width: "100%",
            margin: "10px 0",
            padding: "14px",
            borderRadius: r,
            border: `1px dashed ${pal.muted}`,
            background: "transparent",
            color: pal.muted,
            font: `14px ${UI.font}`,
            cursor: "pointer",
          }}
        >
          + Add {title.toLowerCase()}
        </button>
      );
    return (
      <section key={key} style={{ position: "relative", marginTop: 26 }} className="hoverable">
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
          <h2 style={{ margin: 0, fontSize: 14, color: pal.accent, letterSpacing: ".02em" }}>
            {title}
          </h2>
          <button onClick={() => setPopover(key)} style={chip(pal.muted)}>
            edit
          </button>
          <button onClick={() => update((p) => void (p.on[key] = false))} style={chip(pal.muted)}>
            hide
          </button>
        </div>
        <div style={{ marginTop: 8 }}>{body}</div>
      </section>
    );
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "auto",
        background: pal.ground,
        color: pal.text,
        position: "relative",
      }}
    >
      {needsColour && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 20,
            background: "#111318",
            color: "#fff",
            padding: "10px 14px",
            font: `13px ${UI.font}`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>
            Pick the colour closest to your sign — it&rsquo;s the one thing the page needs.
          </span>
          <button
            onClick={() => setPopover("design")}
            style={{ ...btn(false), padding: "5px 10px" }}
          >
            Pick a colour
          </button>
        </div>
      )}

      {showReal ? (
        <div style={{ height: "calc(100vh - 0px)" }}>
          <Preview project={project} />
        </div>
      ) : (
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            padding: "48px 20px 140px",
            textAlign: "center",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1
            style={{
              fontSize: 30,
              margin: 0,
              fontFamily: project.style.type === "classic" ? "Georgia, serif" : "inherit",
            }}
          >
            <Editable
              value={project.header.name}
              placeholder="Your business name"
              onCommit={(v) => update((p) => void (p.header.name = v))}
            />
          </h1>
          <p style={{ color: pal.muted, marginTop: 6 }}>
            <Editable
              value={project.header.tagline}
              placeholder="One line about what you do"
              onCommit={(v) => update((p) => void (p.header.tagline = v))}
            />
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 26 }}>
            {project.links.map((l, i) => (
              <div
                key={i}
                style={{ position: "relative", display: "flex", alignItems: "center", gap: 6 }}
              >
                <div
                  style={{
                    flex: 1,
                    background: pal.buttonFill,
                    color: pal.buttonText,
                    borderRadius: r,
                    padding: "14px 16px",
                    fontWeight: 600,
                    textAlign: "center",
                  }}
                >
                  <Editable
                    value={l.label}
                    placeholder="Button text"
                    onCommit={(v) => update((p) => void (p.links[i]!.label = v))}
                  />
                  <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 400, marginTop: 2 }}>
                    <Editable
                      value={l.url}
                      placeholder="https://where it goes"
                      onCommit={(v) => update((p) => void (p.links[i]!.url = v))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button
                    style={chip(pal.muted)}
                    onClick={() =>
                      update((p) => {
                        if (i > 0) [p.links[i - 1], p.links[i]] = [p.links[i]!, p.links[i - 1]!];
                      })
                    }
                  >
                    ↑
                  </button>
                  <button
                    style={chip(pal.muted)}
                    onClick={() =>
                      update((p) => {
                        if (i < p.links.length - 1)
                          [p.links[i + 1], p.links[i]] = [p.links[i]!, p.links[i + 1]!];
                      })
                    }
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => update((p) => p.links.push({ label: "", url: "", icon: "link" }))}
              style={{
                padding: "12px",
                borderRadius: r,
                border: `1px dashed ${pal.muted}`,
                background: "transparent",
                color: pal.muted,
                cursor: "pointer",
                font: `14px ${UI.font}`,
              }}
            >
              + Add a button
            </button>
          </div>

          {sectionShell(
            "hours",
            "Opening hours",
            <div style={{ fontSize: 14 }}>
              {DAYS.map((d) => (
                <div
                  key={d}
                  style={{ display: "flex", justifyContent: "space-between", padding: "1px 0" }}
                >
                  <span>{DAY_LABEL[d]}</span>
                  <span style={{ color: pal.muted }}>
                    {project.hours.days[d].length
                      ? project.hours.days[d].map(([a, b]) => `${a}–${b}`).join(", ")
                      : "Closed"}
                  </span>
                </div>
              ))}
              {project.hours.note && (
                <p style={{ color: pal.muted, fontSize: 13 }}>{project.hours.note}</p>
              )}
            </div>,
          )}
          {sectionShell(
            "contact",
            "Contact",
            <div style={{ fontSize: 14, color: pal.muted }}>
              <div>{project.contact.phone || "—"}</div>
              <div>{project.contact.email || "—"}</div>
            </div>,
          )}
          {sectionShell(
            "address",
            "Find us",
            <div style={{ fontSize: 14, color: pal.muted }}>
              {project.address.lines.filter(Boolean).map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>,
          )}
          {sectionShell(
            "social",
            "Follow us",
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                color: pal.accent,
                fontSize: 13,
              }}
            >
              {project.social.map((s, i) => (
                <span
                  key={i}
                  style={{ background: pal.surface, padding: "6px 10px", borderRadius: r }}
                >
                  {s.platform}
                </span>
              ))}
            </div>,
          )}
        </div>
      )}

      {/* floating chrome */}
      <div style={{ position: "fixed", top: 14, right: 14, display: "flex", gap: 8, zIndex: 30 }}>
        <button onClick={() => setShowReal(!showReal)} style={btn(false)}>
          {showReal ? "Back to editing" : "See the real file"}
        </button>
        <button onClick={() => setExporting(true)} style={btn(true)}>
          Download my page
        </button>
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: 8,
          background: "#fff",
          border: `1px solid ${UI.line}`,
          borderRadius: 999,
          padding: "6px 8px",
          boxShadow: "0 8px 24px rgba(0,0,0,.16)",
          zIndex: 30,
        }}
      >
        <button
          onClick={() => setPopover(popover === "design" ? null : "design")}
          style={{
            ...btn(false),
            borderRadius: 999,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: 14,
              height: 14,
              borderRadius: 4,
              background: project.style.brand || "#ccc",
              display: "inline-block",
            }}
          />
          How it looks
        </button>
        <span
          style={{ font: `12px ${UI.font}`, color: UI.dim, alignSelf: "center", padding: "0 8px" }}
        >
          Click any text to change it
        </span>
      </div>

      {popover && (
        <div
          style={{
            position: "fixed",
            right: 16,
            bottom: 74,
            width: 360,
            maxHeight: "72vh",
            overflow: "auto",
            background: "#fff",
            color: UI.ink,
            border: `1px solid ${UI.line}`,
            borderRadius: 14,
            padding: 16,
            font: `14px ${UI.font}`,
            boxShadow: "0 20px 50px rgba(0,0,0,.2)",
            zIndex: 40,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
            <strong style={{ fontSize: 14 }}>
              {popover === "design"
                ? "How it looks"
                : popover === "hours"
                  ? "Opening hours"
                  : popover === "contact"
                    ? "Contact"
                    : popover === "address"
                      ? "Find us"
                      : "Follow us"}
            </strong>
            <button onClick={() => setPopover(null)} style={{ ...btn(false), padding: "3px 8px" }}>
              Done
            </button>
          </div>
          {popover === "design" && <StyleEditor project={project} update={update} compact />}
          {popover === "hours" && <HoursEditor project={project} update={update} />}
          {popover === "contact" && <ContactEditor project={project} update={update} />}
          {popover === "address" && <AddressEditor project={project} update={update} />}
          {popover === "social" && <SocialEditor project={project} update={update} />}
        </div>
      )}

      {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}

function chip(colour: string): React.CSSProperties {
  return {
    font: `11px ${UI.font}`,
    color: colour,
    background: "transparent",
    border: `1px solid ${colour}`,
    borderRadius: 999,
    padding: "1px 7px",
    cursor: "pointer",
    opacity: 0.7,
  };
}
