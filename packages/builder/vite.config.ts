import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// `base` is the GitHub Pages project path (https://<user>.github.io/linkpage/). Change it
// if the repo is renamed or moved to a custom domain, or the built assets 404.
export default defineConfig({
  base: "/linkpage/",
  plugins: [react(), tailwind()],
});
