import classNames from "classnames";
import styles from "./style.module.css";

type PropsType = {
  id: string;
  label: string;
  onChange: (e: any) => void;
  value: boolean;
  isDisabled?: boolean;
};

const Toggle: React.FC<PropsType> = ({
  id,
  label,
  onChange,
  value,
  isDisabled = false,
}) => {
  const componentClass = classNames({
    [styles.toggleWrap]: true,
    [styles.isDisabled]: isDisabled,
  });

  const onText = classNames({
    [styles.onText]: true,
    [styles.on]: value,
  });

  const offText = classNames({
    [styles.offText]: true,
    [styles.off]: !value,
  });

  return (
    <div className={componentClass}>
      <label htmlFor={id} className={styles.labelText}>
        {label}
      </label>
      <div className={styles.toggler}>
        <input
          id={id}
          className={styles.input}
          type="checkbox"
          onChange={onChange}
          checked={value}
        />
        <label htmlFor={id} className={styles.customToggle}>
          <div className={styles.checkedLabelWrap}>
            <span className={onText}>On</span>
            <span className={offText}>Off</span>
          </div>
          {/* <div className={toggleTextWrap}>
            
          </div> */}
        </label>
      </div>
    </div>
  );
};

export default Toggle;
