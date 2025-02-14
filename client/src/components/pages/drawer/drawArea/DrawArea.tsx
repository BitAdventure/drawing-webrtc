import { useCallback, useEffect, useRef, useState } from "react";
import { RoundType, ToolType } from "../Drawer";
import { Layer, Line, Stage } from "react-konva";
import ConfigurationPanel from "./canvas/configurationPanel/ConfigurationPanel";
import { colors } from "../../../../constants/colors";
import { v4 as uuidv4 } from "uuid";
import useThrottle from "../../../../hooks/useThrottle";
import { RoundStatuses } from "../../../../constants/enums";
import Results from "./results/Results";
import WordChoiceWaiting from "./wordChoiceWaiting/WordChoiceWaiting";

import styles from "./../style.module.css";

const thicknessList = [10, 20, 40];

type PropsType = {
  broadcast: (data: string) => void;
  handleStartGame: () => void;
  isDrawer: boolean;
  roundInfo: RoundType;
};

const TestDrawArea: React.FC<PropsType> = ({
  handleStartGame,
  broadcast,
  isDrawer,
  roundInfo,
}) => {
  const [tool, setTool] = useState<ToolType>("pen");
  const [lines, setLines] = useState<Array<any>>(roundInfo.lines);
  const [currColor, setCurrColor] = useState<string>(colors[13]);
  const [thickness, setThickness] = useState<number>(0);
  const isDrawing = useRef(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const drawAreaRef = useRef<HTMLDivElement>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const resizeTimerRef = useRef<number>(0);

  const handleUpdateLines = useCallback(() => {
    isDrawer &&
      broadcast(
        JSON.stringify({
          event: "lines",
          data: lines,
        })
      );
  }, [lines, broadcast, isDrawer]);

  useThrottle(lines, handleUpdateLines, 1200);

  useEffect(() => {
    if (
      !isDrawing.current &&
      (!isDrawer || roundInfo.status === RoundStatuses.UPCOMING)
    )
      setLines([...roundInfo.lines]); // prevent canvas lines updating for drawer
  }, [isDrawer, roundInfo.status, roundInfo.lines]);

  const handleMouseDown = useCallback(
    (e: any) => {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      setLines((prev) => [
        ...prev,
        {
          id: uuidv4(),
          tool,
          points: [pos.x, pos.y],
          color: currColor,
          thickness: thicknessList[thickness],
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [currColor, thickness, tool]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      const cursorPosition = e.target.getStage().getPointerPosition();

      const cursor = cursorRef.current;
      if (cursor) {
        cursor.style.left = `${cursorPosition.x}px`;
        cursor.style.top = `${cursorPosition.y}px`;
      }

      // no drawing - skipping
      if (!isDrawing.current) {
        return;
      }
      const stage = e.target.getStage();
      const point = stage.getPointerPosition();

      const updatedLines = [...lines];
      const lastLine = updatedLines[updatedLines.length - 1];
      // add point
      lastLine.points = [...lastLine.points, point.x, point.y];
      updatedLines.splice(updatedLines.length - 1, 1, lastLine);
      setLines(updatedLines.concat());
    },
    [lines]
  );

  const handleMouseUp = useCallback(() => {
    isDrawing.current = false;
  }, []);

  const handleChangeTickness = useCallback(
    () => setThickness((prev) => (prev + 1) % 3),
    [setThickness]
  );
  const handleChangeColor = useCallback(
    (hex: string) => setCurrColor(hex),
    [setCurrColor]
  );

  const handleUndoAction = useCallback(
    () => setLines((prev) => prev.slice(0, prev.length - 1)),
    [setLines]
  );
  const handleClear = useCallback(() => setLines([]), []);

  const handleResize = useCallback(() => {
    if (drawAreaRef.current) {
      clearTimeout(resizeTimerRef.current || 0);
      const { clientWidth: drawAreaWidth, clientHeight: drawAreaHeight } =
        drawAreaRef.current;
      resizeTimerRef.current = setTimeout(() => {
        // updates for drawers here
        setCanvasWidth(drawAreaWidth);
        setCanvasHeight(drawAreaHeight);
      }, 300);
    }
  }, []);

  useEffect(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className={styles.drawAreaWrap} ref={drawAreaRef}>
      {roundInfo.status === RoundStatuses.SHOW_RESULT ||
      roundInfo.status === RoundStatuses.COMPLETED ? (
        <Results roundInfo={roundInfo} />
      ) : (
        !roundInfo.word && (
          <WordChoiceWaiting
            isDrawer={isDrawer}
            roundInfo={roundInfo}
            handleStartGame={handleStartGame}
          />
        )
      )}
      <div
        className={styles.canvasWrap}
        onMouseOut={isDrawer ? handleMouseUp : undefined}
      >
        {isDrawer && (
          <div
            ref={cursorRef}
            style={{
              border: ".0625rem solid #000",
              width: thicknessList[thickness],
              aspectRatio: "1 / 1",
              background: tool === "pen" ? currColor : "#fff",
              zIndex: 4,
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              pointerEvents: "none",
              transition:
                "width .1s ease-in-out, height .1s ease-in-out, background .1s ease-in-out",
            }}
          />
        )}
        <Stage
          style={{ cursor: isDrawer ? "none" : "default" }}
          // width={500}
          // height={300}
          width={canvasWidth}
          height={canvasHeight}
          // scaleX={canvasScale}
          // scaleY={canvasScale}
          onMouseDown={isDrawer ? handleMouseDown : undefined}
          onMousemove={isDrawer ? handleMouseMove : undefined}
          onMouseup={isDrawer ? handleMouseUp : undefined}
        >
          <Layer>
            {lines.map((line, i) => (
              <Line
                key={i}
                points={line.points}
                stroke={line.color}
                strokeWidth={line.thickness}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={
                  line.tool === "eraser" ? "destination-out" : "source-over"
                }
              />
            ))}
          </Layer>
        </Stage>
      </div>
      {isDrawer && (
        <ConfigurationPanel
          setThickness={handleChangeTickness}
          color={currColor}
          setColor={handleChangeColor}
          tool={tool}
          setTool={setTool}
          handleUndo={handleUndoAction}
          handleClear={handleClear}
        />
      )}
    </div>
  );
};

export default TestDrawArea;
