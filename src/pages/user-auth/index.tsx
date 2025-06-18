import { useLocation, useNavigate, useParams } from "react-router-dom";
import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import TokenService from "@/services/tokenService";
import useMountEffect from "@/hooks/useMountEffect";
import { useAuth } from "@/hooks/useAuth";
import { LOGIN, PICK_AVATAR } from "@/constants/routes";
import { useActions } from "@/hooks/useActions";

const UserAuth = () => {
  const { id } = useParams();
  const location = useLocation();
  const { isAuth } = useAuth();
  const navigate = useNavigate();
  const { getAuth } = useActions();

  useMountEffect(() => {
    (async () => {
      const authorizedNavigateTo = `/${id}/${PICK_AVATAR}`;
      if (isAuth) return navigate(authorizedNavigateTo);

      const searchParams = new URLSearchParams(location.search);

      const access_token = searchParams.get("access_token");
      const refresh_token = searchParams.get("refresh_token");

      if (access_token && refresh_token) {
        TokenService.setUser({ access_token, refresh_token, event_id: id });
        await getAuth();

        return navigate(authorizedNavigateTo);
      }

      return navigate(`${id}/${LOGIN}`);
    })();
  });

  return <AppLoader />;
};

export default UserAuth;
