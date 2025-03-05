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
  const handleStartGame = useCallback(async () => {
    if (!eventId) return;

    const data = {
      word: {
        label: "Example",
        id: "example",
      },
      startTime: new Date().getTime(),
      id: eventId,
    };

    try {
      await fetch("https://timeapi.io/api/Time/current/zone?timeZone=UTC")
        .then((res) => res.json())
        .then((res) => {
          const currentDate = new Date(res.dateTime + "Z");
          if (currentDate) {
            console.log(
              "UPDATE START ROUND DATE WITH SERVER FETCHED TIME: ",
              res.dateTime
            );
            data.startTime = currentDate.getTime(); // in case of success fetch current time update start time field for round data
          }
        });
    } catch (e) {
      console.log("ERROR ON FETCH TIME: ", e);
    }

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
