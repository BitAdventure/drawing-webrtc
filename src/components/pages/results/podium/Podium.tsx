import Winner from "./winner/Winner";
import { PlayerResultType } from "@/constants/types";
import { useMemo } from "react";
import classNames from "classnames";

import styles from "./style.module.css";

type PropsType = {
  winners: Array<PlayerResultType>;
};

const Podium: React.FC<PropsType> = ({ winners }) => {
  const orderedWinners = useMemo(() => {
    const orderWinners = [...winners];

    // change 1-2 places for podium correct order
    orderWinners.splice(0, 2, ...winners.slice(0, 2).reverse());

    return orderWinners;
  }, [winners]);

  const placesContainerClass = useMemo(
    () =>
      classNames({
        [styles.placesWrap]: true,
        [styles.isOneElement]: winners.length === 1,
      }),
    [winners.length]
  );

  return (
    <div className={styles.podiumWrap}>
      <ul className={placesContainerClass}>
        {orderedWinners.map((player) => (
          <Winner key={player.id} player={player} />
        ))}
      </ul>
    </div>
  );
};

export default Podium;
