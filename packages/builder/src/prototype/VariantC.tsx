/**
 * PROTOTYPE — throwaway. Issue #5. Variant C — "One question at a time".
 *
 * A guided flow rather than a screen: each step asks one thing, the phone beside it fills in as
 * you answer, and the flow ends on a review page that doubles as the permanent home — coming
 * back later drops you straight onto review, where every step is a row you can re-open.
 *
 * The empty state is the whole design here: there is no blank canvas to be intimidated by.
 * The bet being tested is whether a flow that suits minute one still suits minute ten, when the
 * owner wants to change one phone number.
 */

import { useMemo, useState } from "react";
import { ColourField, ExportSheet, PhonePreview, UI, btn, input } from "./kit.js";
import {
  AddressEditor,
  ContactEditor,
  HoursEditor,
  LinksEditor,
  SocialEditor,
  StyleEditor,
} from "./editors.js";
import type { Project } from "./model.js";

type Update = (fn: (p: Project) => void) => void;

export const NAME = "One question at a time — guided flow";

export function VariantC({ project, update }: { project: Project; update: Update }) {
  const [step, setStep] = useState<number | "review">(project.header.name ? "review" : 0);
  const [exporting, setExporting] = useState(false);

  const steps = useMemo(() => {
    const s: { id: string; title: string; hint: string; body: React.ReactNode }[] = [
      {
        id: "name",
        title: "What&rsquo;s the business called?",
        hint: "This goes at the top of the page.",
        body: input({
          value: project.header.name,
          autoFocus: true,
          placeholder: "Ada's Bakery",
          onChange: (e) => update((p) => void (p.header.name = e.target.value)),
          style: { fontSize: 18, padding: "12px 14px" },
        }),
      },
      {
        id: "colour",
        title: "Which colour is closest to your sign?",
        hint: "Everything else on the page is worked out from this one.",
        body: (
          <ColourField
            value={project.style.brand}
            onPick={(hex) => update((p) => void (p.style.brand = hex))}
            label=""
          />
        ),
      },
      {
        id: "links",
        title: "What do you want people to tap?",
        hint: "Most pages have two or three. The top one gets the most taps.",
        body: <LinksEditor project={project} update={update} />,
      },
      {
        id: "extras",
        title: "What else should be on the page?",
        hint: "You can add or drop any of these later.",
        body: (
          <div style={{ display: "grid", gap: 8 }}>
            {(
              [
                ["hours", "Opening hours"],
                ["contact", "Phone and email"],
                ["address", "Where you are"],
                ["social", "Your social profiles"],
              ] as const
            ).map(([k, label]) => (
              <label
                key={k}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  border: `1px solid ${project.on[k] ? UI.ink : UI.line}`,
                  borderRadius: 10,
                  padding: "12px 14px",
                  cursor: "pointer",
                  background: "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={project.on[k]}
                  onChange={(e) => update((p) => void (p.on[k] = e.target.checked))}
                />
                {label}
              </label>
            ))}
          </div>
        ),
      },
    ];
    if (project.on.hours)
      s.push({
        id: "hours",
        title: "When are you open?",
        hint: "Leave a day empty if you're closed.",
        body: <HoursEditor project={project} update={update} />,
      });
    if (project.on.contact)
      s.push({
        id: "contact",
        title: "How do people reach you?",
        hint: "These become tappable on a phone.",
        body: <ContactEditor project={project} update={update} />,
      });
    if (project.on.address)
      s.push({
        id: "address",
        title: "Where are you?",
        hint: "Write it how you'd write it on an envelope.",
        body: <AddressEditor project={project} update={update} />,
      });
    if (project.on.social)
      s.push({
        id: "social",
        title: "Where can people follow you?",
        hint: "",
        body: <SocialEditor project={project} update={update} />,
      });
    s.push({
      id: "look",
      title: "How should it look?",
      hint: "Your colour is already in. This is the shape around it.",
      body: <StyleEditor project={project} update={update} compact />,
    });
    return s;
  }, [project, update]);

  const blocked = (i: number) =>
    (steps[i]!.id === "name" && !project.header.name.trim()) ||
    (steps[i]!.id === "colour" && !project.style.brand);

  if (step === "review")
    return (
      <div
        style={{
          font: `14px ${UI.font}`,
          color: UI.ink,
          minHeight: "100vh",
          background: UI.ground,
        }}
      >
        <div
          style={{
            maxWidth: 940,
            margin: "0 auto",
            padding: "32px 20px 60px",
            display: "flex",
            gap: 32,
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: "1 1 380px", minWidth: 320 }}>
            <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Your page</h1>
            <p style={{ color: UI.dim, margin: "0 0 20px" }}>Tap anything to change it.</p>
            <div
              style={{
                background: "#fff",
                border: `1px solid ${UI.line}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {steps.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setStep(i)}
                  style={{
                    display: "flex",
                    width: "100%",
                    gap: 12,
                    alignItems: "center",
                    padding: "14px 16px",
                    border: 0,
                    borderBottom: `1px solid ${UI.line}`,
                    background: "#fff",
                    cursor: "pointer",
                    font: `14px ${UI.font}`,
                    textAlign: "left",
                  }}
                >
                  <span style={{ flex: 1 }} dangerouslySetInnerHTML={{ __html: s.title }} />
                  <span style={{ color: UI.dim }}>›</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setExporting(true)}
              style={{ ...btn(true), marginTop: 20, width: "100%", padding: "13px" }}
            >
              Download my page
            </button>
            <p style={{ color: UI.dim, fontSize: 12, textAlign: "center", marginTop: 8 }}>
              Downloading gives you a file. It isn&rsquo;t online until you put it somewhere —
              we&rsquo;ll show you how.
            </p>
          </div>
          <div style={{ flex: "0 0 auto" }}>
            <PhonePreview project={project} scale={0.85} />
          </div>
        </div>
        {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
      </div>
    );

  const s = steps[step]!;
  return (
    <div
      style={{
        font: `14px ${UI.font}`,
        color: UI.ink,
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ display: "flex", gap: 4, padding: "14px 20px" }}>
        {steps.map((x, i) => (
          <span
            key={x.id}
            style={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              background: i <= step ? UI.ink : UI.line,
            }}
          />
        ))}
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          gap: 40,
          maxWidth: 980,
          margin: "0 auto",
          padding: "20px 20px 0",
          width: "100%",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 380px", minWidth: 300, maxWidth: 520 }}>
          <div style={{ color: UI.dim, fontSize: 12, marginBottom: 6 }}>
            Step {step + 1} of {steps.length}
          </div>
          <h1
            style={{ fontSize: 24, margin: "0 0 6px", lineHeight: 1.25 }}
            dangerouslySetInnerHTML={{ __html: s.title }}
          />
          {s.hint && <p style={{ color: UI.dim, margin: "0 0 20px" }}>{s.hint}</p>}
          <div>{s.body}</div>
          <div style={{ display: "flex", gap: 8, margin: "28px 0 40px" }}>
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} style={btn(false)}>
                Back
              </button>
            )}
            <button
              disabled={blocked(step)}
              onClick={() => setStep(step + 1 >= steps.length ? "review" : step + 1)}
              style={{ ...btn(true), opacity: blocked(step) ? 0.4 : 1, padding: "10px 20px" }}
            >
              {step + 1 >= steps.length ? "See my page" : "Next"}
            </button>
            {!blocked(step) && step + 1 < steps.length && (
              <button
                onClick={() => setStep("review")}
                style={{ ...btn(false), marginLeft: "auto" }}
              >
                Skip the rest
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: "0 0 auto", paddingBottom: 40 }}>
          <PhonePreview project={project} scale={0.7} />
          <p
            style={{
              color: UI.dim,
              fontSize: 12,
              textAlign: "center",
              marginTop: 10,
              width: 320 * 0.7,
            }}
          >
            Filling in as you go
          </p>
        </div>
      </div>
      {exporting && <ExportSheet project={project} onClose={() => setExporting(false)} />}
    </div>
  );
}
