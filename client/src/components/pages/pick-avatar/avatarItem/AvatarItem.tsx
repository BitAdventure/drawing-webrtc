import { useCallback, useMemo } from "react";
import { PlayerIconType } from "../../../../services/player-icons";
import classNames from "classnames";

import styles from "./style.module.css";

const AvatarAnimations = ["jump_1", "jump_2", "jump_3", "jump_4"];

type PropsType = {
  item: PlayerIconType;
  selectedAvatar?: number;
  setSelectedAvatar?: (id: number) => void;
  isBreakout?: boolean;
  isSelected?: boolean;
  index?: number;
};

const AvatarItem: React.FC<PropsType> = ({
  item,
  selectedAvatar,
  setSelectedAvatar,
  isBreakout = false,
  isSelected = false,
  index = -1,
}) => {
  const handlePickAvatar = useCallback(() => {
    setSelectedAvatar?.(item.id);
  }, [item, setSelectedAvatar]);

  const playerAvatarClass = useMemo(
    () =>
      classNames({
        [styles.playerAvatarWrap]: true,
        [styles.active]: selectedAvatar === item.id,
        [styles.isBreakout]: isBreakout,
        [styles.selectedAvatarWrap]: isSelected,
      }),
    [selectedAvatar, item, isBreakout, isSelected]
  );

  const animationStyles = useMemo(
    () =>
      index + 1
        ? {
            animation: `${AvatarAnimations[index % 4]} 2s linear 1.${index}s infinite`,
          }
        : undefined,
    [index]
  );

  return (
    <div className={playerAvatarClass} onClick={isBreakout ? undefined : handlePickAvatar}>
      <img src={item.src} alt={`player icon ${item.id}`} className={styles.playerAvatar} style={animationStyles} />
    </div>
  );
};

export default AvatarItem;
