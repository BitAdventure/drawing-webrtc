import ReactDOM from "react-dom/client";
import App from "./App";
import setupInterceptors from "./services/setupInterceptors";
import store from "./store/store";
import { Provider } from "react-redux";
import * as Sentry from "@sentry/react";
import { Config } from "./services/config";
import sentryInit from "./services/sentryInit";

import "./index.css";

Config.MODE === "production" && sentryInit();
setupInterceptors(store);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Sentry.ErrorBoundary>
    <Provider store={store}>
      <App />
    </Provider>
  </Sentry.ErrorBoundary>
);
