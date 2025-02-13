import styles from "./style.module.css";

type PropsType = {
  color: string;
};

const CurrentColor: React.FC<PropsType> = ({ color }) => {
  return (
    <div className={styles.componentWrap}>
      <div className={styles.colorBlock} style={{ background: color }} />
      <p className={styles.currColorText}>
        Brush/
        <br />
        Fill Color
      </p>
    </div>
  );
};

export default CurrentColor;
