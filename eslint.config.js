import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**", "**/coverage/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    /**
     * The screenshot capture script. Plain ESM run by hand, never by CI, so it is not covered by
     * either package's tsconfig — which means `no-undef` is the only thing checking its names,
     * and it needs to be told which ones exist. `window` appears inside a `page.addInitScript`
     * callback, which is serialised and run in the browser rather than here.
     */
    files: ["packages/builder/scripts/**/*.mjs"],
    languageOptions: {
      globals: { console: "readonly", process: "readonly", URL: "readonly", window: "readonly" },
    },
  },
  {
    // The renderer is the artifact contract: it must stay dependency-free and must never
    // emit a <script> tag. The invariant tests enforce both; this rule stops the most
    // common way a contributor would breach the first one by accident.
    files: ["packages/renderer/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["react", "react-dom", "react/*", "react-dom/*"],
              message: "packages/renderer is dependency-free by design — see CONTRIBUTING.md.",
            },
          ],
        },
      ],
    },
  },
);
