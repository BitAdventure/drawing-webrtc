import AppLoader from "../../common/UI/appLoader/AppLoader";
import TestDrawArea from "./drawArea/DrawArea";
import Header from "./header/Header";
import { DRAW_TIME } from "../../../constants/constants";
import useWebRTC from "../../../hooks/useWebRTC";

import styles from "./style.module.css";

const Drawer: React.FC = () => {
  const { loading, handleStartGame, isDrawer, eventData, broadcast } =
    useWebRTC();

  return loading || !eventData ? (
    <AppLoader />
  ) : (
    <div className={styles.contentWrap}>
      <Header
        drawTime={DRAW_TIME}
        roundInfo={eventData.roundInfo}
        isDrawer={isDrawer}
      />
      <main className={styles.mainAreaWrap}>
        <TestDrawArea
          handleStartGame={handleStartGame}
          broadcast={broadcast}
          isDrawer={isDrawer}
          roundInfo={eventData.roundInfo}
        />
      </main>
    </div>
  );
};

export default Drawer;
