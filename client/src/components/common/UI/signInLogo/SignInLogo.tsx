import { useMemo } from "react";
import classNames from "classnames";
import logo from "@/assets/sw-logo.webp";

import styles from "./style.module.css";

type PropsType = {
  animated?: boolean;
};

const SignInLogo: React.FC<PropsType> = ({ animated = false }) => {
  const logoClass = useMemo(
    () =>
      classNames({
        [styles.logoWrap]: true,
        [styles.animated]: animated,
      }),
    [animated]
  );

  return (
    <div className={logoClass}>
      <img src={logo} alt="sketch wars logo" />
    </div>
  );
};

export default SignInLogo;
