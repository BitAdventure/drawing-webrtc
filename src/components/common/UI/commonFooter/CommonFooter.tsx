import { useCallback, useMemo, useState } from "react";
import Button from "../button/Button";
import classNames from "classnames";
import useMountTransition from "@/hooks/useMountTransition";
import { createPortal } from "react-dom";
import Settings from "@/components/popups/settings/Settings";
import { useSelector } from "@/hooks/useSelector";

import styles from "./style.module.css";

type PropsType = {
  btnText: string;
  onClickHandler: (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent
  ) => void;
  animated?: boolean;
};

const CommonFooter: React.FC<PropsType> = ({
  onClickHandler,
  btnText,
  animated = false,
}) => {
  const gameSettings = useSelector(
    (store) => store.game.eventInfo?.gameInformation
  );
  const [isOpenSettings, setIsOpenSettings] = useState(false);
  const hasSettingsTransitionedIn = useMountTransition(isOpenSettings, 300);

  const handleToggleSettings = useCallback(
    () => setIsOpenSettings((prev) => !prev),
    []
  );

  const footerClass = useMemo(
    () =>
      classNames({
        [styles.footer]: true,
        [styles.animated]: animated,
      }),
    [animated]
  );

  return (
    <>
      <div className={footerClass}>
        <div className={styles.footerContent}>
          <div className={styles.footerBtnWrap}>
            <Button btnText={btnText} onClickHandler={onClickHandler} submit />
          </div>
        </div>
      </div>
      {(isOpenSettings || hasSettingsTransitionedIn) &&
        gameSettings &&
        createPortal(
          <Settings
            open={isOpenSettings}
            hasTransitionedIn={hasSettingsTransitionedIn}
            onClose={handleToggleSettings}
            settingsData={gameSettings}
          />,
          document.body
        )}
    </>
  );
};

export default CommonFooter;
