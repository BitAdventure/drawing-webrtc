import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { RoundType } from "@/constants/types";
import { useSelector } from "@/hooks/useSelector";

import TimerIcon from "@/assets/icons/timer-icon.svg?react";

import styles from "./style.module.css";

type PropsType = {
  drawTime: number;
  isDrawer: boolean;
  roundInfo: RoundType;
};

const Timer: React.FC<PropsType> = ({ drawTime, isDrawer, roundInfo }) => {
  const [timerId, setTimerId] = useState(0);
  const isAllPlayersGuessTheWord = useSelector((state) => state.game.isAllPlayersGuessTheWord);

  const getTimeRemaining = useCallback(
    () =>
      !roundInfo.startTime
        ? drawTime
        : Math.ceil((new Date(roundInfo.startTime + drawTime * 1000).getTime() - new Date().getTime()) / 1000),
    [drawTime, roundInfo.startTime]
  );

  const [timeRemaining, setTimeRemaining] = useState(() => {
    const currTimeRemaining = getTimeRemaining();
    return currTimeRemaining > 0 ? currTimeRemaining : 0;
  });

  useEffect(() => {
    if (roundInfo.startTime) {
      setTimerId(
        setInterval(() => {
          const timeRemaining = getTimeRemaining();
          setTimeRemaining(timeRemaining > 0 ? timeRemaining : 0);
        }, 1000)
      );
    } else {
      const currTimeRemaining = getTimeRemaining();
      setTimeRemaining(currTimeRemaining > 0 ? currTimeRemaining : 0);
    }
  }, [roundInfo.startTime, getTimeRemaining]);

  useEffect(() => {
    timerId && (timeRemaining < 1 || isAllPlayersGuessTheWord) && clearInterval(timerId);
  }, [timerId, isAllPlayersGuessTheWord, timeRemaining, isDrawer, roundInfo.status]);

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
