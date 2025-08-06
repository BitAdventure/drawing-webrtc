import * as Sentry from "@sentry/react";
import { configureStore, combineReducers } from "@reduxjs/toolkit";
import reducer from "./reducer";
import { Config } from "@/services/config";

const sentryReduxEnhancer = Sentry.createReduxEnhancer({});

const store = configureStore({
  reducer: combineReducers(reducer),
  devTools: Config.MODE !== "production",
  enhancers: (getDefaultEnhancers) =>
    getDefaultEnhancers().concat(sentryReduxEnhancer),
});

export default store;
