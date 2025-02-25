import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLoader from "../../common/UI/appLoader/AppLoader";
import { useParams } from "react-router-dom";
import TestDrawArea from "./drawArea/DrawArea";
import { EventSource } from "extended-eventsource";
import { RoundStatuses } from "../../../constants/enums";
import Header from "./header/Header";
import useStateRef from "react-usestateref";

import styles from "./style.module.css";

enum ConnectionState {
  CONNECTED = "connected",
  CONNECTING = "connecting",
  DISCONNECTED = "disconnected",
  RECONNECTING = "reconnecting",
}

export type ToolType = "pen" | "eraser";
const DRAW_TIME = 75;
const RECONNECT_TIMEOUT = 5000;
const ICE_GATHERING_TIMEOUT = 10000;
const MAX_RECONNECT_ATTEMPTS = 3;

type UserPeerData = {
  peers: { [key: string]: RTCPeerConnection };
  channels: { [key: string]: RTCDataChannel };
  connectionState: { [key: string]: ConnectionState };
  reconnectAttempts: { [key: string]: number };
};

const ServerURL = import.meta.env.VITE_SERVER_URL || "";

export type RoundType = {
  id: string;
  index: number;
  status: RoundStatuses;
  startTime: number;
  word: {
    id: string;
    label: string;
  } | null;
  drawerId: string;
  lines: Array<any>;
};

type EventData = {
  id: string;
  roundInfo: RoundType;
};

const rtcConfig = {
  iceServers: [
    // Google's public STUN servers
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
    // Twilio's STUN server
    { urls: "stun:global.stun.twilio.com:3478" },
    // Existing freestun servers as fallback
    { urls: "stun:freestun.net:3478" },
    { urls: "turn:freestun.net:3478", username: "free", credential: "free" }
  ],
  iceCandidatePoolSize: 10, // Add candidate pool for faster connections
};

