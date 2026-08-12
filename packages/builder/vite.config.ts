import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `base` is the GitHub Pages project path (https://<user>.github.io/linkpage/). Change it
// if the repo is renamed or moved to a custom domain, or the built assets 404.
//
// PROTOTYPE (ticket #84): `@tailwindcss/vite` is here to prove v4 builds against Vite 8 and
// this workspace. It is builder-only — the renderer has no build of its own to add it to, and
// `stylesheet.ts` stays hand-written.
export default defineConfig({
  base: "/linkpage/",
  plugins: [tailwindcss(), react()],
});
