import { DrawingType } from "@/constants/types";
import styles from "./style.module.css";
import { useMemo } from "react";
import { Config } from "@/services/config";
import { STORAGE_URL } from "@/services/requestURLs";

type PropsType = {
  drawing: DrawingType;
};

const Drawing: React.FC<PropsType> = ({ drawing }) => {
  const download = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const id = e.currentTarget.id;
    fetch(e.currentTarget.href, {
      method: "GET",
      headers: {},
    }).then((response) => {
      response.arrayBuffer().then((buffer) => {
        const url = window.URL.createObjectURL(new Blob([buffer]));
        var a = document.createElement("a");
        a.href = url;
        a.download = (id || "image") + ".webp";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    });
  };

  const drawingSrc = useMemo(
    () => `${Config.API_BASE_URL}${STORAGE_URL}/${drawing.id}`,
    [drawing.id]
  );

  return (
    <li className={styles.drawingWrap}>
      <div className={styles.drawingImageWrap}>
        <img
          src={drawingSrc}
          alt={drawing.name}
          className={styles.drawingImage}
        />
        <a
          href={drawingSrc}
          download
          onClick={download}
          target="_blank"
          id={drawing.name}
          className={styles.downloadLink}
        >
          <p>Download</p>
        </a>
      </div>
      <p className={styles.drawingName}>{drawing.name}</p>
    </li>
  );
};

export default Drawing;
