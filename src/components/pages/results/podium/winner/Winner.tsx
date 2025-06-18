import { useMemo } from "react";
import classNames from "classnames";
import { PlayerResultType } from "@/constants/types";
import firstPlaceMedal from "@/assets/results/first-place-bg.png";
import secondPlaceMedal from "@/assets/results/second-place-bg.png";
import thirdPlaceMedal from "@/assets/results/third-place-bg.png";

import styles from "./style.module.css";

const placesMedals = [firstPlaceMedal, secondPlaceMedal, thirdPlaceMedal];

type PropsType = {
  player: PlayerResultType;
};

const Winner: React.FC<PropsType> = ({ player }) => {
  const winnerWrapClass = useMemo(
    () =>
      classNames({
        [styles.winnerWrap]: true,
        [styles.firstPlace]: player.rank === 0,
        [styles.secondPlace]: player.rank === 1,
        [styles.thirdPlace]: player.rank === 2,
      }),
    [player.rank]
  );

  const placeText = useMemo(() => {
    switch (player.rank) {
      case 0:
        return "Champion";
      case 1:
        return "2nd place";
      case 2:
        return "3rd place";
    }
  }, [player.rank]);

  return (
    <div className={winnerWrapClass}>
      <img src={placesMedals[player.rank]} alt={`${player.rank + 1} place`} />
      <div className={styles.textWrap}>
        <p className={styles.playerName}>{player.name}</p>
        <p className={styles.playerPoints}>{`${player.result || 0} points`}</p>
      </div>
      <p className={styles.placeWrap}>{placeText}</p>
    </div>
  );
};

export default Winner;
