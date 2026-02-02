import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// We removed <BrowserRouter> from here because it is already in App.tsx
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
