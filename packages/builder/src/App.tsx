import { SCHEMA_VERSION, type Project } from "@linkpage/renderer";
import { Preview } from "./preview/Preview.js";

/**
 * Scaffold shell — not the editing screen.
 *
 * The editing screen is specified in `SPEC.md` §7 and built in #33 and #34; none of the
 * layout below survives that. What is worth keeping is the shape: builder state is one
 * project object, and the preview is `render(project)` dropped into a `srcdoc` iframe.
 * Because that string is byte-for-byte what export writes to disk, the preview cannot drift
 * from the export.
 *
 * The `<Preview>` below is the real one. The placeholder project and the prose around it are
 * what goes.
 */
const placeholder: Project = {
  version: SCHEMA_VERSION,
  lang: "en",
  style: {
    brand: "#c2185b",
    shape: "centred",
    type: "classic",
    corners: 0.6,
    mode: "light",
    advanced: { enabled: false, colors: {} },
  },
  header: { name: "Ada's Bakery", logo: null },
  links: [],
};

export function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.25rem" }}>linkpage builder</h1>
      <p style={{ color: "#555", maxWidth: "60ch" }}>
        Scaffold only — there is no editor yet. The drawer below holds the renderer&rsquo;s output
        for a placeholder project: on a phone it comes up over the whole screen, and where there is
        room it sits open beside this text.
      </p>
      <Preview project={placeholder} />
    </main>
  );
}
