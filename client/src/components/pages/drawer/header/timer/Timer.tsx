import { useCallback, useEffect, useMemo, useState } from "react";
import classNames from "classnames";
import { RoundType } from "@/constants/types";

import TimerIcon from "@/assets/icons/timer-icon.svg?react";

import styles from "./style.module.css";

type PropsType = {
  drawTime: number;
  isDrawer: boolean;
  roundInfo: RoundType;
};

const Timer: React.FC<PropsType> = ({ drawTime, isDrawer, roundInfo }) => {
  const [timerId, setTimerId] = useState(0);

  const getTimeRemaining = useCallback(() => {
    if (!roundInfo.startTime) {
      return drawTime;
    }
    return Math.ceil(
      (roundInfo.startTime + drawTime * 1000 - new Date().getTime()) / 1000
    );
  }, [drawTime, roundInfo.startTime]);

  const [timeRemaining, setTimeRemaining] = useState<number>(
    getTimeRemaining() > 0 ? getTimeRemaining() : 0
  );

  useEffect(() => {
    if (roundInfo.startTime) {
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
  }, [roundInfo.startTime, getTimeRemaining]);

  useEffect(() => {
    if (timerId && timeRemaining < 1) clearInterval(timerId);
  }, [timerId, timeRemaining, isDrawer, roundInfo.status]);

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
