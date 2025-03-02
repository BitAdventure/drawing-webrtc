import { useCallback, useMemo } from "react";
import BrushIcon from "@/assets/draw/brush-icon.svg?react";
import classNames from "classnames";
import { ToolTypes } from "@/constants/enums";

import styles from "./style.module.css";

type PropsType = {
  tool: ToolTypes;
  setTool: (newTool: ToolTypes) => void;
};

const Brush: React.FC<PropsType> = ({ tool, setTool }) => {
  const handleUpdateTool = useCallback(() => setTool(ToolTypes.PEN), [setTool]);

  const brushAreaClass = useMemo(
    () =>
      classNames({
        [styles.brushArea]: true,
        [styles.active]: tool === ToolTypes.PEN,
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
