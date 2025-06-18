import { forwardRef, useMemo } from "react";
import filledStarIcon from "@/assets/icons/filled-star-icon.svg";
import emptyStarIcon from "@/assets/icons/empty-star-icon.svg";
import { FieldError, RefCallBack } from "react-hook-form";

import styles from "./style.module.css";

type PropsType = {
  label: string;
  value: number;
  onChange: (newValue: number) => void;
  error?: FieldError | undefined;
  ref?: RefCallBack;
};

export type Ref = HTMLUListElement;

const RatingField = forwardRef<Ref, PropsType>(
  ({ label, value, onChange }, ref) => {
    const starsList = useMemo(() => {
      return new Array(5).fill(null).map((_, index: number) => {
        const iconSrc = value > index ? filledStarIcon : emptyStarIcon;
        const handleChangeRating = () =>
          value !== index + 1 && onChange(index + 1);
        return (
          <img
            src={iconSrc}
            key={index}
            onClick={handleChangeRating}
            className={styles.star}
          />
        );
      });
    }, [value, onChange]);

    return (
      <div className={styles.fieldWrap}>
        <label className={styles.label}>{label}</label>
        <ul className={styles.starsWrap} ref={ref}>
          {starsList}
        </ul>
      </div>
    );
  }
);

export default RatingField;
