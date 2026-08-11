import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.js";
import { HoursPrototype } from "./prototype-hours/HoursPrototype.js";

const container = document.getElementById("root");
if (!container) throw new Error("#root is missing from index.html");

/** PROTOTYPE — throwaway. `?prototype=hours` opens ticket #80's variants instead of the app. */
const prototype = new URLSearchParams(window.location.search).get("prototype");

createRoot(container).render(
  <StrictMode>{prototype === "hours" ? <HoursPrototype /> : <App />}</StrictMode>,
);
