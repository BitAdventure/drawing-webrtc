import { RoundType } from "../../../../../constants/types";

import styles from "./../style.module.css";

type PropsType = {
  isDrawer: boolean;
  roundInfo: RoundType;
  handleStartGame: () => void;
};

const WordChoiceWaiting: React.FC<PropsType> = ({
  isDrawer,
  handleStartGame,
}) => {
  return (
    <div className={styles.wordChoice}>
      {isDrawer ? (
        <>
          <button
            type="button"
            onClick={handleStartGame}
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
