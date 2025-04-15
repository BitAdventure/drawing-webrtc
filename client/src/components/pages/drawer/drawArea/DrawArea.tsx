import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { RoundStatuses, TextMessages } from "@/constants/enums";
import Results from "./results/Results";
import WordChoiceWaiting from "./wordChoiceWaiting/WordChoiceWaiting";
import { AnswerResultType, MessageType, RoundType, WordType } from "@/constants/types";
import CorrectAnswerIcon from "@/assets/draw/correct-answer.svg?react";
import WrongAnswerIcon from "@/assets/draw/wrong-answer.svg?react";
import { FieldValues } from "react-hook-form";
import RateDrawer from "./rateDrawer/RateDrawer";
import { useSelector } from "@/hooks/useSelector";
import Canvas from "./canvas/Canvas";
import { useParams } from "react-router-dom";
import { Config } from "@/services/config";

import styles from "./style.module.css";

type PropsType = {
  roundInfo: RoundType;
  isDrawer: boolean;
  showAnswerResult: AnswerResultType;
  currentUser: FieldValues;
  broadcast: (data: string) => void;
  handleSelectWord: (word: WordType) => void;
  createMessage: (message: MessageType) => void;
};

const DrawArea: React.FC<PropsType> = ({
  roundInfo,
  isDrawer,
  showAnswerResult,
  currentUser,
  broadcast,
  handleSelectWord,
  createMessage,
}) => {
  const { id } = useParams();
  const drawAreaRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [scaleCoef, setScaleCoef] = useState(1);
  const resizeTimerRef = useRef<number>(0);
  const players = useSelector((state) => state.game.eventInfo?.team.players);
  const webRTCToken = useSelector((state) => state.auth.webRTCToken);

  // some calculations for guesser on canvas resize
  const updateGuesserCanvasSize = useCallback(
    ({
      drawAreaDefaultWidth,
      drawAreaDefaultHeight,
      drawerAreaWidth,
      drawerAreaHeight,
    }: {
      drawAreaDefaultWidth: number;
      drawAreaDefaultHeight: number;
      drawerAreaWidth: number;
      drawerAreaHeight: number;
    }) => {
      const drawerDrawAreaAspectRatio = drawerAreaWidth && drawerAreaHeight ? drawerAreaWidth / drawerAreaHeight : 1;
      const currentUserDrawAreaAspectRatio = drawAreaDefaultWidth / drawAreaDefaultHeight;
      const ratioCoef = Math.floor(drawerDrawAreaAspectRatio / currentUserDrawAreaAspectRatio);
      if (ratioCoef) {
        setCanvasWidth(drawAreaDefaultWidth);
        setCanvasHeight(drawAreaDefaultWidth / drawerDrawAreaAspectRatio);
        setScaleCoef(drawerAreaWidth ? drawAreaDefaultWidth / drawerAreaWidth : 1);
      } else {
        setCanvasHeight(drawAreaDefaultHeight);
        setCanvasWidth(drawAreaDefaultHeight * drawerDrawAreaAspectRatio);
        setScaleCoef(drawerAreaHeight ? drawAreaDefaultHeight / drawerAreaHeight : 1);
      }
    },
    []
  );

  const handleResize = useCallback(() => {
    if (drawAreaRef.current) {
      clearTimeout(resizeTimerRef.current || 0);
      const { clientWidth: drawAreaWidth, clientHeight: drawAreaHeight } = drawAreaRef.current;

      resizeTimerRef.current = window.setTimeout(async () => {
        // updates for drawers here
        if (isDrawer) {
          setCanvasWidth(drawAreaWidth);
          setCanvasHeight(drawAreaHeight);

          // return socket.emit("update-drawarea", {
          //   roundId: roundInfo.id,
          //   drawAreaSize: `${drawAreaWidth}, ${drawAreaHeight}`,
          // });
          try {
            await fetch(`${Config.SERVER_URL}/updateEvent/${id}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${webRTCToken}`,
              },
              body: JSON.stringify({
                event: "update-drawarea",
                data: {
                  roundId: roundInfo?.id,
                  drawAreaSize: `${drawAreaWidth}, ${drawAreaHeight}`,
                },
              }),
            });
          } catch (error) {
            console.error("Error in start game:", error);
          }
          return;
        }

        const [drawAreaStoreWidth, drawAreaStoreHeight] = roundInfo.drawAreaSize
          .split(", ")
          .map((item: string) => +item);

        // updates for guessers here
        updateGuesserCanvasSize({
          drawAreaDefaultWidth: drawAreaWidth,
          drawAreaDefaultHeight: drawAreaHeight,
          drawerAreaWidth: drawAreaStoreWidth,
          drawerAreaHeight: drawAreaStoreHeight,
        });
      }, 300);
    }
  }, [id, isDrawer, roundInfo.id, updateGuesserCanvasSize, roundInfo.drawAreaSize, webRTCToken]);

  useEffect(() => {
    if (!isDrawer && drawAreaRef.current) {
      const { clientWidth: drawAreaDefaultWidth, clientHeight: drawAreaDefaultHeight } = drawAreaRef.current;

      const [drawAreaStoreWidth, drawAreaStoreHeight] = roundInfo.drawAreaSize.split(", ").map((item: string) => +item);
      updateGuesserCanvasSize({
        drawAreaDefaultWidth,
        drawAreaDefaultHeight,
        drawerAreaWidth: drawAreaStoreWidth,
        drawerAreaHeight: drawAreaStoreHeight,
      });
    }
    //eslint-disable-next-line
  }, [roundInfo.drawAreaSize, isDrawer]);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line
  }, [roundInfo.drawAreaSize, isDrawer, roundInfo.id]);

  const showResult = useMemo(() => {
    switch (showAnswerResult) {
      case "correct":
        return <CorrectAnswerIcon />;
      case "wrong":
        return <WrongAnswerIcon />;
      default:
        return null;
    }
  }, [showAnswerResult]);

  const handleRateDrawer = useCallback(
    (type: "LIKE" | "DISLIKE") => {
      const currentPlayerData = players?.find((player) => player.id === currentUser.metadata.playerId);
      currentPlayerData &&
        createMessage({
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          text: TextMessages[type],
          type,
          player: {
            id: currentPlayerData.id,
            name: currentPlayerData.name,
          },
          roundId: roundInfo.id,
        });
    },
    [createMessage, currentUser.metadata.playerId, roundInfo.id, players]
  );

  return (
    <div className={styles.drawAreaWrap} ref={drawAreaRef}>
      <RateDrawer isDrawer={isDrawer} handleRateDrawer={handleRateDrawer} />
      {roundInfo.status === RoundStatuses.SHOW_RESULT || roundInfo.status === RoundStatuses.COMPLETED ? (
        <Results roundInfo={roundInfo} />
      ) : !roundInfo.word ? (
        <WordChoiceWaiting isDrawer={isDrawer} roundInfo={roundInfo} handleSelectWord={handleSelectWord} />
      ) : (
        !!showAnswerResult && (
          <div className={styles.answerResultWrap}>
            {showResult}
            <p className={styles.answerResultText}>{`${showAnswerResult} guess!`}</p>
          </div>
        )
      )}
      <Canvas
        broadcast={broadcast}
        currentRound={roundInfo}
        isDrawer={isDrawer}
        width={canvasWidth}
        height={canvasHeight}
        scaleCoef={scaleCoef}
      />
    </div>
  );
};

export default DrawArea;
