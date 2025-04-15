import { useCallback } from "react";
import { WordType } from "@/constants/types";

import styles from "./../../style.module.css";

type PropsType = {
  word: WordType;
  handleSelectWord: (word: WordType) => void;
  disabled: boolean;
};

const Word: React.FC<PropsType> = ({ word, handleSelectWord, disabled }) => {
  const handlePickWord = useCallback(
    () => !disabled && handleSelectWord(word),
    [handleSelectWord, word, disabled]
  );

  return (
    <li key={word.id} className={styles.wordWrap} onClick={handlePickWord}>
      {word.label}
      <img src={"/bg/choose-word-border.png"} alt={"word-outline"} />
    </li>
  );
};

export default Word;
