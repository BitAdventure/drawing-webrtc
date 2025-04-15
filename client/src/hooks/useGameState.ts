import { useCallback, useMemo, useState } from "react";
import { AnswerResultType, MessageType, RoundType, WordType } from "../constants/types";
import { useAuth } from "./useAuth";
import { Config } from "@/services/config";

interface UseGameStateParams {
  eventId: string | undefined;
  currentRound: RoundType | null;
  token: string;
}

interface UseGameStateReturn {
  isDrawer: boolean;
  handleSelectWord: (word: WordType) => void;
  handleNewMessage: (message: MessageType) => void;
  showAnswerResult: AnswerResultType;
}

export const useGameState = ({ eventId, currentRound, token }: UseGameStateParams): UseGameStateReturn => {
  const { currentUser } = useAuth();
  // Check if current user is drawer
  const isDrawer = useMemo(
    () => !!currentUser && currentUser.metadata.playerId === currentRound?.drawer.id,
    [currentUser, currentRound]
  );
  const [showAnswerResult, setShowAnswerResult] = useState<AnswerResultType>(null);

  // Handle start game
  const handleSelectWord = useCallback(
    async (word: WordType) => {
      if (!eventId) return;

      try {
        await fetch(`${Config.SERVER_URL}/updateEvent/${eventId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event: "start-round",
            data: {
              roundId: currentRound?.id,
              word,
            },
          }),
        });
      } catch (error) {
        console.error("Error in start game:", error);
      }
    },
    [currentRound?.id, eventId, token]
  );

  const handleNewMessage = useCallback(
    async (message: MessageType) => {
      try {
        await fetch(`${Config.SERVER_URL}/updateEvent/${eventId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            event: "new-message",
            data: message,
          }),
        });
      } catch (error) {
        console.error("Error in start game:", error);
      }

      if (message.type !== "DEFAULT") return;
      setShowAnswerResult(
        currentRound?.word?.label.toLowerCase().trim() === message.text.toLowerCase().trim() ? "correct" : "wrong"
      );
      setTimeout(() => setShowAnswerResult(null), 3000);
    },
    [currentRound?.word?.label, eventId, token]
  );

  return {
    isDrawer,
    handleSelectWord,
    handleNewMessage,
    showAnswerResult,
  };
};
