import * as Sentry from "@sentry/react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router-dom";
import { useEffect } from "react";
import { Config } from "./config";

const sentryInit = () => {
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
      Sentry.globalHandlersIntegration({
        onerror: true,
        onunhandledrejection: true,
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

  // Patch console.error to auto-capture errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args); // Preserve original behavior
    args.forEach((arg) => {
      if (arg instanceof Error) {
        Sentry.captureException(arg);
      }
    });
  };
};

export default sentryInit;
