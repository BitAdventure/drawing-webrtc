import MinusIcon from "@/assets/icons/minus.svg?react";
import PlusIcon from "@/assets/icons/plus.svg?react";
import { useCallback } from "react";

import styles from "./style.module.css";

const minValue = 1;

type PropsType = {
  label: string;
  name: string;
  value: number;
  onChange: (e: any) => void;
  maxValue?: number;
};

const IncrementTextField: React.FC<PropsType> = ({
  label,
  name,
  value,
  onChange,
  maxValue = 999,
}) => {
  const handleDecrement = useCallback(() => {
    if (value > minValue) {
      onChange(value - 1);
    }
  }, [value, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < maxValue) {
      onChange(value + 1);
    }
  }, [value, onChange, maxValue]);

  const handleChangeMultiplier = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      if (
        (+newValue && +newValue <= maxValue && +newValue >= minValue) ||
        newValue === ""
      ) {
        onChange(+newValue);
      } else if (+newValue && +newValue > maxValue) {
        onChange(maxValue);
      }
    },
    [onChange, maxValue]
  );

  const handleBlurMultiplier = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      !+newValue && onChange(minValue);
    },
    [onChange]
  );

  return (
    <div className={styles.componentWrap}>
      <label htmlFor={name} className={styles.label}>
        {label}
      </label>
      <div className={styles.fieldWrap}>
        <button
          onClick={handleDecrement}
          type={"button"}
          className={styles.decrementBtn}
        >
          <MinusIcon />
        </button>
        <input
          value={value}
          onChange={handleChangeMultiplier}
          onBlur={handleBlurMultiplier}
          className={styles.valueContainer}
        />
        <button
          onClick={handleIncrement}
          type={"button"}
          className={styles.incrementBtn}
        >
          <PlusIcon />
        </button>
      </div>
    </div>
  );
};

export default IncrementTextField;
