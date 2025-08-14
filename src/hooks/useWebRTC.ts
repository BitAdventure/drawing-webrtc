import { useCallback, useEffect, useRef } from "react";
import { WebRTCService } from "@/services/webrtc";
import {
  ConnectionState,
  EventStatuses,
  RoundStatuses,
} from "@/constants/enums";
import { ICE_GATHERING_TIMEOUT, RTC_CONFIG } from "@/constants/constants";
import {
  EventInfoType,
  RelayFunction,
  RoundType,
  UserPeerData,
} from "@/constants/types";
import { useSelector } from "./useSelector";
import { useActions } from "./useActions";
import { BREAKOUT_ROOM, RESULTS } from "@/constants/routes";
import { useNavigate } from "react-router-dom";

interface UseWebRTCParams {
  eventId: string | undefined;
  relay: RelayFunction;
}

interface UseWebRTCReturn {
  userPeerData: React.RefObject<UserPeerData>;
  webRTCService: WebRTCService | null;
  currentRound: RoundType | null;
  eventInfo: EventInfoType | null;
  addPeer: (data: any) => Promise<void>;
  removePeer: (data: any) => void;
  sessionDescription: (data: any) => Promise<void>;
  iceCandidate: (data: any) => Promise<void>;
  updatePeerConnectionState: (peerId: string, state: ConnectionState) => void;
  handlePeerDisconnect: (peerId: string) => void;
  clearAllPeers: () => void;
}

