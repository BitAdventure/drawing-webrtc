import { RoundType } from "../../Drawer";

import styles from "./style.module.css";

type PropsType = {
  roundInfo: RoundType;
};

const Results: React.FC<PropsType> = ({ roundInfo }) => {
  return (
    <div className={styles.resultsWrap}>
      <h1 className={styles.resultsHeader}>Time Left</h1>
      <p className={styles.resultsSubheader}>
        The word was <span>{roundInfo.word?.label}</span>
      </p>
    </div>
  );
};

export default Results;
