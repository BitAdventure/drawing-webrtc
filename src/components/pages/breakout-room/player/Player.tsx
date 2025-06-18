import { useMemo } from "react";
import playerIcons from "@/services/player-icons";
import AvatarItem from "../../pick-avatar/avatarItem/AvatarItem";
import classNames from "classnames";
import { PlayerType } from "@/constants/types";

import styles from "./style.module.css";

type PropsType = {
  player: PlayerType;
};

const Player: React.FC<PropsType> = ({ player }) => {
  const playerClass = useMemo(
    () =>
      classNames({
        [styles.playerWrap]: true,
        [styles[`player_${player.index}`]]: true,
      }),
    [player]
  );

  return (
    <li className={playerClass}>
      <AvatarItem
        item={playerIcons[player.avatarId || 0]}
        isBreakout
        index={player.index}
      />
      <span>{player.name}</span>
    </li>
  );
};

export default Player;
