import { Suspense, lazy } from "react";
import {
  Navigate,
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
} from "react-router-dom";
import ProtectedUnauthorizedRoute from "./components/common/protectedUnauthorizedRoute/ProtectedUnauthorizedRoute";
import MainLayout from "./layouts/main/MainLayout";
import * as ROUTES from "./constants/routes";
import { ToastContainer } from "react-toastify";
import ProtectedRoute from "./components/common/protectedRoute/ProtectedRoute";
import AppLoader from "./components/common/UI/appLoader/AppLoader";

import "react-toastify/dist/ReactToastify.css";
import "./App.css";

const HomePage = lazy(() => import("./pages/home/index"));
const SignIn = lazy(() => import("./pages/sign-in/index"));
const UserAuth = lazy(() => import("./pages/user-auth/index"));
const PickAvatar = lazy(() => import("./pages/pick-avatar/index"));
const BreakoutRoom = lazy(() => import("./pages/breakout-room/index"));
const Draw = lazy(() => import("./pages/drawer/index"));
const Results = lazy(() => import("./pages/results/index"));

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route>
      <Route path={ROUTES.HOME} element={<MainLayout />}>
        <Route index element={<HomePage />} />
        <Route path={ROUTES.EVENT_ID}>
          <Route
            path={ROUTES.LOGIN}
            element={
              <ProtectedUnauthorizedRoute>
                <SignIn />
              </ProtectedUnauthorizedRoute>
            }
          />
          <Route path={"player-auth"} element={<UserAuth />} />
          <Route
            path={ROUTES.PICK_AVATAR}
            element={
              <ProtectedRoute>
                <PickAvatar />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.BREAKOUT_ROOM}
            element={
              <ProtectedRoute>
                <BreakoutRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.DRAW}
            element={
              <ProtectedRoute>
                <Draw />
              </ProtectedRoute>
            }
          />
          <Route
            path={ROUTES.RESULTS}
            element={
              <ProtectedRoute>
                <Results />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path={"*"} element={<Navigate to={ROUTES.LOGIN} />} />
      </Route>
    </Route>
  )
);

const App: React.FC = () => (
  <div className="App">
    <Suspense fallback={<AppLoader />}>
      <RouterProvider router={router} />
      <ToastContainer autoClose={1500} />
    </Suspense>
  </div>
);

export default App;
