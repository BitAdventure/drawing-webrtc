import UndoIcon from "@/assets/draw/undo-icon.svg?react";

import styles from "./style.module.css";

type PropsType = {
  handleUndo: () => void;
};

const Undo: React.FC<PropsType> = ({ handleUndo }) => (
  <div className={styles.undoWrap} onClick={handleUndo}>
    <div className={styles.undoArea}>
      <UndoIcon />
      <span>U</span>
    </div>
    <div className={styles.undoText}>Undo</div>
  </div>
);

export default Undo;
