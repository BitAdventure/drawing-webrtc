import { PlayerResultType } from "@/constants/types";
import Participant from "./participant/Participant";

import styles from "./style.module.css";

type PropsType = {
  players: Array<PlayerResultType>;
};

const NonPodium: React.FC<PropsType> = ({ players }) => (
  <div className={styles.podiumWrap}>
    <ul className={styles.participantsList}>
      {players.map((player) => (
        <Participant key={player.id} player={player} />
      ))}
    </ul>
  </div>
);

export default NonPodium;
