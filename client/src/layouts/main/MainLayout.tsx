import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { create } from "timesync";

import styles from "./style.module.css";
import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import { ServerURL } from "@/constants/constants";

const MainLayout = () => {
  const [timeDifferenceLoading, setTimeDifferenceLodaing] = useState(true);

  useEffect(() => {
    const ts = create({
      server: `${ServerURL}/time`, // Your server endpoint to fetch time
      repeat: 3,
      delay: 1000,
    });

    const syncTime = async () => {
      try {
        const syncedTime = await ts.now(); // Get synchronized server time
        console.log("SERVER TIME: ", new Date(syncedTime), syncedTime);
        console.log("LOCAL TIME: ", new Date());
        setTimeDifferenceLodaing(false);
        // Calculate the difference in seconds
        // const differenceInSeconds = Math.round((syncedTime - localTime) / 1000);
        // setTimeDifference(differenceInSeconds);
      } catch (error) {
        console.error("Error syncing time:", error);
      }
    };
    syncTime();
  }, []);

  return timeDifferenceLoading ? (
    <AppLoader />
  ) : (
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
