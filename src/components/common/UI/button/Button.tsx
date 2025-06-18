import classNames from "classnames";
import { useMemo } from "react";

import styles from "./style.module.css";

export type BtnType = "button" | "submit" | "reset";

type PropsType = {
  btnText: string;
  onClickHandler: (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent
  ) => void;
  type?: BtnType;
  disabled?: boolean;
  submit?: boolean;
  isCopyLink?: boolean;
  isReject?: boolean;
};

const Button: React.FC<PropsType> = ({
  btnText,
  onClickHandler,
  submit = false,
  type = "button",
  disabled = false,
  isCopyLink = false,
  isReject,
}) => {
  const btnClass = useMemo(
    () =>
      classNames({
        [styles.btn]: true,
        [styles.submit]: submit,
        [styles.copy]: isCopyLink,
        [styles.reject]: isReject,
      }),
    [submit, isCopyLink, isReject]
  );

  return (
    <button
      type={type}
      onClick={onClickHandler}
      className={btnClass}
      disabled={disabled}
    >
      {btnText}
    </button>
  );
};

export default Button;
