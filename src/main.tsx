import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./index.css";

import { initMark } from "./analytics/mark";

// Inisialisasi analytics sekali saat aplikasi dimulai
initMark();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);