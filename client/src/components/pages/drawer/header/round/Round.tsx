// import { useSelector } from "../../../../../hooks/useSelector";
import RoundBg from "@/assets/draw/draw-round-bg.svg?react";

import styles from "./style.module.css";

const Round: React.FC = () => {
  // const round = useSelector((state) => (state.game.currentRound?.index || 0) + 1);
  // const totalRounds = useSelector((state) => state.game.eventInfo?.gameInformation.totalRounds);

  return (
    <div className={styles.roundWrap}>
      <RoundBg />
      <p className={styles.roundText}>
        Round 1
        {/* round <span>{round}</span> <span>{`of ${totalRounds}`}</span> */}
      </p>
    </div>
  );
};

export default Round;
