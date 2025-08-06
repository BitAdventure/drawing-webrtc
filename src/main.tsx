import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import setupInterceptors from "./services/setupInterceptors";
import store from "./store/store";
import { Provider } from "react-redux";
import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { useEffect } from "react";
import { Config } from "./services/config.ts";

import "./index.css";
console.log(Config);
Config.MODE === "production" &&
  Sentry.init({
    dsn: Config.SENTRY_DSN,
    integrations: [
      Sentry.replayIntegration(),
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    normalizeDepth: 10,
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    ignoreErrors: [/^TerminatedCloseEvent: 4499: Terminated/], // ignore error in wsClient.terminate
  });

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);

setupInterceptors(store);
