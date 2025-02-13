import { Outlet } from "react-router-dom";

import styles from "./style.module.css";

const MainLayout = () => {
  return (
    <div className={styles.pageWrapper}>
      <Outlet />
    </div>
  );
};

export default MainLayout;
// import { Outlet } from "react-router-dom";
// import { RootState, useSelector } from "../../hooks/useSelector";
// import TokenService from "../../services/tokenService";
// import { useAuth } from "../../hooks/useAuth";
// import useMountEffect from "../../hooks/useMountEffect";
// import { useActions } from "../../hooks/useActions";
// import AppLoader from "../../components/common/UI/appLoader/AppLoader";
// import { useParams } from "react-router-dom";

// import styles from "./style.module.css";

// const MainLayout = () => {
//   const { id } = useParams();
//   const appLoading = useSelector((state: RootState) => state.auth.appLoading);
//   const { getAuth } = useAuth();
//   const { removeAppLoading } = useActions();

//   useMountEffect(() => {
//     const storageEventId = TokenService.getEventId();
//     const accessToken = TokenService.getLocalAccessToken();
//     (async () => {
//       if (!accessToken || (storageEventId && storageEventId !== id)) {
//         TokenService.removeUser();
//       } else {
//         accessToken && (await getAuth());
//       }
//       removeAppLoading();
//       // then do what you need after event id validation
//       // await getEventTheme(id!);
//     })();
//   });

//   return !appLoading ? (
//     <div className={styles.pageWrapper}>
//       <Outlet />
//     </div>
//   ) : (
//     <AppLoader />
//   );
// };

// export default MainLayout;
