/**
 * PROTOTYPE — throwaway. Issue #5.
 *
 * Field-level editors for the six sections. Shared because the variants don't disagree about
 * what a phone number field is — they disagree about where these appear, how they're revealed,
 * and what the screen around them looks like. Each variant arranges them itself.
 */

import { useState } from "react";
import {
  DAYS,
  DAY_LABEL,
  LINK_ICONS,
  SHAPES,
  SOCIAL_PLATFORMS,
  TYPE_PAIRINGS,
  type Project,
} from "./model.js";
import { AdvancedPanel, ColourField, UI, btn, input } from "./kit.js";

type Update = (fn: (p: Project) => void) => void;

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12, color: UI.dim, marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}

export function HeaderEditor({ project, update }: { project: Project; update: Update }) {
  return (
    <>
      <Field label="Business name">
        {input({
          value: project.header.name,
          placeholder: "Ada's Bakery",
          onChange: (e) => update((p) => void (p.header.name = e.target.value)),
        })}
      </Field>
      <Field label="One line about it (optional)">
        {input({
          value: project.header.tagline,
          placeholder: "Sourdough, pastries and very good coffee",
          onChange: (e) => update((p) => void (p.header.tagline = e.target.value)),
        })}
      </Field>
    </>
  );
}

export function LinksEditor({ project, update }: { project: Project; update: Update }) {
  const move = (i: number, d: number) =>
    update((p) => {
      const j = i + d;
      if (j < 0 || j >= p.links.length) return;
      [p.links[i], p.links[j]] = [p.links[j]!, p.links[i]!];
    });
  return (
    <div>
      <p style={{ fontSize: 12, color: UI.dim, margin: "0 0 10px" }}>
        The top one gets the most taps. Order is how you say what matters.
      </p>
      {project.links.map((l, i) => (
        <div
          key={i}
          style={{
            border: `1px solid ${UI.line}`,
            borderRadius: 10,
            padding: 10,
            marginBottom: 8,
            background: "#fff",
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <select
              value={l.icon}
              onChange={(e) => update((p) => void (p.links[i]!.icon = e.target.value))}
              style={{
                font: `13px ${UI.font}`,
                padding: 6,
                borderRadius: 6,
                border: `1px solid ${UI.line}`,
              }}
            >
              {LINK_ICONS.map((ic) => (
                <option key={ic}>{ic}</option>
              ))}
            </select>
            {input({
              value: l.label,
              placeholder: "Button text",
              onChange: (e) => update((p) => void (p.links[i]!.label = e.target.value)),
            })}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 6, alignItems: "center" }}>
            {input({
              value: l.url,
              placeholder: "https://…",
              onChange: (e) => update((p) => void (p.links[i]!.url = e.target.value)),
              style: { fontSize: 12 },
            })}
            <button onClick={() => move(i, -1)} style={sq} title="Move up">
              ↑
            </button>
            <button onClick={() => move(i, 1)} style={sq} title="Move down">
              ↓
            </button>
            <button
              onClick={() => update((p) => void p.links.splice(i, 1))}
              style={{ ...sq, color: "#a3421c" }}
              title="Remove"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => update((p) => p.links.push({ label: "", url: "", icon: "link" }))}
        style={btn(false)}
      >
        + Add a button
      </button>
    </div>
  );
}

const sq: React.CSSProperties = {
  width: 30,
  height: 30,
  flex: "none",
  borderRadius: 6,
  border: `1px solid ${UI.line}`,
  background: "#fff",
  cursor: "pointer",
  font: `13px ${UI.font}`,
};

export function HoursEditor({ project, update }: { project: Project; update: Update }) {
  return (
    <div>
      {DAYS.map((d) => {
        const iv = project.hours.days[d];
        return (
          <div
            key={d}
            style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}
          >
            <div style={{ width: 84, fontSize: 13, paddingTop: 8 }}>{DAY_LABEL[d]}</div>
            <div style={{ flex: 1 }}>
              {iv.length === 0 && (
                <div style={{ fontSize: 13, color: UI.dim, padding: "8px 0" }}>Closed</div>
              )}
              {iv.map(([a, b], k) => (
                <div
                  key={k}
                  style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}
                >
                  <input
                    type="time"
                    value={a}
                    onChange={(e) => update((p) => void (p.hours.days[d][k]![0] = e.target.value))}
                    style={timeStyle}
                  />
                  <span style={{ color: UI.dim }}>–</span>
                  <input
                    type="time"
                    value={b}
                    onChange={(e) => update((p) => void (p.hours.days[d][k]![1] = e.target.value))}
                    style={timeStyle}
                  />
                  <button
                    onClick={() => update((p) => void p.hours.days[d].splice(k, 1))}
                    style={sq}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => update((p) => p.hours.days[d].push(["09:00", "17:00"]))}
                style={{ ...btn(false), padding: "5px 9px", fontSize: 12 }}
              >
                {iv.length ? "+ Split shift" : "+ Open this day"}
              </button>
            </div>
          </div>
        );
      })}
      <Field label="Anything else about your hours">
        {input({
          value: project.hours.note,
          placeholder: "Closed bank holidays",
          onChange: (e) => update((p) => void (p.hours.note = e.target.value)),
        })}
      </Field>
    </div>
  );
}

const timeStyle: React.CSSProperties = {
  font: `13px ${UI.font}`,
  padding: "6px 7px",
  border: `1px solid ${UI.line}`,
  borderRadius: 6,
};

export function ContactEditor({ project, update }: { project: Project; update: Update }) {
  return (
    <>
      <Field label="Phone">
        {input({
          value: project.contact.phone,
          placeholder: "+44 1422 555 0134",
          onChange: (e) => update((p) => void (p.contact.phone = e.target.value)),
        })}
      </Field>
      <Field label="Email">
        {input({
          value: project.contact.email,
          placeholder: "hello@…",
          onChange: (e) => update((p) => void (p.contact.email = e.target.value)),
        })}
      </Field>
    </>
  );
}

export function AddressEditor({ project, update }: { project: Project; update: Update }) {
  return (
    <>
      <Field label="Address — write it how you'd write it on an envelope">
        <textarea
          value={project.address.lines.join("\n")}
          placeholder={"12 Bridge Street\nHebden Bridge\nHX7 8AA"}
          onChange={(e) => update((p) => void (p.address.lines = e.target.value.split("\n")))}
          style={{
            font: `14px ${UI.font}`,
            padding: "9px 10px",
            border: `1px solid ${UI.line}`,
            borderRadius: 8,
            width: "100%",
            minHeight: 76,
            resize: "vertical",
          }}
        />
      </Field>
      <Field label="Link to directions (optional)">
        {input({
          value: project.address.directionsUrl,
          placeholder: "https://maps…",
          onChange: (e) => update((p) => void (p.address.directionsUrl = e.target.value)),
        })}
      </Field>
    </>
  );
}

export function SocialEditor({ project, update }: { project: Project; update: Update }) {
  return (
    <div>
      {project.social.map((s, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <select
            value={s.platform}
            onChange={(e) => update((p) => void (p.social[i]!.platform = e.target.value))}
            style={{
              font: `13px ${UI.font}`,
              padding: 7,
              borderRadius: 6,
              border: `1px solid ${UI.line}`,
            }}
          >
            {SOCIAL_PLATFORMS.map((pl) => (
              <option key={pl}>{pl}</option>
            ))}
          </select>
          {input({
            value: s.url,
            placeholder: "https://…",
            onChange: (e) => update((p) => void (p.social[i]!.url = e.target.value)),
          })}
          <button onClick={() => update((p) => void p.social.splice(i, 1))} style={sq}>
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={() => update((p) => p.social.push({ platform: "instagram", url: "" }))}
        style={btn(false)}
      >
        + Add a profile
      </button>
    </div>
  );
}

/** The six style controls from #2, plus the collapsed advanced tier. */
export function StyleEditor({
  project,
  update,
  compact = false,
}: {
  project: Project;
  update: Update;
  compact?: boolean;
}) {
  const [advOpen, setAdvOpen] = useState(false);
  const s = project.style;
  return (
    <div>
      <ColourField value={s.brand} onPick={(hex) => update((p) => void (p.style.brand = hex))} />
      <div style={{ marginTop: 14 }}>
        <ColourField
          value={s.accent ?? ""}
          onPick={(hex) => update((p) => void (p.style.accent = hex))}
          label="A second colour (worth adding)"
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Shape</div>
        <div
          style={{ display: "grid", gridTemplateColumns: compact ? "1fr 1fr" : "1fr 1fr", gap: 6 }}
        >
          {SHAPES.map((sh) => (
            <button
              key={sh.id}
              onClick={() => update((p) => void (p.style.shape = sh.id))}
              style={{
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                border: s.shape === sh.id ? "2px solid #16181d" : `1px solid ${UI.line}`,
                background: "#fff",
                font: `13px ${UI.font}`,
              }}
            >
              <div style={{ fontWeight: 600 }}>{sh.label}</div>
              <div style={{ color: UI.dim, fontSize: 11 }}>{sh.blurb}</div>
            </button>
          ))}
        </div>
      </div>
      <div style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>Lettering</div>
        <div style={{ display: "flex", gap: 6 }}>
          {TYPE_PAIRINGS.map((t) => (
            <button
              key={t.id}
              onClick={() => update((p) => void (p.style.type = t.id))}
              style={{
                flex: 1,
                padding: "8px 10px",
                borderRadius: 8,
                cursor: "pointer",
                border: s.type === t.id ? "2px solid #16181d" : `1px solid ${UI.line}`,
                background: "#fff",
                font: `13px ${UI.font}`,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div
        style={{ marginTop: 16, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}
      >
        <label style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Corners</div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={s.corners}
            onChange={(e) => update((p) => void (p.style.corners = Number(e.target.value)))}
          />
        </label>
        <div style={{ fontSize: 13 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Page</div>
          <div style={{ display: "flex", gap: 6 }}>
            {(["light", "dark"] as const).map((m) => (
              <button
                key={m}
                onClick={() => update((p) => void (p.style.mode = m))}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: s.mode === m ? "2px solid #16181d" : `1px solid ${UI.line}`,
                  background: "#fff",
                  font: `13px ${UI.font}`,
                }}
              >
                {m === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>
        </div>
      </div>
      <AdvancedPanel project={project} update={update} open={advOpen} setOpen={setAdvOpen} />
    </div>
  );
}

export const SECTION_EDITORS = {
  hours: HoursEditor,
  contact: ContactEditor,
  address: AddressEditor,
  social: SocialEditor,
} as const;
