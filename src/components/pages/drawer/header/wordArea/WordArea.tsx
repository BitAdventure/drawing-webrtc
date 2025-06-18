import { useMemo } from "react";
import Underline from "@/assets/draw/header/letter-underline.svg?react";
import { nanoid } from "@reduxjs/toolkit";
import { RoundType } from "@/constants/types";
import { RoundStatuses } from "@/constants/enums";

import styles from "./style.module.css";

type PropsType = {
  isDrawer: boolean;
  roundInfo: RoundType;
  isCurrentUserGuessTheWord: boolean;
};

const WordArea: React.FC<PropsType> = ({
  isDrawer,
  roundInfo,
  isCurrentUserGuessTheWord,
}) => {
  const letters = useMemo(
    () =>
      roundInfo.word
        ? roundInfo.word.label.split("").map((letter) => ({
            symbol: letter,
            id: nanoid(),
          }))
        : [],
    [roundInfo.word]
  );

  const showWord = useMemo(
    () =>
      roundInfo.status === RoundStatuses.COMPLETED ||
      roundInfo.status === RoundStatuses.SHOW_RESULT ||
      isDrawer ||
      isCurrentUserGuessTheWord,
    [roundInfo.status, isDrawer, isCurrentUserGuessTheWord]
  );

  return (
    <div className={styles.wordAreaWrap}>
      <div className={styles.guesserAreaWrap}>
        {roundInfo.word ? (
          <>
            <div className={styles.guesserWord}>
              {letters.map((letter, index) => (
                <div key={letter.id} className={styles.letterWrap}>
                  {(showWord || roundInfo.hints.includes(index)) && (
                    <p>{letter.symbol}</p>
                  )}
                  <Underline
                    className={letter.symbol === " " ? styles.transparent : ""}
                  />
                </div>
              ))}
            </div>
            <div className={styles.guessItText}>
              {isDrawer ? "draw this!" : "guess this!"}
            </div>
          </>
        ) : (
          <div className={styles.waitingText}>Waiting...</div>
        )}
      </div>
    </div>
  );
};

export default WordArea;
