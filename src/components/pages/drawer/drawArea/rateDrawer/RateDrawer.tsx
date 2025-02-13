import LikeIcon from "./../../../../../assets/icons/like-icon.svg?react";
import DislikeIcon from "./../../../../../assets/icons/dislike-icon.svg?react";

import styles from "./style.module.css";

type PropsType = {
  isDrawer: boolean;
  handleRateDrawer: (type: "LIKE" | "DISLIKE") => void;
};

const RateDrawer: React.FC<PropsType> = ({ isDrawer, handleRateDrawer }) => {
  return (
    !isDrawer && (
      <div className={styles.rateAreaWrap}>
        <button type="button" onClick={() => handleRateDrawer("LIKE")}>
          <LikeIcon />
        </button>
        <button type="button" onClick={() => handleRateDrawer("DISLIKE")}>
          <DislikeIcon />
        </button>
      </div>
    )
  );
};

export default RateDrawer;
