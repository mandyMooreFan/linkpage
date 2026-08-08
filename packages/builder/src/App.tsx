import { render, type Project } from "@linkpage/renderer";

/**
 * Scaffold shell — not the editing screen.
 *
 * The editing screen is being designed in issue #5 and none of the layout below survives
 * that. What is worth keeping is the shape: builder state is one `Project` object, and the
 * preview is `render(project)` dropped into a `srcdoc` iframe. Because that string is
 * byte-for-byte what export writes to disk, the preview cannot drift from the export.
 */
const placeholder: Project = { title: "Ada's Bakery" };

export function App() {
  const html = render(placeholder);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "1.5rem" }}>
      <h1 style={{ fontSize: "1.25rem" }}>linkpage builder</h1>
      <p style={{ color: "#555", maxWidth: "60ch" }}>
        Scaffold only — there is no editor yet. The frame below is the renderer&rsquo;s output for a
        placeholder project, shown exactly the way the real preview will show it.
      </p>
      <iframe
        title="Preview"
        srcDoc={html}
        sandbox=""
        style={{
          width: "100%",
          height: "24rem",
          border: "1px solid #ddd",
          borderRadius: "0.5rem",
          background: "#fff",
        }}
      />
    </main>
  );
}
