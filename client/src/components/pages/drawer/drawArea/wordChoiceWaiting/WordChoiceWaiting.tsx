import { RoundType } from "@/constants/types";

import styles from "./../style.module.css";

type PropsType = {
  isDrawer: boolean;
  roundInfo: RoundType;
  handleStartGame: () => void;
  startGameLoading: boolean;
};

const WordChoiceWaiting: React.FC<PropsType> = ({
  isDrawer,
  handleStartGame,
  startGameLoading,
}) => {
  return (
    <div className={styles.wordChoice}>
      {isDrawer && !startGameLoading ? (
        <>
          <button
            type="button"
            onClick={handleStartGame}
            disabled={startGameLoading}
            className={styles.wordChoiceTitle}
          >
            START
          </button>
        </>
      ) : (
        <>
          <p className={styles.wordChoiceTitle}>Wait...</p>
        </>
      )}
    </div>
  );
};

export default WordChoiceWaiting;
