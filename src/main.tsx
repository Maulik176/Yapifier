import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

// Title cards and labels are drawn on a canvas, which only uses fonts that
// have already loaded, so fetch the ones it draws with up front.
for (const font of ['400 64px "EB Garamond"', "500 24px Figtree", "700 24px Figtree"]) void document.fonts.load(font);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
