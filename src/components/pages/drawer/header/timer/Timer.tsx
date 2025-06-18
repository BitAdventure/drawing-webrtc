import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { useSelector } from "@/hooks/useSelector";
import { RoundType } from "@/constants/types";
import TimerIcon from "@/assets/icons/timer-icon.svg?react";

import styles from "./style.module.css";

type PropsType = {
  startTime: number | null;
  drawTime: number;
  isDrawer: boolean;
  roundInfo: RoundType;
};

const Timer: React.FC<PropsType> = ({
  startTime,
  drawTime,
  isDrawer,
  roundInfo,
}) => {
  const [timerId, setTimerId] = useState(0);
  const isAllPlayersGuessTheWord = useSelector(
    (state) => state.game.isAllPlayersGuessTheWord
  );

  const getTimeRemaining = useCallback(() => {
    if (!startTime) {
      return drawTime;
    }
    return Math.ceil(
      (startTime + drawTime * 1000 - new Date().getTime()) / 1000
    );
  }, [drawTime, startTime]);

  const [timeRemaining, setTimeRemaining] = useState<number>(
    getTimeRemaining() > 0 ? getTimeRemaining() : 0
  );

  useEffect(() => {
    if (startTime) {
      setTimerId(
        window.setInterval(() => {
          const timeRemaining = getTimeRemaining();
          setTimeRemaining(timeRemaining > 0 ? timeRemaining : 0);
        }, 1000)
      );
    } else {
      const currTimeRemaining = getTimeRemaining();
      setTimeRemaining(currTimeRemaining > 0 ? currTimeRemaining : 0);
    }
  }, [startTime, getTimeRemaining]);

  useEffect(() => {
    timerId &&
      (timeRemaining < 1 || isAllPlayersGuessTheWord) &&
      clearInterval(timerId);
  }, [
    timerId,
    isAllPlayersGuessTheWord,
    timeRemaining,
    isDrawer,
    roundInfo.status,
  ]);

  const timerClass = useMemo(
    () =>
      classNames({
        [styles.timer]: true,
        [styles.yellow]: timeRemaining <= 25 && timeRemaining > 10,
        [styles.red]: timeRemaining <= 10,
      }),
    [timeRemaining]
  );

  return (
    <div className={timerClass}>
      <TimerIcon />
      <span>{timeRemaining}</span>
    </div>
  );
};

export default Timer;
