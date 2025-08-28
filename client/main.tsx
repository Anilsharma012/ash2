import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Import API diagnostics for debugging (only in development)
if (import.meta.env.DEV) {
  import("./utils/api-diagnostics").then(() => {
    console.log(
      "🔧 API diagnostics loaded. Use window.apiDiagnostics to debug API issues.",
    );
  });
}

// Get the root element
const container = document.getElementById("root");

if (!container) {
  throw new Error("Root element not found");
}

// Create root only once and store it
let root: ReturnType<typeof createRoot> | null = null;

function initializeApp() {
  if (!root) {
    root = createRoot(container);
  }
  root.render(<App />);
}

// Initialize the app
initializeApp();

// Hot Module Replacement (HMR) support for development
if (import.meta.hot) {
  import.meta.hot.accept("./App", () => {
    // Re-render the app when App.tsx changes, but don't create a new root
    if (root) {
      root.render(<App />);
    }
  });
}
