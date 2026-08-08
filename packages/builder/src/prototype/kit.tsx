/**
 * PROTOTYPE — throwaway. Issue #5.
 *
 * Shared *controls*, deliberately not shared layout. Each variant is free to throw out its own
 * arrangement; what lives here is the stuff every variant would otherwise reimplement
 * identically (the colour field, the contrast readout, the preview frame) and which isn't what
 * the variants disagree about.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { contrastReport, derive } from "./derive.js";
import { COLOUR_FIELD, type Project } from "./model.js";
import { renderPage } from "./preview.js";

export const UI = {
  font: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  ink: "#16181d",
  dim: "#5c6370",
  line: "#e2e5ea",
  ground: "#f6f7f9",
  panel: "#ffffff",
  focus: "#1f6feb",
};

export function useProject(initial: Project): [Project, (fn: (p: Project) => void) => void] {
  const [project, setProject] = useState(initial);
  const update = (fn: (p: Project) => void) => {
    setProject((prev) => {
      const next = structuredClone(prev);
      fn(next);
      return next;
    });
  };
  useEffect(() => setProject(initial), [initial]);
  return [project, update];
}

/** The preview. Same string the export writes, dropped into a srcdoc iframe (per #4). */
export function Preview({
  project,
  width,
  height,
  radius = 0,
}: {
  project: Project;
  width?: number | string;
  height?: number | string;
  radius?: number;
}) {
  const html = useMemo(() => renderPage(project), [project]);
  return (
    <iframe
      title="Live preview"
      srcDoc={html}
      sandbox=""
      style={{
        width: width ?? "100%",
        height: height ?? "100%",
        border: 0,
        borderRadius: radius,
        background: "#fff",
        display: "block",
      }}
    />
  );
}

/** A phone-shaped preview, because most of these pages are read on a phone. */
export function PhonePreview({ project, scale = 1 }: { project: Project; scale?: number }) {
  return (
    <div
      style={{
        width: 320 * scale,
        height: 640 * scale,
        padding: 10 * scale,
        borderRadius: 34 * scale,
        background: "#1b1d22",
        boxShadow: "0 20px 50px rgba(0,0,0,.22)",
        flex: "none",
      }}
    >
      <Preview project={project} radius={24 * scale} />
    </div>
  );
}

export function ColourField({
  value,
  onPick,
  label = "Your main colour",
}: {
  value: string;
  onPick: (hex: string) => void;
  label?: string;
}) {
  const [hex, setHex] = useState(value);
  useEffect(() => setHex(value), [value]);
  return (
    <div>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {COLOUR_FIELD.map((c) => (
          <button
            key={c.hex}
            title={c.name}
            onClick={() => onPick(c.hex)}
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: c.hex,
              border:
                value.toLowerCase() === c.hex ? "3px solid #16181d" : "1px solid rgba(0,0,0,.15)",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: UI.dim }}>or type it</span>
        <input
          value={hex}
          placeholder="#c2185b"
          onChange={(e) => {
            setHex(e.target.value);
            if (/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value.trim()))
              onPick(e.target.value.trim());
          }}
          style={{
            width: 96,
            font: `13px ${UI.font}`,
            padding: "5px 7px",
            border: `1px solid ${UI.line}`,
            borderRadius: 6,
          }}
        />
      </div>
    </div>
  );
}

