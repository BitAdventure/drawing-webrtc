import { useCallback, useMemo, useState } from "react";
import settingsIcon from "@/assets/icons/settings-icon.png";
import classNames from "classnames";
import useMountTransition from "@/hooks/useMountTransition";
import { createPortal } from "react-dom";
import Settings from "@/components/popups/settings/Settings";
import { useSelector } from "@/hooks/useSelector";
import Button from "@/components/common/UI/button/Button";

import styles from "./style.module.css";

type PropsType = {
  btnText: string;
  onClickHandler: (
    e: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent
  ) => void;
  animated?: boolean;
  isLeadPlayer: boolean;
  leadPlayerName: string;
};

const Footer: React.FC<PropsType> = ({
  onClickHandler,
  btnText,
  animated = false,
  isLeadPlayer = false,
  leadPlayerName,
}) => {
  const gameSettings = useSelector(
    (store) => store.game.eventInfo?.gameInformation
  );
  const [isOpenSettings, setIsOpenSettings] = useState(false);
  const hasSettingsTransitionedIn = useMountTransition(isOpenSettings, 300);

  const handleToggleSettings = useCallback(
    () => setIsOpenSettings((prev) => !prev),
    [setIsOpenSettings]
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
          {isLeadPlayer ? (
            <>
              <button
                className={styles.settingsBtn}
                onClick={handleToggleSettings}
              >
                <img src={settingsIcon} alt="settings btn" />
              </button>
              <div className={styles.footerBtnWrap}>
                <Button
                  btnText={btnText}
                  onClickHandler={onClickHandler}
                  submit
                />
              </div>
            </>
          ) : (
            <p
              className={styles.waitingText}
            >{`Waiting for ${leadPlayerName} to start the game...`}</p>
          )}
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

export default Footer;
