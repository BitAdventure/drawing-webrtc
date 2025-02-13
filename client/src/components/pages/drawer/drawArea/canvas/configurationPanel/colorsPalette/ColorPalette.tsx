import { colors } from "../../../../../../../constants/colors";
import styles from "./style.module.css";

type PropsType = {
  changeColor: (id: string) => void;
};

const ColorsPalette: React.FC<PropsType> = ({ changeColor }) => {
  return (
    <div className={styles.paletteWrap}>
      <ul className={styles.colorsList}>
        {colors.map((color) => (
          <li
            key={color}
            className={styles.paletteColor}
            style={{ background: color }}
            onClick={() => changeColor(color)}
          />
        ))}
      </ul>
      <p className={styles.paletteText}>Color Palette</p>
    </div>
  );
};

export default ColorsPalette;
