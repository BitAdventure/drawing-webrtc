import { AuthInitialStateType } from "../store/auth/AuthSlice";
import { useActions } from "./useActions";
import { useSelector } from "./useSelector";

export const useAuth = () => {
  const auth: AuthInitialStateType = useSelector((state) => state.auth);

  const { getAuth, removeAppLoading } = useActions();

  return {
    ...auth,
    getAuth,
    removeAppLoading,
  };
};
