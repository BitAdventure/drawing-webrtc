import { useCallback, useMemo } from "react";
import EraserIcon from "@/assets/draw/eraser-icon.svg?react";
import classNames from "classnames";
import { ToolTypes } from "@/constants/enums";

import styles from "./style.module.css";

type PropsType = {
  tool: ToolTypes;
  setTool: (newTool: ToolTypes) => void;
};

const Eraser: React.FC<PropsType> = ({ tool, setTool }) => {
  const handleUpdateTool = useCallback(
    () => setTool(ToolTypes.ERASER),
    [setTool]
  );

  const eraserAreaClass = useMemo(
    () =>
      classNames({
        [styles.eraserArea]: true,
        [styles.active]: tool === ToolTypes.ERASER,
      }),
    [tool]
  );

  return (
    <div className={styles.eraserWrap} onClick={handleUpdateTool}>
      <div className={eraserAreaClass}>
        <EraserIcon />
        <span>E</span>
      </div>
      <div className={styles.eraserText}>Eraser</div>
    </div>
  );
};

export default Eraser;
