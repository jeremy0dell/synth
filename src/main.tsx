import React from "react";
import ReactDOM from "react-dom/client";
import { ConvexReactClient } from "convex/react";
import { useLocation } from "react-router-dom";
import App from "./app/App";
import { AppProviders } from "./app/providers";
import { PublicDemoApp, SetupRequiredApp } from "./app/router";
import "./styles/globals.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;
const convexClient = convexUrl ? new ConvexReactClient(convexUrl) : null;

function Root() {
  const location = useLocation();

  if (location.pathname.startsWith("/demo")) {
    return <PublicDemoApp />;
  }

  if (!convexClient) {
    return <SetupRequiredApp />;
  }

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppProviders convexClient={convexClient}>
      <Root />
    </AppProviders>
  </React.StrictMode>,
);
