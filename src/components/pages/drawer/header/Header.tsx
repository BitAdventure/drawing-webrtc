import Round from "./round/Round";
import Timer from "./timer/Timer";
import WordArea from "./wordArea/WordArea";
import { RoundType } from "@/constants/types";

import styles from "./style.module.css";

export type HeaderPropsType = {
  startTime: number | null;
  drawTime: number;
  roundInfo: RoundType;
  isDrawer: boolean;
  isCurrentUserGuessTheWord: boolean;
};

const Header: React.FC<HeaderPropsType> = ({
  startTime,
  drawTime,
  roundInfo,
  isDrawer,
  isCurrentUserGuessTheWord,
}) => (
  <header className={styles.headerWrap}>
    <div className={styles.timerWrap}>
      <Timer
        startTime={startTime}
        drawTime={drawTime}
        isDrawer={isDrawer}
        roundInfo={roundInfo}
      />
    </div>
    <div className={styles.drawWordWrap}>
      <WordArea
        roundInfo={roundInfo}
        isDrawer={isDrawer}
        isCurrentUserGuessTheWord={isCurrentUserGuessTheWord}
      />
    </div>
    <div className={styles.curRoundWrap}>
      <Round />
    </div>
  </header>
);

export default Header;
