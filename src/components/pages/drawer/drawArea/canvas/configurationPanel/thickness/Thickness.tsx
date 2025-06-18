import styles from "./style.module.css";

type PropsType = {
  changeThickness: () => void;
};

const Thickness: React.FC<PropsType> = ({ changeThickness }) => (
  <div className={styles.thicknessWrap} onClick={changeThickness}>
    <div className={styles.thicknessArea}>
      <div className={styles.thicknessBlob} />
      <span>T</span>
    </div>
    <div className={styles.thicknessText}>Thickness</div>
  </div>
);

export default Thickness;
