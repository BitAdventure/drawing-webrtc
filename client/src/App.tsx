import { Suspense, lazy } from "react";
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import MainLayout from "./layouts/main/MainLayout";
import * as ROUTES from "./constants/routes";
import AppLoader from "./components/common/UI/appLoader/AppLoader";

import "./App.css";

const Draw = lazy(() => import("./pages/draw/index"));

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path={ROUTES.HOME} element={<MainLayout />}>
        <Route path={ROUTES.EVENT_ID} element={<Draw />} />
      </Route>
    </Route>
  )
);

const App: React.FC = () => {
  return (
    <div className="App">
      <Suspense fallback={<AppLoader />}>
        <RouterProvider router={router} />
      </Suspense>
    </div>
  );
};

export default App;
