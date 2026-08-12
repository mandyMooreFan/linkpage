import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { TailwindPrototype } from "./prototype-tailwind/TailwindPrototype.js";

/** PROTOTYPE — throwaway. `?prototype=tailwind` opens ticket #84's design directions. */
const prototype = new URLSearchParams(window.location.search).get("prototype");

const container = document.getElementById("root");
if (!container) throw new Error("#root is missing from index.html");

createRoot(container).render(
  <StrictMode>{prototype === "tailwind" ? <TailwindPrototype /> : <App />}</StrictMode>,
);
