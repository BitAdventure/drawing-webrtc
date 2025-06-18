import { useMemo } from "react";
import { PlayerType } from "@/constants/types";
import classNames from "classnames";
import PlayerBg from "@/assets/draw/draw-player-bg.svg?react";
import CommonPlayerBg from "@/assets/draw/draw-common-player-bg.svg?react";
import playerIcons from "@/services/player-icons";

import styles from "./style.module.css";

type PropsType = {
  player: PlayerType;
  index: number;
};

const Player: React.FC<PropsType> = ({ player, index }) => {
  const playerClass = useMemo(
    () =>
      classNames({
        [styles.playerWrap]: true,
        [styles.common]: index > 2,
        [styles.first]: index === 0,
        [styles.second]: index === 1,
        [styles.third]: index === 2,
      }),
    [index]
  );

  const bgClass = useMemo(
    () =>
      classNames({
        [styles.bg]: true,
        [styles.firstBg]: index === 0,
        [styles.secondBg]: index === 1,
        [styles.thirdBg]: index === 2,
      }),
    [index]
  );

  return (
    <div className={playerClass}>
      {index > 2 ? (
        <CommonPlayerBg className={bgClass} />
      ) : (
        <PlayerBg className={bgClass} />
      )}
      <div className={styles.textContent}>
        <div className={styles.playerRank}>{index + 1}</div>
        <div className={styles.playerInfoWrap}>
          <div className={styles.playerInfoTextGroup}>
            <p className={styles.playerName}>{player.name}</p>
            <p className={styles.playerPoints}>{`${
              player.result || 0
            } points`}</p>
          </div>
          {index <= 2 && (
            <img
              src={playerIcons[player.avatarId || 0].src}
              alt={`${player.name} avatar`}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Player;
