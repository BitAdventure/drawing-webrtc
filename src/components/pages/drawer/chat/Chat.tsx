import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Underline from "@/assets/draw/chat/drawer-underline.svg?react";
import { v4 as uuidv4 } from "uuid";
import { RoundStatuses } from "@/constants/enums";
import Message from "./message/Message";
import { FieldValues } from "react-hook-form";
import { useSelector } from "@/hooks/useSelector";
import { RoundType } from "@/constants/types";

import styles from "./style.module.css";

type PropsType = {
  currentRound: RoundType;
  isCurrentUserGuessTheWord: boolean;
  isViewMode: boolean;
  currentUser: FieldValues;
  handleNewMessage: (message: any) => void;
};

const Chat: React.FC<PropsType> = ({
  currentRound,
  isCurrentUserGuessTheWord,
  isViewMode,
  currentUser,
  handleNewMessage,
}) => {
  const [inputValue, setInputValue] = useState("");
  const messagesAreaRef = useRef<HTMLDivElement>(null);
  const players = useSelector((state) => state.game.eventInfo?.team.players);

  const handleChangeValue = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setInputValue(e.target.value);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !!e.currentTarget.value) {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.blur();
        const currentPlayerData = players?.find(
          (player) => player.id === currentUser.metadata.playerId
        );
        currentPlayerData &&
          handleNewMessage({
            id: uuidv4(),
            createdAt: new Date().toISOString(),
            text: e.currentTarget.value,
            type: "DEFAULT",
            player: {
              id: currentPlayerData.id,
              name: currentPlayerData.name,
            },
            roundId: currentRound.id,
          });
        setInputValue("");
      }
    },
    [handleNewMessage, currentUser.metadata.playerId, currentRound.id, players]
  );

  useEffect(() => {
    const messagesArea = messagesAreaRef.current;
    if (messagesArea) {
      messagesArea.scrollTo({
        top: messagesArea.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [currentRound.messages.length]);

  const disableInput = useMemo(
    () =>
      isViewMode ||
      currentUser?.metadata.playerId === currentRound.drawer.id ||
      currentRound.status !== RoundStatuses.ONGOING ||
      isCurrentUserGuessTheWord,
    [isViewMode, currentRound, currentUser, isCurrentUserGuessTheWord]
  );

  return (
    <div className={styles.chatAreaWrap}>
      <div className={styles.chatAreaHeader}>
        <p>
          <span>{currentRound.drawer.name}</span> is&nbsp;drawing
        </p>
        <Underline className={styles.underline} />
      </div>
      <div className={styles.messagesAreaWrap} ref={messagesAreaRef}>
        <ul className={styles.messagesList}>
          {currentRound.messages.map((message) => (
            <Message
              key={message.id}
              message={message}
              currentRound={currentRound}
            />
          ))}
        </ul>
      </div>
      <div className={styles.inputWrap}>
        <input
          value={inputValue}
          onChange={handleChangeValue}
          onKeyDown={handleKeyDown}
          placeholder={"Type your guess here..."}
          disabled={disableInput}
        />
      </div>
    </div>
  );
};

export default Chat;
