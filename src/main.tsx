import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import setupInterceptors from "./services/setupInterceptors";
import store from "./store/store";
import { Provider } from "react-redux";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <App />
  </Provider>
);

setupInterceptors(store);
