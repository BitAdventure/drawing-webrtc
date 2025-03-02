import ClearIcon from "@/assets/draw/clear-icon.svg?react";
import styles from "./style.module.css";

type PropsType = {
  handleClear: () => void;
};

const Clear: React.FC<PropsType> = ({ handleClear }) => {
  return (
    <div className={styles.clearWrap} onClick={handleClear}>
      <div className={styles.clearArea}>
        <ClearIcon />
        <span>C</span>
      </div>
      <div className={styles.clearText}>Clear</div>
    </div>
  );
};

export default Clear;
