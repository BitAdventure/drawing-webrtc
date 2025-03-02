import { useCallback, useEffect, useState } from "react";
import AppLoader from "@/components/common/UI/appLoader/AppLoader";
import TestDrawArea from "./drawArea/DrawArea";
import Header from "./header/Header";
import {
  DRAW_TIME,
  HEARTBEAT_INTERVAL,
  ServerURL,
} from "@/constants/constants";
import { useParams } from "react-router-dom";
import { UserData } from "@/constants/types";
import { ConnectionState } from "@/constants/enums";
import { useWebRTC } from "@/hooks/useWebRTC";
import useMountEffect from "@/hooks/useMountEffect";
import { useEventSource } from "@/hooks/useEventSource";
import { useBroadcast } from "@/hooks/useBroadcast";
import { useGameState } from "@/hooks/useGameState";

import styles from "./style.module.css";

const Drawer: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");
  const [userData, setUserData] = useState<UserData | null>(null);

  // Get token
  const getToken = useCallback(async () => {
    let actualToken: string = localStorage.getItem("jwtToken") || "";
    if (!actualToken) {
      try {
        const res = await fetch(`${ServerURL}/access`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: "user" + Math.floor(Math.random() * 100000),
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to get access token");
        }

        const { token } = await res.json();
        localStorage.setItem("jwtToken", token);
        actualToken = token;
      } catch (error) {
        console.error("Error getting token:", error);
        return;
      }
    }

    setToken(actualToken);
  }, []);

  useMountEffect(() => {
    getToken();
  });

  // Setup relay function
  const relay = useCallback(
    async (peerId: string, event: string, data: any) => {
      try {
        const response = await fetch(`${ServerURL}/relay/${peerId}/${event}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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
    [token]
  );

  // Initialize WebRTC
  const {
    userPeerData,
    webRTCService,
    eventData,
    setEventData,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
    updatePeerConnectionState,
    handlePeerDisconnect,
    clearAllPeers,
  } = useWebRTC({ token, eventId: id, relay });

  // Initialize EventSource
  const {
    eventSourceRef,
    reconnectTimeoutRef,
    setupEventSource,
    scheduleReconnect,
  } = useEventSource({
    token,
    eventId: id,
    setUserData,
    setEventData,
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
    token,
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
        console.log(
          "CHANNEL READY STATE: ",
          channel?.readyState,
          userPeerData.current.channels,
          peerId
        );
        (peer?.iceConnectionState === "disconnected" ||
          peer?.iceConnectionState === "failed" ||
          peer?.iceConnectionState === "closed") &&
          handlePeerDisconnect(peerId);

        channel?.readyState === "open" &&
          channel.send(
            JSON.stringify({ event: "heartbeat", timestamp: Date.now() })
          );
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

  const { isDrawer, handleStartGame } = useGameState({
    eventId: id,
    userData,
    eventData,
    setEventData,
    broadcast,
  });

  return loading || !eventData ? (
    <AppLoader />
  ) : (
    <div className={styles.contentWrap}>
      <Header
        drawTime={DRAW_TIME}
        roundInfo={eventData.roundInfo}
        isDrawer={isDrawer}
      />
      <main className={styles.mainAreaWrap}>
        <TestDrawArea
          handleStartGame={handleStartGame}
          broadcast={broadcast}
          isDrawer={isDrawer}
          roundInfo={eventData.roundInfo}
        />
      </main>
    </div>
  );
};

export default Drawer;
// import AppLoader from "../../common/UI/appLoader/AppLoader";
// import TestDrawArea from "./drawArea/DrawArea";
// import Header from "./header/Header";
// import { DRAW_TIME } from "../../../constants/constants";
// import useWebRTC from "../../../hooks/useWebRTC";

// import styles from "./style.module.css";

// const Drawer: React.FC = () => {
//   const { loading, handleStartGame, isDrawer, eventData, broadcast } =
//     useWebRTC();

//   return loading || !eventData ? (
//     <AppLoader />
//   ) : (
//     <div className={styles.contentWrap}>
//       <Header
//         drawTime={DRAW_TIME}
//         roundInfo={eventData.roundInfo}
//         isDrawer={isDrawer}
//       />
//       <main className={styles.mainAreaWrap}>
//         <TestDrawArea
//           handleStartGame={handleStartGame}
//           broadcast={broadcast}
//           isDrawer={isDrawer}
//           roundInfo={eventData.roundInfo}
//         />
//       </main>
//     </div>
//   );
// };

// export default Drawer;
