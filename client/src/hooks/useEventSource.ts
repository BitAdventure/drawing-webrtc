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
  timeDifference: number;
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
  timeDifference,
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
        const rawEventData = JSON.parse(event.data);
        setEventData({
          ...rawEventData,
          roundInfo: {
            ...rawEventData.roundInfo,
            startTime:
              rawEventData.roundInfo.startTime &&
              rawEventData.roundInfo.startTime + timeDifference,
          },
        });
        setLoading(false);
      } catch (error) {
        console.error("Error completing join:", error);
        scheduleReconnect();
      }
    },
    [scheduleReconnect, setEventData, setLoading, timeDifference]
  );

  // Handle start round
  const handleStartRound = useCallback(
    (event: any) => {
      const {
        startTime,
        ...updates
      }: {
        status: RoundStatuses;
        startTime: number;
        word: WordType;
      } = JSON.parse(event.data);

      updates &&
        setEventData((prevData) => {
          if (!prevData) return null;
          return {
            ...prevData,
            roundInfo: {
              ...prevData.roundInfo,
              ...updates,
              startTime: startTime + timeDifference,
            },
          };
        });
    },
    [setEventData, timeDifference]
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
