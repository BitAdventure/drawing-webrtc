import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import Drawer from "./Drawer";
import { useActions } from "@/hooks/useActions";
import { useSelector } from "@/hooks/useSelector";
import useMountEffect from "@/hooks/useMountEffect";
import { Config } from "@/services/config";

const TimeSyncWrapper = () => {
  const timeDifferenceLoading = useSelector((state) => state.game.timeDifferenceLoading);
  const { setTimeDifference } = useActions();

  useMountEffect(() => {
    const requestStartTime = new Date().getTime();

    fetch(`${Config.SERVER_URL}/time`, {
      method: "POST",
    })
      .then((res) => res.json())
      .then((res) => {
        console.log("SERVER TIME FROM DIRECT FETCH: ", new Date(res.time), res.time);
        console.log("LOCAL TIME FROM DIRECT FETCH: ", new Date(), new Date().toISOString());
        const requestEndTime = new Date().getTime();

        const actualAvgTime = (requestStartTime + requestEndTime) / 2;

        setTimeDifference(actualAvgTime - new Date(res.time).getTime());
      });
  });

  return timeDifferenceLoading ? <AppLoader /> : <Drawer />;
};

export default TimeSyncWrapper;
