import playerBg from "@/assets/results/non-podium-place-bg.png";
import { PlayerResultType } from "@/constants/types";

import styles from "./style.module.css";

type PropsType = {
  player: PlayerResultType;
};

const Participant: React.FC<PropsType> = ({ player }) => {
  return (
    <div className={styles.participantWrap}>
      <img src={playerBg} alt={`${player.rank} place`} />
      <div className={styles.textContent}>
        <div className={styles.playerRank}>{player.rank + 1}</div>
        <div className={styles.playerInfoWrap}>
          <p className={styles.playerName}>{player.name}</p>
          <p className={styles.playerPoints}>{`${
            player.result || 0
          } points`}</p>
        </div>
      </div>
    </div>
  );
};

export default Participant;
