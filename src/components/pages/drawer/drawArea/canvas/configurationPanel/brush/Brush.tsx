import { useCallback, useMemo } from "react";
import BrushIcon from "./../../../../../../../assets/draw/brush-icon.svg?react";
import classNames from "classnames";
import { ToolType } from "../../../../Drawer";

import styles from "./style.module.css";

type PropsType = {
  tool: ToolType;
  setTool: (newTool: ToolType) => void;
};

const Brush: React.FC<PropsType> = ({ tool, setTool }) => {
  const handleUpdateTool = useCallback(() => setTool("pen"), [setTool]);

  const brushAreaClass = useMemo(
    () =>
      classNames({
        [styles.brushArea]: true,
        [styles.active]: tool === "pen",
      }),
    [tool]
  );

  return (
    <div className={styles.brushWrap} onClick={handleUpdateTool}>
      <div className={brushAreaClass}>
        <BrushIcon />
        <span>B</span>
      </div>
      <div className={styles.brushText}>Brush</div>
    </div>
  );
};

export default Brush;
