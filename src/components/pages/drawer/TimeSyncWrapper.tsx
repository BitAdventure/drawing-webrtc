import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import Drawer from "./Drawer";
import useMountEffect from "@/hooks/useMountEffect";
import { useActions } from "@/hooks/useActions";
import { useSelector } from "@/hooks/useSelector";

const TimeSyncWrapper = () => {
  const timeDifferenceLoading = useSelector(
    (state) => state.game.timeDifferenceLoading
  );
  const { getTimeDifference } = useActions();

  useMountEffect(() => {
    getTimeDifference();
  });

  return timeDifferenceLoading ? <AppLoader /> : <Drawer />;
};

export default TimeSyncWrapper;