const Drawer: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");
  const userPeerData = useRef<UserPeerData>({
    peers: {},
    channels: {},
    connectionState: {},
    reconnectAttempts: {},
  });
  const [eventData, setEventData, eventDataRef] = useStateRef<EventData | null>(
    null
  );
  const [userData, setUserData] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const iceTimeoutsRef = useRef<{ [key: string]: number }>({});

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

  useEffect(() => {
    getToken();
  }, []);

  const join = useCallback(async () => {
    try {
      const response = await fetch(`${ServerURL}/${id}/join`, {
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
  }, [id, token]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectToEventSource();
    }, RECONNECT_TIMEOUT);
  }, []);

  const reconnectToEventSource = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setupEventSource();

    if (token) {
      join();
    }
  }, [join, token]);

  const clearAllPeers = useCallback(() => {
    Object.values(userPeerData.current.peers).forEach(peer => {
      if (peer) {
        peer.close();
      }
    });

    userPeerData.current.peers = {};
    userPeerData.current.channels = {};
    userPeerData.current.connectionState = {};
    userPeerData.current.reconnectAttempts = {};

    Object.values(iceTimeoutsRef.current).forEach(timeout => {
      clearTimeout(timeout);
    });
    iceTimeoutsRef.current = {};
  }, []);

  const relay = useCallback(
    async (peerId: any, event: any, data: any) => {
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
    [token]
  );

  const updatePeerConnectionState = useCallback((peerId: string, state: ConnectionState) => {
    userPeerData.current.connectionState[peerId] = state;
  }, []);

  const onPeerData = useCallback(
    (peerId: string, data: any) => {
      try {
        const msg = JSON.parse(data);
        switch (msg.event) {
          case "lines":
            eventDataRef.current &&
              setEventData({
                ...eventDataRef.current,
                roundInfo: {
                  ...eventDataRef.current.roundInfo,
                  lines: msg.data,
                },
              });
            break;
          case "start-round":
            eventDataRef.current &&
              setEventData({
                ...eventDataRef.current,
                roundInfo: {
                  ...eventDataRef.current.roundInfo,
                  startTime: msg.data.startTime,
                  word: msg.data.word,
                  status: RoundStatuses.ONGOING,
                },
              });
            break;
          case "ping": {
            const channel = userPeerData.current.channels[peerId];
            if (channel && channel.readyState === "open") {
              channel.send(JSON.stringify({ event: "pong", timestamp: Date.now() }));
            }
            break;
          }
        }
      } catch (error) {
        console.error("Error processing peer data:", error);
      }
    },
    [eventDataRef, setEventData]
  );

  const createOffer = useCallback(
    async (peerId: string, peer: RTCPeerConnection) => {
      try {
        const offer = await peer.createOffer();
        if (peer.signalingState !== "stable") return;

        await peer.setLocalDescription(offer);
        relay(peerId, "session-description", offer);

        if (iceTimeoutsRef.current[peerId]) {
          clearTimeout(iceTimeoutsRef.current[peerId]);
        }

        iceTimeoutsRef.current[peerId] = setTimeout(() => {
          if (userPeerData.current.connectionState[peerId] !== ConnectionState.CONNECTED) {
            console.warn(`ICE gathering timed out for peer ${peerId}`);
            handlePeerDisconnect(peerId);
          }
        }, ICE_GATHERING_TIMEOUT);
      } catch (error) {
        console.error("Error creating offer:", error);
        updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
      }
    },
    [relay]
  );

  const handlePeerDisconnect = useCallback((peerId: string) => {
  const peerData = userPeerData.current;

  // Don't immediately disconnect on ICE errors - check if we have any working candidates
  const peer = peerData.peers[peerId];
  if (peer && (peer.iceConnectionState === "connected" || peer.iceConnectionState === "completed")) {
    // If we're already connected, don't disconnect based on individual ICE errors
    console.log(`Ignoring disconnect request for connected peer ${peerId}`);
    return;
  }

  updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);

  if (!peerData.reconnectAttempts[peerId]) {
    peerData.reconnectAttempts[peerId] = 0;
  }

  peerData.reconnectAttempts[peerId]++;

  if (peerData.reconnectAttempts[peerId] <= MAX_RECONNECT_ATTEMPTS) {
    console.log(`Attempting to reconnect to peer ${peerId}, attempt ${peerData.reconnectAttempts[peerId]}`);

    if (peerData.peers[peerId]) {
      // Don't close existing connection immediately - try to renegotiate first
      try {
        // Only restart ICE instead of closing the connection entirely
        if (peer && peer.restartIce) {
          console.log(`Restarting ICE for peer ${peerId}`);
          peer.restartIce();

          // Try creating a new offer after ICE restart
          setTimeout(() => {
            if (peerData.peers[peerId] && peerData.peers[peerId].signalingState === "stable") {
              createOffer(peerId, peerData.peers[peerId]);
            }
          }, 1000);

          return;
        }
      } catch (error) {
        console.error(`Error restarting ICE for peer ${peerId}:`, error);
      }

      // If ICE restart fails or isn't available, then close and recreate
      peerData.peers[peerId].close();
      delete peerData.peers[peerId];
    }

    relay(peerId, "reconnect-request", { timestamp: Date.now() });
  } else {
    console.error(`Max reconnection attempts reached for peer ${peerId}`);
  }
}, [relay, updatePeerConnectionState, createOffer]);

  const setupPeerConnectionListeners = useCallback((peer: RTCPeerConnection, peerId: string) => {
  // Add temporary state to track consecutive failures
  let consecutiveFailures = 0;

  peer.oniceconnectionstatechange = () => {
    console.log(`ICE connection state for ${peerId}: ${peer.iceConnectionState}`);

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
            console.error(`Error during ICE restart for peer ${peerId}:`, error);
            handlePeerDisconnect(peerId);
          }
        }
        break;
      case "disconnected":
        // Wait a moment before taking action on disconnected state
        // as it might recover automatically
        setTimeout(() => {
          if (peer.iceConnectionState === "disconnected") {
            console.log(`Peer ${peerId} still disconnected after delay, attempting restart`);
            try {
              peer.restartIce();
            } catch (error) {
              console.error(`Error during ICE restart for peer ${peerId}:`, error);
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
    console.error(`Peer connection error for ${peerId}:`, error);
    // Don't immediately disconnect on ICE candidate errors
    // Let the iceconnectionstatechange handler manage this
  };
}, [handlePeerDisconnect, updatePeerConnectionState]);

  const setupDataChannelListeners = useCallback((channel: RTCDataChannel, peerId: string) => {
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
      console.error(`Data channel error for ${peerId}:`, error);
      updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
    };
  }, [updatePeerConnectionState]);

  const addPeer = useCallback(
    async (data: any) => {
      try {
        const message = JSON.parse(data.data);
        if (userPeerData.current.peers[message.peer.id]) {
          return;
        }

        const userPeerDataValue = userPeerData.current;

        const peer = new RTCPeerConnection(rtcConfig);
        userPeerDataValue.peers[message.peer.id] = peer;
        userPeerDataValue.connectionState[message.peer.id] = ConnectionState.CONNECTING;

        setupPeerConnectionListeners(peer, message.peer.id);

        peer.onicecandidate = async function (event) {
          console.log("ICE candidate event:", event, new Date().getTime());
          event.candidate &&
            relay(message.peer.id, "ice-candidate", event.candidate);
        };

        if (message.offer) {
          peer.onnegotiationneeded = async () => {
            await createOffer(message.peer.id, peer);
          };
          const channel = peer.createDataChannel("updates", {
            ordered: true,
          });

          setupDataChannelListeners(channel, message.peer.id);

          channel.onmessage = function (event) {
            onPeerData(message.peer.id, event.data);
          };
          userPeerDataValue.channels[message.peer.id] = channel;
        } else {
          peer.ondatachannel = function (event) {
            console.log("PEER.ONDATACHANNEL: ", event, new Date().getTime());
            userPeerDataValue.channels[message.peer.id] = event.channel;

            setupDataChannelListeners(event.channel, message.peer.id);

            event.channel.onmessage = function (evt) {
              onPeerData(message.peer.id, evt.data);
            };
          };
        }
      } catch (error) {
        console.error("Error adding peer:", error);
      }
    },
    [createOffer, onPeerData, relay, setupDataChannelListeners, setupPeerConnectionListeners]
  );

  const removePeer = useCallback((data: any) => {
    try {
      const message = JSON.parse(data.data);
      const userPeers = userPeerData.current.peers;
      const channels = userPeerData.current.channels;

      if (channels[message.peer.id]) {
        channels[message.peer.id].close();
        delete channels[message.peer.id];
      }

      if (userPeers[message.peer.id]) {
        userPeers[message.peer.id].close();
        delete userPeers[message.peer.id];
      }

      delete userPeerData.current.connectionState[message.peer.id];
      delete userPeerData.current.reconnectAttempts[message.peer.id];

      if (iceTimeoutsRef.current[message.peer.id]) {
        clearTimeout(iceTimeoutsRef.current[message.peer.id]);
        delete iceTimeoutsRef.current[message.peer.id];
      }
    } catch (error) {
      console.error("Error removing peer:", error);
    }
  }, []);

  const sessionDescription = useCallback(
    async (data: any) => {
      try {
        const message = JSON.parse(data.data);
        let peer = userPeerData.current.peers[message.peer.id];

        // If peer doesn't exist, recreate it as part of recovery
        if (!peer) {
          console.log(`Recreating peer for ID: ${message.peer.id} during session description handling`);
          peer = new RTCPeerConnection(rtcConfig);
          userPeerData.current.peers[message.peer.id] = peer;
          userPeerData.current.connectionState[message.peer.id] = ConnectionState.CONNECTING;

          setupPeerConnectionListeners(peer, message.peer.id);

          peer.onicecandidate = async function (event) {
            console.log("ICE candidate event:", event, new Date().getTime());
            event.candidate &&
              relay(message.peer.id, "ice-candidate", event.candidate);
          };

          // Setup ondatachannel for recreated peer
          peer.ondatachannel = function (event) {
            console.log("PEER.ONDATACHANNEL on recreated peer: ", event);
            userPeerData.current.channels[message.peer.id] = event.channel;

            setupDataChannelListeners(event.channel, message.peer.id);

            event.channel.onmessage = function (evt) {
              onPeerData(message.peer.id, evt.data);
            };
          };
        }

        const remoteDescription = new RTCSessionDescription(message.data);

        if (
          remoteDescription.type === "offer" &&
          peer.signalingState !== "stable"
        ) {
          await Promise.all([
            peer.setLocalDescription({ type: "rollback" }),
            peer.setRemoteDescription(remoteDescription),
          ]);
        } else {
          console.log(
            "Setting remote description:",
            remoteDescription,
            new Date().getTime()
          );
          await peer.setRemoteDescription(remoteDescription);
        }

        if (remoteDescription.type === "offer") {
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          console.log(
            "Setting local description:",
            peer.localDescription,
            new Date().getTime()
          );
          await relay(message.peer.id, "session-description", answer);
        }
      } catch (error) {
        console.error("Error handling session description:", error);
        if (data && data.data) {
          try {
            const message = JSON.parse(data.data);
            if (message.peer && message.peer.id) {
              updatePeerConnectionState(message.peer.id, ConnectionState.DISCONNECTED);
            }
          } catch (e) {
            console.error("Error parsing peer data during error handling:", e);
          }
        }
      }
    },
    [relay, updatePeerConnectionState, setupPeerConnectionListeners, setupDataChannelListeners, onPeerData]
  );

  const iceCandidate = useCallback(async (event: any) => {
    try {
      const message = JSON.parse(event.data);
      const peer: RTCPeerConnection = userPeerData.current.peers[message.peer.id];

      if (!peer) {
        console.error(`No peer found for ID: ${message.peer.id} during ICE candidate handling - will be recreated on next session description`);
        return;
      }

      const iceCandidateInit = new RTCIceCandidate(message.data);
      console.log("Adding ICE candidate for peer:", message.peer.id);

      await peer.addIceCandidate(iceCandidateInit).catch(err => {
        console.warn(`Non-critical error adding ICE candidate: ${err.message} - this can be normal during connection setup`);
      });
    } catch (error) {
      console.error("Error handling ICE candidate:", error);
    }
  }, []);

  const handleJoin = useCallback(
    async (event: any) => {
      try {
        setUserData(JSON.parse(event.data).user);
        await join();
      } catch (error) {
        console.error("Error handling join:", error);
        scheduleReconnect();
      }
    },
    [join, scheduleReconnect]
  );

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
    [scheduleReconnect, setEventData]
  );

  const handleFinishRound = useCallback(() => {
    eventDataRef.current &&
      setEventData({
        ...eventDataRef.current,
        roundInfo: {
          ...eventDataRef.current.roundInfo,
          status: RoundStatuses.SHOW_RESULT,
        },
      });
  }, [eventDataRef, setEventData]);

  const handleEventSourceError = useCallback((error: any) => {
    console.error("EventSource error:", error);
    scheduleReconnect();
  }, [scheduleReconnect]);

  const setupEventSource = useCallback(() => {
    if (token && id) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const eventSource = new EventSource(
        `${ServerURL}/connect?token=${token}&eventId=${id}`
      );
      eventSourceRef.current = eventSource;

      eventSource.addEventListener("add-peer", addPeer, false);
      eventSource.addEventListener("remove-peer", removePeer, false);
      eventSource.addEventListener(
        "session-description",
        sessionDescription,
        false
      );
      eventSource.addEventListener("ice-candidate", iceCandidate, false);
      eventSource.addEventListener("connected", handleJoin);
      eventSource.addEventListener("join-completed", handleCompleteJoin);
      eventSource.addEventListener("finish-round", handleFinishRound, false);

      eventSource.onerror = handleEventSourceError;

      return () => {
        eventSource.close();
      };
    }
  }, [
    token,
    id,
    addPeer,
    removePeer,
    sessionDescription,
    iceCandidate,
    handleJoin,
    handleCompleteJoin,
    handleFinishRound,
    handleEventSourceError
  ]);

  useEffect(() => {
    const cleanup = setupEventSource();

    const heartbeatInterval = setInterval(() => {
      if (eventSourceRef.current && eventSourceRef.current.readyState === 2) {
        console.warn("EventSource connection closed unexpectedly");
        scheduleReconnect();
      }

      const peerIds = Object.keys(userPeerData.current.peers);
      if (peerIds.length > 0) {
        peerIds.forEach(peerId => {
          const peer = userPeerData.current.peers[peerId];
          const channel = userPeerData.current.channels[peerId];

          if (peer && (peer.iceConnectionState === "disconnected" || peer.iceConnectionState === "failed" || peer.iceConnectionState === "closed")) {
            handlePeerDisconnect(peerId);
          }

          if (channel && channel.readyState === "open") {
            channel.send(JSON.stringify({ event: "heartbeat", timestamp: Date.now() }));
          }
        });
      }
    }, 10000);

    return () => {
      clearInterval(heartbeatInterval);

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      Object.values(iceTimeoutsRef.current).forEach(timeout => {
        clearTimeout(timeout);
      });

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      clearAllPeers();

      if (cleanup) cleanup();
    };
  }, [setupEventSource, clearAllPeers, handlePeerDisconnect, scheduleReconnect]);

  const broadcast = useCallback(
    (data: string) => {
      const channels = userPeerData.current.channels;
      for (const peerId in channels) {
        if (channels[peerId].readyState === "open") {
          try {
            channels[peerId].send(data);
          } catch (error) {
            console.error(`Error broadcasting to peer ${peerId}:`, error);
            updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
          }
        } else if (channels[peerId].readyState === "closed" || channels[peerId].readyState === "closing") {
          updatePeerConnectionState(peerId, ConnectionState.DISCONNECTED);
        }
      }

      try {
        fetch(`${ServerURL}/updateEvent/${id}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: data,
        }).catch(error => {
          console.error("Error updating event on server:", error);
        });
      } catch (error) {
        console.error("Error in broadcast:", error);
      }
    },
    [id, token, updatePeerConnectionState]
  );

  const handleStartGame = useCallback(() => {
    const data = {
      word: {
        label: "Example",
        id: "example",
      },
      startTime: new Date().getTime(),
      id,
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
  }, [broadcast, id, setEventData]);

  const isDrawer = useMemo(
    () => eventData?.roundInfo.drawerId === userData?.id,
    [eventData?.roundInfo.drawerId, userData?.id]
  );

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