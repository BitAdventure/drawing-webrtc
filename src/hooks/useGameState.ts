import { useCallback, useMemo, useState } from "react";
import { AnswerResultType, MessageType, RoundType } from "@/constants/types";
import { useAuth } from "./useAuth";
import { Socket } from "socket.io-client";

interface UseGameStateParams {
  currentRound: RoundType | null;
  newSocket: Socket | null;
}

interface UseGameStateReturn {
  isDrawer: boolean;
  handleNewMessage: (message: MessageType) => void;
  showAnswerResult: AnswerResultType;
  isCurrentUserGuessTheWord: boolean;
}

export const useGameState = ({
  currentRound,
  newSocket,
}: UseGameStateParams): UseGameStateReturn => {
  const { currentUser } = useAuth();
  // Check if current user is drawer
  const isDrawer = useMemo(
    () =>
      !!currentUser &&
      currentUser.metadata.playerId === currentRound?.drawer.id,
    [currentUser, currentRound]
  );
  const [showAnswerResult, setShowAnswerResult] =
    useState<AnswerResultType>(null);

  const handleNewMessage = useCallback(
    (message: MessageType) => {
      newSocket?.emit("new-message", message);

      if (message.type !== "DEFAULT") return;
      setShowAnswerResult(
        currentRound?.word?.label.toLowerCase().trim() ===
          message.text.toLowerCase().trim()
          ? "correct"
          : "wrong"
      );
      setTimeout(() => setShowAnswerResult(null), 3000);
    },
    [currentRound?.word?.label, newSocket]
  );

  const isCurrentUserGuessTheWord = useMemo(
    () =>
      !!currentRound &&
      !isDrawer &&
      !!currentRound.messages.find(
        (message) =>
          message.text.toLowerCase().trim() ===
            currentRound.word?.label.toLowerCase().trim() &&
          currentUser?.metadata.playerId === message.player.id
      ),
    [currentUser?.metadata?.playerId, currentRound, isDrawer]
  );

  return {
    isDrawer,
    handleNewMessage,
    showAnswerResult,
    isCurrentUserGuessTheWord,
  };
};