export const useWebRTC = ({
  eventId,
  relay,
}: UseWebRTCParams): UseWebRTCReturn => {
  const navigate = useNavigate();
  const { updateLines } = useActions();
  const eventInfo = useSelector((state) => state.game.eventInfo);
  const currentRound = useSelector((state) => state.game.currentRound);

  const userPeerData = useRef<UserPeerData>({
    peers: {},
    channels: {},
    connectionState: {},
    reconnectAttempts: {},
  });

  const iceTimeoutsRef = useRef<{
    [key: string]: ReturnType<typeof setTimeout>;
  }>({});

  // Service reference
  const webRTCServiceRef = useRef<WebRTCService | null>(null);

  useEffect(() => {
    if (
      eventInfo?.status === EventStatuses.COMPLETED ||
      (currentRound &&
        eventInfo?.gameInformation.totalRounds &&
        currentRound.index === eventInfo.gameInformation.totalRounds - 1 &&
        currentRound.status === RoundStatuses.COMPLETED)
    ) {
      navigate(`/${eventId}/${RESULTS}`);
    } else if (eventInfo?.status === EventStatuses.UPCOMING)
      navigate(`/${eventId}/${BREAKOUT_ROOM}`);
  }, [
    currentRound,
    eventInfo?.gameInformation,
    eventId,
    navigate,
    eventInfo?.status,
  ]);

  // Update connection state
  const updatePeerConnectionState = useCallback(
    (peerId: string, state: ConnectionState) => {
      userPeerData.current.connectionState[peerId] = state;
    },
    []
  );

  // Handle peer data
  const onPeerData = useCallback(
    (peerId: string, data: any) => {
      try {
        const msg = JSON.parse(data);

        switch (msg.event) {
          case "lines":
            updateLines(msg.data);
            break;
          case "ping": {
            const channel = userPeerData.current.channels[peerId];
            if (channel && channel.readyState === "open") {
              channel.send(
                JSON.stringify({ event: "pong", timestamp: Date.now() })
              );
            }
            break;
          }
        }
      } catch (error) {
        console.error(
          `Error processing peer data (msg: ${data}, peerId: ${peerId}): `,
          error
        );
      }
    },
    [updateLines]
  );

  // Create offer
  const createOffer = useCallback(
    async (peerId: string, peer: RTCPeerConnection) => {
      try {
        const offer = await peer.createOffer();
        if (peer.signalingState !== "stable") return;

        await peer.setLocalDescription(offer);
        relay({ peerId, event: "session-description", data: offer });

        iceTimeoutsRef.current[peerId] &&
          clearTimeout(iceTimeoutsRef.current[peerId]);

        iceTimeoutsRef.current[peerId] = setTimeout(() => {
          if (
            userPeerData.current.connectionState[peerId] !==
            ConnectionState.CONNECTED
          ) {
            console.warn(`ICE gathering timed out for peer ${peerId}`);
            handlePeerDisconnect(peerId);
          }
        }, ICE_GATHERING_TIMEOUT);
      } catch (error) {
        console.error(`Error creating offer for ${peerId}: `, error);
        updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
      }
    },
    [relay, updatePeerConnectionState]
  );

  // Handle peer disconnect
  const handlePeerDisconnect = useCallback(
    (peerId: string) => {
      const peerData = userPeerData.current;

      // Don't immediately disconnect on ICE errors - check if we have any working candidates
      const peer = peerData.peers[peerId];
      if (
        peer?.iceConnectionState === "connected" ||
        peer?.iceConnectionState === "completed"
      ) {
        // If we're already connected, don't disconnect based on individual ICE errors
        console.log(`Ignoring disconnect request for connected peer ${peerId}`);
        return;
      }

      updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);

      if (!peerData.reconnectAttempts[peerId]) {
        peerData.reconnectAttempts[peerId] = 0;
      }

      peerData.reconnectAttempts[peerId]++;

      if (peerData.reconnectAttempts[peerId] <= 3) {
        console.log(
          `Attempting to reconnect to peer ${peerId}, attempt ${peerData.reconnectAttempts[peerId]}`
        );

        if (peerData.peers[peerId]) {
          // Don't close existing connection immediately - try to renegotiate first
          try {
            // Only restart ICE instead of closing the connection entirely
            if (peer?.restartIce) {
              console.log(`Restarting ICE for peer ${peerId}`);
              peer.restartIce();

              // Try creating a new offer after ICE restart
              return setTimeout(() => {
                if (
                  peerData.peers[peerId] &&
                  peerData.peers[peerId].signalingState === "stable"
                ) {
                  createOffer(peerId, peerData.peers[peerId]);
                }
              }, 1000);
            }
          } catch (error) {
            console.error(`Error restarting ICE for peer ${peerId}: `, error);
          }

          // If ICE restart fails or isn't available, then close and recreate
          peerData.peers[peerId].close();
          delete peerData.peers[peerId];
        }
      } else {
        console.error(`Max reconnection attempts reached for peer ${peerId}`);
      }
    },
    [updatePeerConnectionState, createOffer]
  );

  // Setup peer connection listeners
  const setupPeerConnectionListeners = useCallback(
    (peer: RTCPeerConnection, peerId: string) => {
      // Add temporary state to track consecutive failures
      let consecutiveFailures = 0;

      peer.oniceconnectionstatechange = () => {
        console.log(
          `ICE connection state for ${peerId}: ${peer.iceConnectionState}`
        );

        switch (peer.iceConnectionState) {
          case "connected":
          case "completed":
            if (iceTimeoutsRef.current[peerId]) {
              clearTimeout(iceTimeoutsRef.current[peerId]);
              delete iceTimeoutsRef.current[peerId];
            }
            updatePeerConnectionState(peerId, ConnectionState.CONNECTED);
            userPeerData.current.reconnectAttempts[peerId] = 0;
            consecutiveFailures = 0; // Reset failure counter on success
            break;
          case "failed":
            consecutiveFailures++;
            if (consecutiveFailures >= 3) {
              // Only disconnect after multiple consecutive failures
              handlePeerDisconnect(peerId);
            } else {
              // Try restarting ICE negotiation first
              try {
                console.log(`Attempting ICE restart for peer ${peerId}`);
                peer.restartIce();
              } catch (error) {
                console.error(
                  `Error during ICE restart for peer ${peerId}: `,
                  error
                );
                handlePeerDisconnect(peerId);
              }
            }
            break;
          case "disconnected":
            // Wait a moment before taking action on disconnected state
            // as it might recover automatically
            setTimeout(() => {
              if (peer.iceConnectionState === "disconnected") {
                console.log(
                  `Peer ${peerId} still disconnected after delay, attempting restart`
                );
                try {
                  peer.restartIce();
                } catch (error) {
                  console.error(
                    `Error during ICE restart for peer ${peerId}: `,
                    error
                  );
                  handlePeerDisconnect(peerId);
                }
              }
            }, 5000);
            break;
          case "closed":
            handlePeerDisconnect(peerId);
            break;
        }
      };

      peer.onconnectionstatechange = () => {
        console.log(`Connection state for ${peerId}: ${peer.connectionState}`);

        if (peer.connectionState === "failed") {
          handlePeerDisconnect(peerId);
        }
      };

      // Modify this to be more tolerant of individual ICE candidate errors
      peer.onicecandidateerror = (error) => {
        console.error(`Peer connection error for ${peerId}: `, error);
        // Don't immediately disconnect on ICE candidate errors
        // Let the iceconnectionstatechange handler manage this
      };
    },
    [handlePeerDisconnect, updatePeerConnectionState]
  );

  // Setup data channel listeners
  const setupDataChannelListeners = useCallback(
    (channel: RTCDataChannel, peerId: string) => {
      channel.onopen = () => {
        console.log(`Data channel for ${peerId} opened`);
        updatePeerConnectionState(peerId, ConnectionState.CONNECTED);

        channel.send(JSON.stringify({ event: "ping", timestamp: Date.now() }));
      };

      channel.onclose = () => {
        console.log(`Data channel for ${peerId} closed`);
        updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
      };

      channel.onerror = (error) => {
        console.error(`Data channel error for ${peerId}: `, error);
        updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
      };
    },
    [updatePeerConnectionState]
  );

  // Initialize WebRTC service
  if (!webRTCServiceRef.current && eventId) {
    webRTCServiceRef.current = new WebRTCService(
      userPeerData,
      iceTimeoutsRef,
      RTC_CONFIG,
      relay,
      {
        onPeerData,
        updatePeerConnectionState,
        createOffer,
        handlePeerDisconnect,
        setupPeerConnectionListeners,
        setupDataChannelListeners,
      }
    );
  }

  // Add peer
  const addPeer = useCallback(async (data: any) => {
    try {
      console.log("ADD PEER IN WEBRTC SERVICE: ", webRTCServiceRef.current);
      webRTCServiceRef.current?.createPeer(data.peer.id, data.offer);
    } catch (error) {
      console.error("Error adding peer: ", error);
    }
  }, []);

  // Remove peer
  const removePeer = useCallback((payload: any) => {
    try {
      webRTCServiceRef.current?.removePeer(payload.peer.id);
    } catch (error) {
      console.error(`Error removing peer ${payload?.peer?.id}: `, error);
    }
  }, []);

  // Session description
  const sessionDescription = useCallback(async (payload: any) => {
    try {
      if (webRTCServiceRef.current) {
        console.log(payload);
        await webRTCServiceRef.current.handleSessionDescription(
          payload.peer.id,
          payload.data
        );
      }
    } catch (error) {
      console.error("Error handling session description: ", error);
    }
  }, []);

  // ICE candidate
  const iceCandidate = useCallback(async (payload: any) => {
    try {
      if (webRTCServiceRef.current) {
        await webRTCServiceRef.current.addIceCandidate(
          payload.peer.id,
          payload.data
        );
      }
    } catch (error) {
      console.error(`Error handling ICE candidate ${payload}: `, error);
    }
  }, []);

  // Clear all peers
  const clearAllPeers = useCallback(() => {
    if (webRTCServiceRef.current) {
      webRTCServiceRef.current.clearAllPeers();
    }
  }, []);

  return {
    userPeerData,
    webRTCService: webRTCServiceRef.current,
    currentRound,
    eventInfo,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
    updatePeerConnectionState,
    handlePeerDisconnect,
    clearAllPeers,
  };
};
