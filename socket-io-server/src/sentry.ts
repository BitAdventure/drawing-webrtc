import * as Sentry from "@sentry/node";

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  sendDefaultPii: true,
});

// Override console.error to also send to Sentry
const originalConsoleError = console.error;

console.error = (...args) => {
  // First, call the original console.error
  originalConsoleError.apply(console, args);

  // Then capture with Sentry
  try {
    const errorMessage = args
      .map((arg) => (arg instanceof Error ? arg.stack : String(arg)))
      .join(" ");

    Sentry.captureMessage(errorMessage, {
      level: "error",
      extra: { consoleArgs: args },
    });
  } catch (e) {
    originalConsoleError("Failed to capture console.error in Sentry", e);
  }
};
