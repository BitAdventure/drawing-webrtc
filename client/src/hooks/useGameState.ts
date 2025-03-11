import { useCallback, useMemo, useState } from "react";
import { EventData, RoundType, UserData } from "../constants/types";
import { ServerURL } from "@/constants/constants";

interface UseGameStateParams {
  eventId: string | undefined;
  userData: UserData | null;
  eventData: EventData | null;
  setEventData: React.Dispatch<React.SetStateAction<EventData | null>>;
  token: string;
}

interface UseGameStateReturn {
  isDrawer: boolean;
  handleStartGame: () => void;
  startGameLoading: boolean;
}

export const useGameState = ({
  eventId,
  userData,
  eventData,
  setEventData,
  token,
}: UseGameStateParams): UseGameStateReturn => {
  // Check if current user is drawer
  const isDrawer = useMemo(
    () => eventData?.roundInfo.drawerId === userData?.staticId,
    [eventData?.roundInfo.drawerId, userData?.staticId]
  );
  const [startGameLoading, setStartGameLoading] = useState(false);

  // Handle start game
  const handleStartGame = useCallback(async () => {
    if (!eventId || startGameLoading) return;

    setStartGameLoading(true);

    try {
      await fetch(`${ServerURL}/updateEvent/${eventId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event: "start-round",
        }),
      })
        .then((res) => res.json())
        .then((res: Pick<RoundType, "startTime" | "status" | "word">) => {
          console.log(res);
          setEventData(
            (prev) =>
              prev && {
                ...prev,
                roundInfo: {
                  ...prev.roundInfo,
                  ...res,
                },
              }
          );
        });
    } catch (error) {
      console.error("Error in start game:", error);
    } finally {
      setStartGameLoading(false);
    }
  }, [eventId, setEventData, startGameLoading, token]);

  return {
    isDrawer,
    handleStartGame,
    startGameLoading,
  };
};
