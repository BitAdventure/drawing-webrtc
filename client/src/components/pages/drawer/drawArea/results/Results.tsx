import { RoundType } from "@/constants/types";

import styles from "./style.module.css";
import { useSelector } from "@/hooks/useSelector";
import { useMemo } from "react";

type PropsType = {
  roundInfo: RoundType;
};

const Results: React.FC<PropsType> = ({ roundInfo }) => {
  const isAllPlayersGuessTheWord = useSelector((state) => state.game.isAllPlayersGuessTheWord);
  const roundResults = useSelector((state) => state.game.roundResults);

  const headerText = useMemo(
    () => (isAllPlayersGuessTheWord ? "EVERYONE GUESSED IT!" : "TIME'S UP!"),
    [isAllPlayersGuessTheWord]
  );

  return (
    <div className={styles.resultsWrap}>
      <h1 className={styles.resultsHeader}>{headerText}</h1>
      <p className={styles.resultsSubheader}>
        The word was <span>{roundInfo.word?.label}</span>
      </p>
      <ul className={styles.resultsList}>
        {roundResults.map((player) => (
          <li key={player.id} className={styles.playerWrap}>
            <p className={styles.playerName}>{player.name}</p>
            <p className={styles.playerRoundScore}>{`${player.roundResult > 0 ? "+" : ""}${player.roundResult}`}</p>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Results;
