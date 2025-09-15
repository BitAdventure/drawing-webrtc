import classNames from "classnames";
import { useMemo } from "react";

import styles from "./style.module.css";

type PropsType = {
  id: string;
  label: string;
  onChange: (e: any) => void;
  value: boolean;
  isDisabled?: boolean;
  labels?: [string, string];
};

const Toggle: React.FC<PropsType> = ({
  id,
  label,
  onChange,
  value,
  isDisabled = false,
  labels = ["On", "Off"],
}) => {
  const { onText, offText } = useMemo(
    () => ({
      onText: classNames({
        [styles.onText]: true,
        [styles.on]: value,
      }),
      offText: classNames({
        [styles.offText]: true,
        [styles.off]: !value,
      }),
    }),
    [value]
  );

  return (
    <div className={styles.toggleWrap} data-disabled={isDisabled}>
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
            <span className={onText}>{labels[0]}</span>
            <span className={offText}>{labels[1]}</span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default Toggle;
