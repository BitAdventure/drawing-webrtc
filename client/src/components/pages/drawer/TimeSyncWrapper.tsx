import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import Drawer from "./Drawer";
import { ServerURL } from "@/constants/constants";
// import { create } from "timesync";
import { useEffect, useState } from "react";

const TimeSyncWrapper = () => {
  const [timeDifferenceLoading, setTimeDifferenceLodaing] = useState(true);
  const [timeDifference, setTimeDifference] = useState(0);

  useEffect(() => {
    // const ts = create({
    //   server: `${ServerURL}/time`, // Your server endpoint to fetch time
    //   repeat: 3,
    //   delay: 1000,
    // });

    const reqStartTime = new Date().getTime();

    fetch(`${ServerURL}/time`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((res) => {
        console.log(
          "SERVER TIME FROM DIRECT FETCH: ",
          new Date(res.time),
          res.time
        );
        console.log(
          "LOCAL TIME FROM DIRECT FETCH: ",
          new Date(),
          new Date().toISOString()
        );
        const reqEndTime = new Date().getTime();

        const actualAvgTime = (reqStartTime + reqEndTime) / 2;

        setTimeDifference(actualAvgTime - new Date(res.time).getTime());
        setTimeDifferenceLodaing(false);
      });

    // const syncTime = async () => {
    //   try {
    //     const syncedTime = await ts.now(); // Get synchronized server time
    //     console.log("SERVER TIME: ", new Date(syncedTime), syncedTime);
    //     console.log("LOCAL TIME: ", new Date());
    //     setTimeDifferenceLodaing(false);
    //     // Calculate the difference in seconds
    //     // const differenceInSeconds = Math.round((syncedTime - localTime) / 1000);
    //     // setTimeDifference(differenceInSeconds);
    //   } catch (error) {
    //     console.error("Error syncing time:", error);
    //   }
    // };
    // syncTime();
  }, []);

  return timeDifferenceLoading ? (
    <AppLoader />
  ) : (
    <Drawer timeDifference={timeDifference} />
  );
};

export default TimeSyncWrapper;
