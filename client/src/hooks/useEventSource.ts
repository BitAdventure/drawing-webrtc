import { useCallback, useRef } from "react";
import { EventSourceService } from "../services/eventsource";
import { EventData, UserData, WordType } from "../constants/types";
import { RECONNECT_TIMEOUT, ServerURL } from "../constants/constants";
import { RoundStatuses } from "../constants/enums";

interface UseEventSourceParams {
  token: string;
  eventId: string | undefined;
  setUserData: React.Dispatch<React.SetStateAction<UserData | null>>;
  setEventData: React.Dispatch<React.SetStateAction<EventData | null>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  addPeer: (data: any) => Promise<void>;
  removePeer: (data: any) => void;
  sessionDescription: (data: any) => Promise<void>;
  iceCandidate: (data: any) => Promise<void>;
}

interface UseEventSourceReturn {
  eventSourceRef: React.RefObject<EventSource | null>;
  reconnectTimeoutRef: React.RefObject<number | null>;
  setupEventSource: () => (() => void) | undefined;
  scheduleReconnect: () => void;
}

export const useEventSource = ({
  token,
  eventId,
  setUserData,
  setEventData,
  setLoading,
  addPeer,
  removePeer,
  sessionDescription,
  iceCandidate,
}: UseEventSourceParams): UseEventSourceReturn => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const eventSourceServiceRef = useRef<EventSourceService | null>(null);

  // Join game
  const join = useCallback(async () => {
    if (!token || !eventId) return;

    try {
      const response = await fetch(`${ServerURL}/${eventId}/join`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to join session");
      }
    } catch (error) {
      console.error("Error joining session:", error);
      scheduleReconnect();
    }
    // eslint-disable-next-line
  }, [eventId, token]);

  // Schedule reconnect
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectToEventSource();
    }, RECONNECT_TIMEOUT);
    // eslint-disable-next-line
  }, []);

  // Reconnect to event source
  const reconnectToEventSource = useCallback(() => {
    if (eventSourceServiceRef.current) {
      eventSourceServiceRef.current.close();
    }

    setupEventSource();

    token && eventId && join();
    // eslint-disable-next-line
  }, [join, token, eventId]);

  // Handle join
  const handleJoin = useCallback(
    async (event: any) => {
      try {
        console.log("USER ID: ", JSON.parse(event.data).user.id);
        setUserData(JSON.parse(event.data).user);
        await join();
      } catch (error) {
        console.error("Error handling join:", error);
        scheduleReconnect();
      }
    },
    [join, scheduleReconnect, setUserData]
  );

  // Handle complete join
  const handleCompleteJoin = useCallback(
    async (event: any) => {
      try {
        setEventData(JSON.parse(event.data));
        setLoading(false);
      } catch (error) {
        console.error("Error completing join:", error);
        scheduleReconnect();
      }
    },
    [scheduleReconnect, setEventData, setLoading]
  );

  // Handle start round
  const handleStartRound = useCallback(
    (event: any) => {
      const {
        startTime,
        dateValues,
        ...updates
      }: {
        startTime: number;
        dateValues: Array<number>;
        status: RoundStatuses;
        word: WordType;
      } = JSON.parse(event.data);

      if (startTime && dateValues) {
        const [year, month, day, hours, minutes, seconds, milliseconds] =
          dateValues;

        const localStartTimeTimestamp = new Date(
          year,
          month,
          day,
          hours,
          minutes,
          seconds,
          milliseconds
        ).getTime();

        updates &&
          setEventData((prevData) => {
            if (!prevData) return null;
            return {
              ...prevData,
              roundInfo: {
                ...prevData.roundInfo,
                ...updates,
                startTime: localStartTimeTimestamp,
              },
            };
          });
      }
    },
    [setEventData]
  );

  // Handle finish round
  const handleFinishRound = useCallback(() => {
    setEventData((prevData) => {
      if (!prevData) return null;

      return {
        ...prevData,
        roundInfo: {
          ...prevData.roundInfo,
          status: RoundStatuses.SHOW_RESULT,
        },
      };
    });
  }, [setEventData]);

  // Handle event source error
  const handleEventSourceError = useCallback(
    (error: any) => {
      console.error("EventSource error:", error);
      scheduleReconnect();
    },
    [scheduleReconnect]
  );

  // Setup event source
  const setupEventSource = useCallback(() => {
    if (!token || !eventId) return;

    if (!eventSourceServiceRef.current) {
      eventSourceServiceRef.current = new EventSourceService(
        eventSourceRef,
        {
          addPeer,
          removePeer,
          sessionDescription,
          iceCandidate,
          handleJoin,
          handleCompleteJoin,
          handleStartRound,
          handleFinishRound,
          handleEventSourceError,
        },
        token,
        eventId
      );
    }

    return eventSourceServiceRef.current.setup();
  }, [
    token,
    eventId,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
    handleJoin,
    handleCompleteJoin,
    handleStartRound,
    handleFinishRound,
    handleEventSourceError,
  ]);

  return {
    eventSourceRef,
    reconnectTimeoutRef,
    setupEventSource,
    scheduleReconnect,
  };
};
