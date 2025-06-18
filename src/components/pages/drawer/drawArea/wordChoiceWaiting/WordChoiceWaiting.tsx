import { useCallback, useEffect, useState } from "react";
import { useSelector } from "@/hooks/useSelector";
import playerIcons from "@/services/player-icons";
import { RoundStatuses } from "@/constants/enums";
import { Socket } from "socket.io-client";
import { useActions } from "@/hooks/useActions";
import Word from "./word/Word";
import { RoundType, WordType } from "@/constants/types";

import styles from "./../style.module.css";

type PropsType = {
  isDrawer: boolean;
  roundInfo: RoundType;
  socket: Socket;
};

const WordChoiceWaiting: React.FC<PropsType> = ({
  isDrawer,
  roundInfo,
  socket,
}) => {
  const words = useSelector((state) => state.game.currentRound?.wordsForDraw);
  const disabled = useSelector((state) => state.game.choiceWordLoading);
  const { updateChoiceWordLoading } = useActions();
  const [wordChoiceTimeRemaining, setWordChoiceTimeRemaining] = useState(15);

  useEffect(() => {
    if (isDrawer) {
      let timer: number;
      if (roundInfo.wordChoiceStartTime) {
        timer = window.setInterval(() => {
          const timeRemaining = roundInfo.wordChoiceStartTime
            ? Math.floor(
                (roundInfo.wordChoiceStartTime +
                  15 * 1000 -
                  new Date().getTime()) /
                  1000
              )
            : 0;
          roundInfo.wordChoiceStartTime &&
            timeRemaining >= 0 &&
            timeRemaining <= 15 &&
            setWordChoiceTimeRemaining(timeRemaining);
          timeRemaining - 1 < 0 && clearInterval(timer);
        }, 1000);
      }

      return () => {
        clearInterval(timer);
      };
    }
  }, [roundInfo.wordChoiceStartTime, isDrawer]);

  const handleSelectWord = useCallback(
    (word: WordType) => {
      updateChoiceWordLoading(true);
      socket.emit("start-round", {
        roundId: roundInfo.id,
        updates: {
          word,
          startTime: new Date().getTime(),
          status: RoundStatuses.ONGOING,
        },
      });
    },
    [roundInfo.id, socket, updateChoiceWordLoading]
  );

  return (
    <div className={styles.wordChoice}>
      {isDrawer ? (
        <>
          <p
            className={styles.wordChoiceTitle}
          >{`Choose A Word (${wordChoiceTimeRemaining})`}</p>
          <ul className={styles.wordsList}>
            {words?.map((word) => (
              <Word
                key={word.id}
                word={word}
                handleSelectWord={handleSelectWord}
                disabled={disabled}
              />
            ))}
          </ul>
        </>
      ) : (
        <>
          <img
            src={playerIcons[roundInfo.drawer.avatarId || 0].src}
            alt={`${roundInfo.drawer.name} avatar`}
          />
          <p
            className={styles.wordChoiceTitle}
          >{`${roundInfo?.drawer.name} is choosing a word!`}</p>
        </>
      )}
    </div>
  );
};

export default WordChoiceWaiting;
