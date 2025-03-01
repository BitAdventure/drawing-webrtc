import Round from "./round/Round";
import Timer from "./timer/Timer";
import WordArea from "./wordArea/WordArea";
import { RoundType } from "../../../../constants/types";

import styles from "./style.module.css";

export type HeaderPropsType = {
  drawTime: number;
  roundInfo: RoundType;
  isDrawer: boolean;
};

const Header: React.FC<HeaderPropsType> = ({
  drawTime,
  roundInfo,
  isDrawer,
}) => {
  return (
    <header className={styles.headerWrap}>
      <div className={styles.timerWrap}>
        <Timer drawTime={drawTime} isDrawer={isDrawer} roundInfo={roundInfo} />
      </div>
      <div className={styles.drawWordWrap}>
        <WordArea
          roundInfo={roundInfo}
          isDrawer={isDrawer}
          isCurrentUserGuessTheWord={false}
        />
      </div>
      <div className={styles.curRoundWrap}>
        <Round />
      </div>
    </header>
  );
};

export default Header;
