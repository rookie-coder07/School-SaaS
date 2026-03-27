import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/ToastProvider";
import { LanguageProvider } from "./context/LanguageContext";
import "./index.css";

console.log("✅ main.jsx loaded - React app initializing");

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ToastProvider>
      <LanguageProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </LanguageProvider>
    </ToastProvider>
  </ErrorBoundary>
);
