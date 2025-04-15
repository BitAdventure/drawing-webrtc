import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./header/Header";
import { HEARTBEAT_INTERVAL } from "@/constants/constants";
import { useParams } from "react-router-dom";
import { ConnectionState } from "@/constants/enums";
import { useWebRTC } from "@/hooks/useWebRTC";
import useMountEffect from "@/hooks/useMountEffect";
import { useEventSource } from "@/hooks/useEventSource";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useGameState } from "@/hooks/useGameState";
import { useAuth } from "@/hooks/useAuth";
import DrawArea from "./drawArea/DrawArea";
import PlayersPanel from "./playersPanel/PlayersPanel";
import Chat from "./chat/Chat";
import { useSelector } from "@/hooks/useSelector";
import { useActions } from "@/hooks/useActions";

import styles from "./style.module.css";
import { Config } from "@/services/config";

const Drawer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const { currentUser } = useAuth();
  const webRTCToken = useSelector((state) => state.auth.webRTCToken);
  const { setWebRTCToken } = useActions();

  // Get token
  const getToken = useCallback(async () => {
    try {
      const res = await fetch(`${Config.SERVER_URL}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentUser?.metadata.playerId,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to get access token");
      }

      const { token } = await res.json();
      setWebRTCToken(token);
    } catch (error) {
      return console.error("Error getting token:", error);
    }
    // eslint-disable-next-line
  }, []);

  useMountEffect(() => {
    getToken();
  });

  // Setup relay function
  const relay = useCallback(
    async (peerId: string, event: string, data: any) => {
      try {
        const response = await fetch(`${Config.SERVER_URL}/relay/${peerId}/${event}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webRTCToken}`,
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to relay ${event} to peer ${peerId}`);
        }
      } catch (error) {
        console.error("Relay error:", error);
        updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
      }
    },
    // eslint-disable-next-line
    [webRTCToken]
  );

  // Initialize WebRTC
  const {
    userPeerData,
    webRTCService,
    currentRound,
    eventInfo,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
    updatePeerConnectionState,
    handlePeerDisconnect,
    clearAllPeers,
  } = useWebRTC({ token: webRTCToken, eventId: id, relay });

  // Initialize EventSource
  const { eventSourceRef, reconnectTimeoutRef, setupEventSource, scheduleReconnect } = useEventSource({
    token: webRTCToken,
    eventId: id,
    setLoading,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
  });

  // Initialize broadcast
  const { broadcast } = useBroadcast({
    webRTCService,
    eventId: id,
    token: webRTCToken,
  });

  // Setup event source and cleanup
  useEffect(() => {
    const cleanup = setupEventSource();

    const heartbeatInterval = setInterval(() => {
      if (eventSourceRef.current && eventSourceRef.current.readyState === 2) {
        console.warn("EventSource connection closed unexpectedly");
        scheduleReconnect();
      }

      const peerIds = Object.keys(userPeerData.current.peers);

      peerIds.forEach((peerId) => {
        const peer = userPeerData.current.peers[peerId];
        const channel = userPeerData.current.channels[peerId];
        console.log("PEER ICE CONNECTION STATE: ", peer?.iceConnectionState);
        console.log("CHANNEL READY STATE: ", channel?.readyState, userPeerData.current.channels, peerId);
        (peer?.iceConnectionState === "disconnected" ||
          peer?.iceConnectionState === "failed" ||
          peer?.iceConnectionState === "closed") &&
          handlePeerDisconnect(peerId);

        channel?.readyState === "open" && channel.send(JSON.stringify({ event: "heartbeat", timestamp: Date.now() }));
      });
    }, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(heartbeatInterval);

      if (reconnectTimeoutRef.current) {
        // eslint-disable-next-line
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        // eslint-disable-next-line
        eventSourceRef.current.close();
      }

      clearAllPeers();

      cleanup?.();
    };
  }, [
    setupEventSource,
    clearAllPeers,
    handlePeerDisconnect,
    scheduleReconnect,
    eventSourceRef,
    userPeerData,
    reconnectTimeoutRef,
  ]);

  const { isDrawer, handleSelectWord, handleNewMessage, showAnswerResult } = useGameState({
    eventId: id,
    currentRound,
    token: webRTCToken,
  });

  const isCurrentUserGuessTheWord = useMemo(
    () =>
      !!currentRound &&
      !isDrawer &&
      !!currentRound.messages.find(
        (message) =>
          message.text.toLowerCase().trim() === currentRound.word?.label.toLowerCase().trim() &&
          currentUser?.metadata.playerId === message.player.id
      ),
    [currentUser?.metadata?.playerId, currentRound, isDrawer]
  );

  return loading
    ? null
    : !!currentRound && !!eventInfo && currentUser && (
        <div className={styles.contentWrap}>
          <Header
            drawTime={eventInfo.gameInformation.drawTime}
            roundInfo={currentRound}
            isDrawer={isDrawer}
            isCurrentUserGuessTheWord={isCurrentUserGuessTheWord}
          />
          <main className={styles.mainAreaWrap}>
            <PlayersPanel />
            <DrawArea
              roundInfo={currentRound}
              isDrawer={isDrawer}
              showAnswerResult={showAnswerResult}
              handleSelectWord={handleSelectWord}
              createMessage={handleNewMessage}
              currentUser={currentUser}
              broadcast={broadcast}
            />
            <Chat
              currentRound={currentRound}
              handleNewMessage={handleNewMessage}
              isCurrentUserGuessTheWord={isCurrentUserGuessTheWord}
              currentUser={currentUser}
            />
          </main>
        </div>
      );
};

export default Drawer;
