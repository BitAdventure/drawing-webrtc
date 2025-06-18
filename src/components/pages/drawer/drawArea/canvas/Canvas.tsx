import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Stage, Layer, Line } from "react-konva";
import ConfigurationPanel from "./configurationPanel/ConfigurationPanel";
import { v4 as uuidv4 } from "uuid";
import { colors } from "@/constants/colors";
import { RoundStatuses } from "@/constants/enums";
import useThrottle from "@/hooks/useThrottle";
import { LineType, RoundType } from "@/constants/types";

import styles from "./../style.module.css";

export type ToolType = "pen" | "eraser";

type PropsType = {
  currentRound: RoundType;
  isDrawer: boolean;
  width: number;
  height: number;
  scaleCoef: number;
  broadcast: (data: { roundId: string; lines: Array<LineType> }) => void;
};

const thicknessList = [10, 20, 40];

const Canvas: React.FC<PropsType> = ({
  currentRound,
  isDrawer,
  width,
  height,
  scaleCoef,
  broadcast,
}) => {
  const [tool, setTool] = useState<ToolType>("pen");
  const [lines, setLines] = useState<Array<LineType>>([...currentRound.lines]);
  const [currColor, setCurrColor] = useState<string>(colors[13]);
  const [thickness, setThickness] = useState<number>(0);
  const isDrawing = useRef(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const canvasScale = useMemo(
    () => (isDrawer ? 1 : scaleCoef),
    [isDrawer, scaleCoef]
  );

  const handleUpdateLines = useCallback(() => {
    isDrawer &&
      broadcast({
        roundId: currentRound.id,
        lines,
      });
  }, [lines, broadcast, isDrawer, currentRound.id]);

  useThrottle(lines, handleUpdateLines, 1200);

  useEffect(() => {
    if (
      !isDrawing.current &&
      (!isDrawer || currentRound.status === RoundStatuses.UPCOMING)
    )
      setLines([...currentRound.lines]); // prevent canvas lines updating for drawer
  }, [isDrawer, currentRound.status, currentRound.lines]);

  useEffect(() => {
    isDrawer && currentRound.id && setLines([...currentRound.lines]); // for case if player disconnect and recconnect on next round where he is drawer (because for drawer lines doesnt update in useeffect above)
    // eslint-disable-next-line
  }, [currentRound.id, isDrawer]);

  const handleMouseDown = useCallback(
    (e: any) => {
      isDrawing.current = true;
      const pos = e.target.getStage().getPointerPosition();
      setLines((prev) => [
        ...prev,
        {
          id: uuidv4(),
          roundId: currentRound.id,
          tool,
          points: [pos.x, pos.y],
          color: currColor,
          thickness: thicknessList[thickness],
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [currColor, thickness, tool, currentRound]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      const cursorPosition = e.target.getStage().getPointerPosition();

      const cursor = cursorRef.current;
      if (cursor) {
        cursorRef.current.style.left = `${cursorPosition.x}px`;
        cursorRef.current.style.top = `${cursorPosition.y}px`;
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

  const hotKeyHandler = useCallback(
    (e: KeyboardEvent) => {
      if (document.activeElement?.tagName !== "INPUT") {
        // PREVENT HOT KEY HANDLER IF SOME INPUT IN FOCUS
        switch (e.code) {
          case "KeyT":
            setThickness((prev) => (prev + 1) % 3);
            break;
          case "KeyB":
            setTool("pen");
            break;
          case "KeyE":
            setTool("eraser");
            break;
          case "KeyU":
            handleUndoAction();
            break;
          case "KeyC":
            handleClear();
            break;
        }
      }
    },
    [handleClear, handleUndoAction]
  );

  useEffect(() => {
    if (isDrawer) {
      window.addEventListener("keydown", hotKeyHandler);

      return () => {
        window.removeEventListener("keydown", hotKeyHandler);
      };
    }
  }, [isDrawer, hotKeyHandler]);

  return (
    <>
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
          width={width}
          height={height}
          scaleX={canvasScale}
          scaleY={canvasScale}
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
    </>
  );
};

export default Canvas;
