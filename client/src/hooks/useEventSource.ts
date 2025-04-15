import { useCallback, useRef } from "react";
import { EventSourceService } from "../services/eventsource";
import { EventInfoType, RoundResults, RoundType } from "../constants/types";
import { RECONNECT_TIMEOUT } from "../constants/constants";
import { useActions } from "./useActions";
import { Config } from "@/services/config";
import { EventStatuses } from "@/constants/enums";

interface UseEventSourceParams {
  token: string;
  eventId: string | undefined;
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
  setLoading,
  addPeer,
  removePeer,
  sessionDescription,
  iceCandidate,
}: UseEventSourceParams): UseEventSourceReturn => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const eventSourceServiceRef = useRef<EventSourceService | null>(null);
  const { updateStoreEventInfo, updatePartialCurrentRound, updateCurrentRound, updateRoundResults } = useActions();

  // Join game
  const join = useCallback(async () => {
    if (!token || !eventId) return;

    try {
      const response = await fetch(`${Config.SERVER_URL}/${eventId}/join`, {
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
        console.log("USER ID ON JOIN: ", JSON.parse(event.data).user.id);
        // setUserData(JSON.parse(event.data).user);
        await join();
      } catch (error) {
        console.error("Error handling join:", error);
        scheduleReconnect();
      }
    },
    [join, scheduleReconnect]
  );

  // Handle complete join
  const handleCompleteJoin = useCallback(
    async (event: any) => {
      try {
        // maybe this logic should be in event-data event listener
        if (event) {
          const rawEventData = JSON.parse(event.data);
          updateStoreEventInfo({
            eventInfo: rawEventData,
            withRoundsUpdate: true,
          });
          rawEventData?.status !== EventStatuses.COMPLETED && setLoading(false);
        }
      } catch (error) {
        console.error("Error completing join:", error);
        scheduleReconnect();
      }
    },
    // eslint-disable-next-line
    [scheduleReconnect, setLoading]
  );

  const handleUpdateEventInfo = useCallback((event: any) => {
    const newEventInfo: EventInfoType = JSON.parse(event.data);
    console.log("UPDATE EVENT INFO", newEventInfo);
    if (event) {
      const rawEventData = JSON.parse(event.data);
      updateStoreEventInfo({
        eventInfo: rawEventData,
        withRoundsUpdate: true,
      });
      rawEventData?.status !== EventStatuses.COMPLETED && setLoading(false);
    }
    // eslint-disable-next-line
  }, []);

  const handleUpdateCurrentRound = useCallback((event: any) => {
    const currentRoundInfo: RoundType = JSON.parse(event.data);

    updateCurrentRound(currentRoundInfo);
    // eslint-disable-next-line
  }, []);

  const handleUpdatePartialRound = useCallback((event: any) => {
    const currentRoundPartialInfo: Partial<RoundType> = JSON.parse(event.data);
    console.log("UPDATE ROUND: ", currentRoundPartialInfo);
    updatePartialCurrentRound(currentRoundPartialInfo);
    // eslint-disable-next-line
  }, []);

  const handleUpdateRoundResults = useCallback((event: any) => {
    const payload: { roundResults: RoundResults } = JSON.parse(event.data);
    console.log("SHOW RESULTS: ", payload);
    updateRoundResults(payload);
    // eslint-disable-next-line
  }, []);

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
          handleUpdateEventInfo,
          handleUpdateCurrentRound,
          handleUpdatePartialRound,
          handleUpdateRoundResults,
          // handleStartRound,
          // handleFinishRound,
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
    handleUpdateEventInfo,
    handleUpdateCurrentRound,
    handleUpdatePartialRound,
    handleUpdateRoundResults,
    handleEventSourceError,
  ]);

  return {
    eventSourceRef,
    reconnectTimeoutRef,
    setupEventSource,
    scheduleReconnect,
  };
};
