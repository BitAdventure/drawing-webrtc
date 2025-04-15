import LikeIcon from "@/assets/icons/like-icon.svg?react";
import DislikeIcon from "@/assets/icons/dislike-icon.svg?react";
import { MessageType, RoundType } from "@/constants/types";

import styles from "./style.module.css";

type PropsType = {
  message: MessageType;
  currentRound: RoundType;
};

const Message: React.FC<PropsType> = ({ message, currentRound }) => {
  return (
    <li className={styles.messageWrap}>
      {message.text.toLowerCase().trim() ===
      currentRound.word?.label.toLowerCase().trim() ? (
        <p
          className={styles.correctAnswerMessage}
        >{`${message.player.name} guessed the word!`}</p>
      ) : (
        <>
          <div className={styles.leftSideGroup}>
            <p className={styles.playerName}>{message.player.name}</p>
            <p className={styles.messageText}>{message.text}</p>
          </div>
          {message.type !== "DEFAULT" && (
            <div className={styles.iconWrap}>
              {message.type === "LIKE" ? <LikeIcon /> : <DislikeIcon />}
            </div>
          )}
        </>
      )}
    </li>
  );
};

export default Message;
