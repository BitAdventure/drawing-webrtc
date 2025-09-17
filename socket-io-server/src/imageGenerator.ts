import Konva from "konva";
import { Canvas, loadImage } from "@napi-rs/canvas";
import { Line } from "./types.js";
import FormData from "form-data";
import path from "path";
import { createDrawing, uploadDrawing } from "api.js";

// Configure Konva for Node.js environment
Konva.Util.createCanvasElement = () => {
  const node = new Canvas(1, 1) as any;
  node.style = {};
  return node;
};

Konva.Util.createImageElement = () => {
  const node = {
    width: 0,
    height: 0,
    src: "",
    onload: null,
    onerror: null,
  } as any;
  return node;
};

const BACKGROUND_IMAGE_PATH = path.join(
  process.cwd(),
  "src",
  "assets",
  "draw-area-bg.png"
);

export class ImageGenerator {
  static async generateImageFromLines({
    canvas,
    lines,
    width,
    height,
  }: {
    canvas: any;
    lines: Array<Line>;
    width: number;
    height: number;
  }): Promise<Buffer> {
    const stage = new Konva.Stage({
      width,
      height,
      container: canvas as any,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Draw all lines
    lines.forEach((line) => {
      if (!line.points || line.points.length < 4) {
        return;
      }

      const konvaLine = new Konva.Line({
        points: line.points,
        stroke: line.color,
        strokeWidth: line.thickness,
        tension: 0.5,
        lineCap: "round",
        lineJoin: "round",
        globalCompositeOperation:
          line.tool === "eraser" ? "destination-out" : "source-over",
        // listening: false,
      });

      layer.add(konvaLine);
    });

    try {
      layer.draw();
      const nodeCanvas = stage.toCanvas() as any;
      return nodeCanvas.encode("webp", 95);
    } catch (error) {
      console.error("Error drawing layer:", error);
      throw error;
    } finally {
      stage.destroy();
    }
  }

  static async generateAndSaveImage(
    {
      lines,
      playerId,
      teamId,
      roundIndex,
    }: {
      lines: Array<Line>;
      playerId: string;
      teamId: string;
      roundIndex: number;
    },
    width: number,
    height: number,
    fileName: string
  ): Promise<void> {
    const canvas = new Canvas(width, height);
    const ctx = canvas.getContext("2d");

    try {
      console.log("Generating image with background");

      const bgImage = await loadImage(BACKGROUND_IMAGE_PATH);

      ctx.drawImage(bgImage, 0, 0, width, height);
    } catch (error) {
      console.error("Error with file path approach, trying white bg:", error);

      // Final fallback: white background only
      try {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
      } catch (finalError) {
        console.error("All approaches failed:", finalError);
        throw new Error("Failed to generate image with any approach");
      }
    }

    const linesImageBuffer = await this.generateImageFromLines({
      canvas,
      lines,
      width,
      height,
    });

    const linesImage = await loadImage(linesImageBuffer);

    ctx.drawImage(linesImage, 0, 0, width, height);

    const imageBuffer = await canvas.encode("webp", 95);

    // Upload to Hasura Storage
    const fileId = await this.uploadToHasuraStorage(imageBuffer, fileName);
    console.log(`FILE ID (WITH PATH): ${fileId}`);

    await createDrawing({
      fileId,
      playerId,
      roundIndex,
      teamId,
    });
  }

  private static async uploadToHasuraStorage(
    buffer: Buffer,
    filename: string
  ): Promise<string> {
    try {
      const formData = new FormData();
      formData.append("file", buffer, {
        filename,
        contentType: "image/webp",
      });

      const fileId = await uploadDrawing(formData);

      return fileId;
    } catch (error) {
      console.error("Hasura Storage upload failed:", error);
      throw error;
    }
  }
}
