import CommonFooter from "@/components/common/UI/commonFooter/CommonFooter";

import styles from "./style.module.css";
import { useSelector } from "@/hooks/useSelector";
import Drawing from "./drawing/Drawing";

type PropsType = {
  onSkipArtwork: () => void;
};

const Artwork: React.FC<PropsType> = ({ onSkipArtwork }) => {
  const drawings = useSelector((state) => state.game.drawings);

  return (
    <>
      <div className={styles.resultsHeader}>Download Your Artwork</div>
      <div className={styles.contentWrap}>
        <ul className={styles.drawingsContentWrap}>
          {drawings.map((drawing) => (
            <Drawing key={drawing.id} drawing={drawing} />
          ))}
        </ul>
      </div>
      <CommonFooter onClickHandler={onSkipArtwork} btnText={"Next"} />
    </>
  );
};

export default Artwork;
