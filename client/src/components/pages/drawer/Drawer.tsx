import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppLoader from "../../common/UI/appLoader/AppLoader";
import { useParams } from "react-router-dom";
import TestDrawArea from "./drawArea/DrawArea";
import { EventSource } from "extended-eventsource";
import { RoundStatuses } from "../../../constants/enums";
import Header from "./header/Header";
import useStateRef from "react-usestateref";

import styles from "./style.module.css";

export type ToolType = "pen" | "eraser";
const DRAW_TIME = 75;
type UserPeerData = {
  peers: { [key: string]: RTCPeerConnection };
  channels: { [key: string]: RTCDataChannel };
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
    { urls: "stun:freestun.net:3478" },
    { urls: "turn:freestun.net:3478", username: "free", credential: "free" },
    // {
    //   urls: [
    //     "stun:stun.l.google.com:19302",
    //     "stun:global.stun.twilio.com:3478",
    //   ],
    // },
  ],
};

const Drawer: React.FC = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>("");
  const userPeerData = useRef<UserPeerData>({
    peers: {},
    channels: {},
  });
  const [eventData, setEventData, eventDataRef] = useStateRef<EventData | null>(
    null
  );
  const [userData, setUserData] = useState<any>(null);

  const getToken = useCallback(async () => {
    let actualToken: string = localStorage.getItem("jwtToken") || "";
    if (!actualToken) {
      const res = await fetch(`${ServerURL}/access`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: "user" + Math.floor(Math.random() * 100000),
        }),
      });
      const { token } = await res.json();

      localStorage.setItem("jwtToken", token);
      actualToken = token;
    }

    setToken(actualToken);
  }, []);

  useEffect(() => {
    getToken();
    //eslint-disable-next-line
  }, []);

  const join = useCallback(async () => {
    const res = await fetch(`${ServerURL}/${id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }).then((res) => res);

    const serverEventData: EventData = await res.json();
    setEventData(serverEventData);

    setLoading(false);
  }, [id, token, setEventData]);

  const relay = useCallback(
    async (peerId: any, event: any, data: any) => {
      await fetch(`${ServerURL}/relay/${peerId}/${event}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
    },
    [token]
  );

  const onPeerData = useCallback(
    (_: any, data: any) => {
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
      }
    },
    [eventDataRef, setEventData]
  );

  const createOffer = useCallback(
    async (peerId: string, peer: RTCPeerConnection) => {
      const offer = await peer.createOffer();
      if (peer.signalingState != "stable") return;
      await peer.setLocalDescription(offer);
      relay(peerId, "session-description", offer);
    },
    [relay]
  );

  const addPeer = useCallback(
    async (data: any) => {
      const message = JSON.parse(data.data);
      if (userPeerData.current.peers[message.peer.id]) {
        return;
      }

      const userPeerDataValue = userPeerData.current;

      // setup peer connection
      const peer = new RTCPeerConnection(rtcConfig);
      userPeerDataValue.peers[message.peer.id] = peer;

      // handle ice candidate
      peer.onicecandidate = async function (event) {
        console.log("ICE candidate event:", event, new Date().getTime());
        event.candidate &&
          relay(message.peer.id, "ice-candidate", event.candidate);
      };

      // generate offer if required (on join, this peer will create an offer
      // to every other peer in the network, thus forming a mesh)
      if (message.offer) {
        peer.onnegotiationneeded = async () => {
          await createOffer(message.peer.id, peer);
        };
        // create the data channel, map peer updates
        const channel = peer.createDataChannel("updates");
        channel.onmessage = function (event) {
          onPeerData(message.peer.id, event.data);
        };
        userPeerDataValue.channels[message.peer.id] = channel;
      } else {
        peer.ondatachannel = function (event) {
          console.log("PEER.ONDATACHANNEL: ", event, new Date().getTime());
          userPeerDataValue.channels[message.peer.id] = event.channel;
          event.channel.onmessage = function (evt) {
            onPeerData(message.peer.id, evt.data);
          };
        };
      }
    },
    [createOffer, onPeerData, relay]
  );

  const removePeer = useCallback((data: any) => {
    const message = JSON.parse(data.data);
    const userPeers = userPeerData.current.peers;
    userPeers[message.peer.id] && userPeers[message.peer.id].close();

    delete userPeers[message.peer.id];
  }, []);

  const sessionDescription = useCallback(
    async (data: any) => {
      const message = JSON.parse(data.data);
      const peer = userPeerData.current.peers[message.peer.id];
      const remoteDescription = new RTCSessionDescription(message.data);
      // console.log(
      //   "Setting remote description:",
      //   remoteDescription,
      //   new Date().getTime()
      // );
      // await peer.setRemoteDescription(remoteDescription);

      if (
        remoteDescription.type === "offer" &&
        peer.signalingState !== "stable"
      ) {
        // return;
        // // if (!message.peer.polite) return;
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
    },
    [relay]
  );

  const iceCandidate = useCallback(async (event: any) => {
    const message = JSON.parse(event.data);
    const peer: RTCPeerConnection = userPeerData.current.peers[message.peer.id];

    const iceCandidateInit = new RTCIceCandidate(message.data);
    console.log("PEER: ", peer, new Date().getTime());

    await peer.addIceCandidate(iceCandidateInit);
  }, []);

  const handleJoin = useCallback(
    async (event: any) => {
      setUserData(JSON.parse(event.data).user);
      await join();
    },
    [join]
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

  useEffect(() => {
    if (token) {
      const eventSource = new EventSource(
        `${ServerURL}/connect?token=${token}&eventId=${id}`
      );

      eventSource.addEventListener("add-peer", addPeer, false);
      eventSource.addEventListener("remove-peer", removePeer, false);
      eventSource.addEventListener(
        "session-description",
        sessionDescription,
        false
      );
      eventSource.addEventListener("ice-candidate", iceCandidate, false);
      eventSource.addEventListener("connected", handleJoin);
      eventSource.addEventListener("finish-round", handleFinishRound, false);

      return () => {
        eventSource.close();
      };
    }
    //eslint-disable-next-line
  }, [token]);

  const broadcast = useCallback(
    (data: string) => {
      const channels = userPeerData.current.channels;
      for (const peerId in channels) {
        channels[peerId].readyState === "open" && channels[peerId].send(data);
      }
      fetch(`${ServerURL}/updateEvent/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: data,
      });
    },
    [id, token]
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
