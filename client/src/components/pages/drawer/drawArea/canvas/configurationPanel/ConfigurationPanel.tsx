import CurrentColor from "./currentColor/CurrentColor";
import ColorsPalette from "./colorsPalette/ColorPalette";
import Tickness from "./thickness/Thickness";
import Undo from "./undo/Undo";
import Clear from "./clear/Clear";
import Brush from "./brush/Brush";
import Eraser from "./eraser/Eraser";
import { ToolTypes } from "@/constants/enums";

import styles from "./styles.module.css";

type PropsType = {
  setThickness: () => void;
  color: string;
  setColor: (hex: string) => void;
  tool: ToolTypes;
  setTool: (nextTool: ToolTypes) => void;
  handleUndo: () => void;
  handleClear: () => void;
};

const ConfigurationPanel: React.FC<PropsType> = ({
  setThickness,
  color,
  setColor,
  tool,
  setTool,
  handleUndo,
  handleClear,
}) => {
  return (
    <div className={styles.configurationPanelWrap}>
      <CurrentColor color={color} />
      <ColorsPalette changeColor={setColor} />
      <Tickness changeThickness={setThickness} />
      <Brush tool={tool} setTool={setTool} />
      <Eraser tool={tool} setTool={setTool} />
      <Undo handleUndo={handleUndo} />
      <Clear handleClear={handleClear} />
    </div>
  );
};

export default ConfigurationPanel;