/** #2's amendment: freeform overrides behind a collapsed disclosure, reporting and never blocking. */
export function AdvancedPanel({
  project,
  update,
  open,
  setOpen,
}: {
  project: Project;
  update: (fn: (p: Project) => void) => void;
  open: boolean;
  setOpen: (v: boolean) => void;
}) {
  const pal = derive(project.style);
  const rows = contrastReport(pal);
  const adv = project.style.advanced;
  const field = (key: "ground" | "text" | "buttonText", label: string, fallback: string) => (
    <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
      <input
        type="color"
        value={adv.colors[key] ?? fallback}
        onChange={(e) => update((p) => void (p.style.advanced.colors[key] = e.target.value))}
        style={{
          width: 32,
          height: 24,
          padding: 0,
          border: `1px solid ${UI.line}`,
          background: "none",
        }}
      />
      {label}
    </label>
  );
  return (
    <div style={{ borderTop: `1px solid ${UI.line}`, marginTop: 14, paddingTop: 10 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "none",
          border: 0,
          padding: 0,
          font: `12px ${UI.font}`,
          color: UI.dim,
          cursor: "pointer",
        }}
      >
        {open ? "▾" : "▸"} Advanced — set colours yourself
      </button>
      {open && (
        <div style={{ marginTop: 10, fontSize: 12 }}>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <input
              type="checkbox"
              checked={adv.enabled}
              onChange={(e) => update((p) => void (p.style.advanced.enabled = e.target.checked))}
              style={{ marginTop: 2 }}
            />
            <span style={{ color: UI.dim }}>
              Set colours myself. Your own colours stay saved either way — switching this off puts
              the derived page back exactly as it was.
            </span>
          </label>
          <div
            style={{ display: "flex", gap: 14, margin: "10px 0", opacity: adv.enabled ? 1 : 0.45 }}
          >
            {field("ground", "Page", pal.ground)}
            {field("text", "Text", pal.text)}
            {field("buttonText", "Button text", pal.buttonText)}
          </div>
          <ContrastReadout rows={rows} />
        </div>
      )}
    </div>
  );
}

export function ContrastReadout({
  rows,
}: {
  rows: { label: string; ratio: number; ok: boolean }[];
}) {
  return (
    <div style={{ background: UI.ground, borderRadius: 8, padding: "8px 10px", fontSize: 12 }}>
      {rows.map((r) => (
        <div
          key={r.label}
          style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "2px 0" }}
        >
          <span style={{ color: UI.dim }}>{r.label}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", color: r.ok ? UI.dim : "#a3421c" }}>
            {r.ratio.toFixed(1)}:1 {r.ok ? "" : "— below the readable threshold"}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Export is a download, not a deploy — every variant has to say so somewhere. */
export function ExportSheet({ project, onClose }: { project: Project; onClose: () => void }) {
  const bytes = new Blob([renderPage(project)]).size;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => ref.current?.focus(), []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(12,14,18,.45)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          padding: 24,
          maxWidth: 460,
          font: `14px ${UI.font}`,
          color: UI.ink,
          boxShadow: "0 30px 80px rgba(0,0,0,.3)",
        }}
      >
        <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>Your page is downloaded, not online yet</h2>
        <p style={{ color: UI.dim, lineHeight: 1.55 }}>
          We&rsquo;ve saved <code>index.html</code> ({(bytes / 1024).toFixed(0)} KB) to your
          downloads. It is one file with everything inside it — double-click it and it opens.
        </p>
        <p style={{ color: UI.dim, lineHeight: 1.55 }}>
          Nobody else can see it until you put it somewhere. Drag the file onto a free host, or send
          it to whoever looks after your website.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button onClick={onClose} style={btn(true)}>
            Show me how to put it online
          </button>
          <button onClick={onClose} style={btn(false)}>
            Later
          </button>
        </div>
      </div>
    </div>
  );
}

export function btn(primary: boolean): React.CSSProperties {
  return {
    font: `600 13px ${UI.font}`,
    padding: "9px 14px",
    borderRadius: 8,
    cursor: "pointer",
    border: primary ? "1px solid #16181d" : `1px solid ${UI.line}`,
    background: primary ? UI.ink : "#fff",
    color: primary ? "#fff" : UI.ink,
  };
}

export function input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        font: `14px ${UI.font}`,
        padding: "9px 10px",
        border: `1px solid ${UI.line}`,
        borderRadius: 8,
        width: "100%",
        background: "#fff",
        ...props.style,
      }}
    />
  );
}
