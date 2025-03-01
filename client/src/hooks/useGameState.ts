// useGameState.ts
import { useCallback, useMemo } from "react";
import { EventData, UserData } from "../constants/types";
import { RoundStatuses } from "../constants/enums";

interface UseGameStateParams {
  eventId: string | undefined;
  userData: UserData | null;
  eventData: EventData | null;
  setEventData: React.Dispatch<React.SetStateAction<EventData | null>>;
  broadcast: (data: string) => void;
}

interface UseGameStateReturn {
  isDrawer: boolean;
  handleStartGame: () => void;
}

export const useGameState = ({
  eventId,
  userData,
  eventData,
  setEventData,
  broadcast,
}: UseGameStateParams): UseGameStateReturn => {
  // Check if current user is drawer
  const isDrawer = useMemo(
    () => eventData?.roundInfo.drawerId === userData?.id,
    [eventData?.roundInfo.drawerId, userData?.id]
  );

  // Handle start game
  const handleStartGame = useCallback(() => {
    if (!eventId) return;

    const data = {
      word: {
        label: "Example",
        id: "example",
      },
      startTime: new Date().getTime(),
      id: eventId,
    };

    setEventData(
      (prev) =>
        prev && {
          ...prev,
          roundInfo: {
            ...prev.roundInfo,
            startTime: data.startTime,
            word: data.word,
            status: RoundStatuses.ONGOING,
          },
        }
    );

    broadcast(
      JSON.stringify({
        event: "start-round",
        data,
      })
    );
  }, [broadcast, eventId, setEventData]);

  return {
    isDrawer,
    handleStartGame,
  };
};
