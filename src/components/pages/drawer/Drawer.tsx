import { useCallback, useEffect, useMemo, useState } from "react";
import Header from "./header/Header";
import PlayersPanel from "./playersPanel/PlayersPanel";
import { useActions } from "@/hooks/useActions";
import { useParams } from "react-router-dom";
import DrawArea from "./drawArea/DrawArea";
import Chat from "./chat/Chat";
import { useAuth } from "@/hooks/useAuth";
import { ConnectionState } from "@/constants/enums";
import { io, Socket } from "socket.io-client";
import TokenService from "@/services/tokenService";
import { Config } from "@/services/config";
import { useWebRTC } from "@/hooks/useWebRTC";
import { LineType, RoundResults, RoundType } from "@/constants/types";
import { useBroadcast } from "@/hooks/useBroadcast";
import { HEARTBEAT_INTERVAL } from "@/constants/constants";
import { useGameState } from "@/hooks/useGameState";

import styles from "./style.module.css";

const Drawer: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const {
    updateStoreEventInfo,
    updatePartialCurrentRound,
    updateCurrentRound,
    updateRoundResults,
    updateLines,
  } = useActions();
  const { currentUser } = useAuth();

  const newSocket: Socket = useMemo(
    () =>
      io(Config.SOCKET_IO_SERVER_URL, {
        transports: ["websocket"],
        auth: {
          accessToken: TokenService.getLocalAccessToken(),
          eventId: id,
          playerId: currentUser?.metadata.playerId,
        },
      }),
    [currentUser?.metadata.playerId, id]
  );

  const relay = useCallback(
    (payload: { peerId: string; event: string; data: any }) => {
      newSocket.emit("relay", payload);
    },
    [newSocket]
  );

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
  } = useWebRTC({ eventId: id, relay });
  // } = useWebRTC({ token: webRTCToken, eventId: id, relay });

  // Initialize broadcast
  const { broadcast } = useBroadcast({
    webRTCService,
    eventId: id,
    socket: newSocket,
  });

  useEffect(() => {
    // newSocket.on("webrtc-token", (payload: any) => {
    //   setWebRTCToken(payload);
    // });

    newSocket.on("event-data", (eventInfo: any) => {
      eventInfo &&
        updateStoreEventInfo({
          eventInfo,
          withRoundsUpdate: true,
        });
      setLoading(false);
    });

    newSocket.on(
      "update-partial-current-round",
      (payload: Partial<RoundType>) => {
        updatePartialCurrentRound(payload);
      }
    );

    newSocket.on("update-current-round", (payload: RoundType) => {
      updateCurrentRound(payload);
    });

    newSocket.on("show-result", (payload: { roundResults: RoundResults }) => {
      updateRoundResults(payload);
    });

    newSocket.on("update-lines", (payload: { lines: Array<LineType> }) => {
      updateLines(payload);
    });

    newSocket.on("add-peer", (payload: any) => {
      console.log("ADD PEER: ", payload);
      addPeer(payload);
    });

    newSocket.on("remove-peer", (payload: any) => {
      console.log("REMOVE PEER: ", payload);
      removePeer(payload);
    });

    newSocket.on("session-description", (payload: any) => {
      if (payload.failed) {
        return updatePeerConnectionState(
          payload.peer.id,
          ConnectionState.DISCONNECTED
        );
      }
      sessionDescription(payload);
    });

    newSocket.on("ice-candidate", (payload: any) => {
      console.log("ICE CANDIDATE: ", payload);
      if (payload.failed) {
        return updatePeerConnectionState(
          payload.peer.id,
          ConnectionState.DISCONNECTED
        );
      }
      iceCandidate(payload);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [newSocket]);

  useEffect(
    () => {
      const heartbeatInterval = setInterval(() => {
        const peerIds = Object.keys(userPeerData.current?.peers || {});

        peerIds.forEach((peerId) => {
          const peer = userPeerData.current?.peers[peerId];
          const channel = userPeerData.current?.channels[peerId];
          console.log("PEER ICE CONNECTION STATE: ", peer?.iceConnectionState);
          console.log(
            "CHANNEL READY STATE: ",
            channel?.readyState,
            userPeerData.current?.channels,
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
        clearAllPeers();
      };
    },
    [
      // clearAllPeers,
      // handlePeerDisconnect,
    ]
  );

  const {
    isDrawer,
    showAnswerResult,
    isCurrentUserGuessTheWord,
    handleNewMessage,
  } = useGameState({
    currentRound,
    newSocket,
  });

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
              createMessage={handleNewMessage}
              currentUser={currentUser}
              socket={newSocket}
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
