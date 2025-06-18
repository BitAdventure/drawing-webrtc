import { useCallback, useMemo, useRef, useState } from "react";
import { useSelector } from "@/hooks/useSelector";
import { PlayerType } from "@/constants/types";
import Player from "./player/Player";
import Chevron from "@/assets/icons/chevron-down-icon.svg?react";
import classNames from "classnames";

import styles from "./style.module.css";

const PlayersPanel: React.FC = () => {
  const listRef = useRef<HTMLUListElement>(null);
  const [isScrollToBottom, seIsScrollToBottom] = useState(false);

  const players = useSelector(
    (state) => state.game.eventInfo?.team.players || []
  );

  const sortByResultPlayers = useMemo(
    () =>
      [...players].sort(
        (a: PlayerType, b: PlayerType) => (b.result || 0) - (a.result || 0)
      ),
    [players]
  );

  const handleScroll = useCallback(() => {
    if (listRef.current)
      listRef.current.scrollTo({
        top: isScrollToBottom ? 0 : 300,
        behavior: "smooth",
      });
    seIsScrollToBottom((prev) => !prev);
  }, [isScrollToBottom]);

  const scrollToBtnClass = useMemo(
    () =>
      classNames({
        [styles.navigationBtn]: true,
        [styles.toTop]: isScrollToBottom,
      }),
    [isScrollToBottom]
  );

  return (
    <div className={styles.panelWrap}>
      <ul className={styles.playersList} ref={listRef}>
        {sortByResultPlayers.map((player, index) => (
          <Player key={player.id} player={player} index={index} />
        ))}
      </ul>
      {players.length > 6 && (
        <button
          type="button"
          className={scrollToBtnClass}
          onClick={handleScroll}
        >
          <Chevron />
        </button>
      )}
    </div>
  );
};

export default PlayersPanel;
