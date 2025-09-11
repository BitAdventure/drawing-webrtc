import { ConnectionState } from "@/constants/enums";
import { RelayFunction, UserPeerData, WebRTCHandlers } from "@/constants/types";

export class WebRTCService {
  private userPeerData: React.RefObject<UserPeerData>;
  private iceTimeouts: { [key: string]: ReturnType<typeof setTimeout> };
  private rtcConfig: RTCConfiguration;
  private relay: RelayFunction;
  private handlers: WebRTCHandlers;

  constructor(
    userPeerData: React.RefObject<UserPeerData>,
    iceTimeoutsRef: React.RefObject<{
      [key: string]: ReturnType<typeof setTimeout>;
    }>,
    rtcConfig: RTCConfiguration,
    relay: RelayFunction,
    handlers: WebRTCHandlers
  ) {
    this.userPeerData = userPeerData;
    this.iceTimeouts = iceTimeoutsRef.current || {};
    this.rtcConfig = rtcConfig;
    this.relay = relay;
    this.handlers = handlers;
  }

  public createPeer(
    peerId: string,
    initiator: boolean = false
  ): RTCPeerConnection {
    console.log(`Creating peer for ID: ${peerId}, initiator: ${initiator}`);

    // Close existing peer if present
    if (this.userPeerData.current?.peers[peerId]) {
      this.userPeerData.current.peers[peerId].close();
    }

    const peer = new RTCPeerConnection(this.rtcConfig);

    if (this.userPeerData.current) {
      this.userPeerData.current.peers[peerId] = peer;
      this.userPeerData.current.connectionState[peerId] =
        ConnectionState.CONNECTING;
    }

    // Set up listeners
    this.handlers.setupPeerConnectionListeners(peer, peerId);

    peer.onicecandidate = async (event) => {
      console.log(
        "ICE candidate event, peerId, timestamp: ",
        event,
        peerId,
        new Date().getTime()
      );
      event.candidate &&
        this.relay({ peerId, event: "ice-candidate", data: event.candidate });
    };

    if (initiator) {
      peer.onnegotiationneeded = async () => {
        await this.handlers.createOffer(peerId, peer);
      };

      console.log(`Creating data channel with ${peerId}`);
      const channel = peer.createDataChannel("updates", {
        ordered: true,
      });

      this.handlers.setupDataChannelListeners(channel, peerId);

      channel.onmessage = (event) => {
        this.handlers.onPeerData(peerId, event.data);
      };

      if (this.userPeerData.current)
        this.userPeerData.current.channels[peerId] = channel;
    } else {
      peer.ondatachannel = (event) => {
        console.log("Received data channel:", event, new Date().getTime());
        if (this.userPeerData.current)
          this.userPeerData.current.channels[peerId] = event.channel;

        this.handlers.setupDataChannelListeners(event.channel, peerId);

        event.channel.onmessage = (evt) => {
          this.handlers.onPeerData(peerId, evt.data);
        };
      };
    }

    return peer;
  }

  public async handleSessionDescription(
    peerId: string,
    description: RTCSessionDescriptionInit
  ): Promise<void> {
    let peer = this.userPeerData.current?.peers[peerId];

    // If peer doesn't exist, recreate it
    if (!peer) {
      peer = this.createPeer(peerId, false);
    }

    const remoteDescription = new RTCSessionDescription(description);

    try {
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
          description,
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
        this.relay({
          peerId,
          event: "session-description",
          data: answer,
        });
      }
    } catch (error: any) {
      console.error(
        `Error handling session description (peerId: ${peerId}): `,
        error.message
      );
      this.handlers.updatePeerConnectionState(
        peerId,
        ConnectionState.DISCONNECTED
      );
    }
  }

  public async addIceCandidate(
    peerId: string,
    candidate: RTCIceCandidateInit
  ): Promise<void> {
    const peer = this.userPeerData.current?.peers[peerId];

    if (!peer) {
      console.error(
        `No peer found for ID: ${peerId} during ICE candidate handling`
      );
      return;
    }

    const iceCandidateInit = new RTCIceCandidate(candidate);
    console.log("Adding ICE candidate for peer:", peerId);

    try {
      await peer.addIceCandidate(iceCandidateInit);
    } catch (err: any) {
      console.warn(`Non-critical error adding ICE candidate: ${err.message}`);
    }
  }

  public removePeer(peerId: string): void {
    if (!this.userPeerData.current) return;
    const userPeers = this.userPeerData.current.peers;
    const channels = this.userPeerData.current.channels;

    if (channels[peerId]) {
      channels[peerId].close();
      delete channels[peerId];
    }

    if (userPeers[peerId]) {
      userPeers[peerId].close();
      delete userPeers[peerId];
    }

    delete this.userPeerData.current.connectionState[peerId];
    delete this.userPeerData.current.reconnectAttempts[peerId];

    if (this.iceTimeouts[peerId]) {
      clearTimeout(this.iceTimeouts[peerId]);
      delete this.iceTimeouts[peerId];
    }
  }

  public clearAllPeers(): void {
    if (!this.userPeerData.current) return;
    Object.values(this.userPeerData.current.peers).forEach((peer) => {
      peer.close();
    });

    this.userPeerData.current.peers = {};
    this.userPeerData.current.channels = {};
    this.userPeerData.current.connectionState = {};
    this.userPeerData.current.reconnectAttempts = {};

    Object.values(this.iceTimeouts).forEach((timeout) => {
      clearTimeout(timeout);
    });
  }

  public broadcast(data: string): void {
    const channels = this.userPeerData.current?.channels;

    for (const peerId in channels) {
      if (channels[peerId].readyState === "open") {
        try {
          channels[peerId].send(data);
        } catch (error: any) {
          console.error(
            `Error broadcasting to peer ${peerId}: `,
            error.message
          );
          this.handlers.updatePeerConnectionState(
            peerId,
            ConnectionState.DISCONNECTED
          );
        }
      } else if (
        channels[peerId].readyState === "closed" ||
        channels[peerId].readyState === "closing"
      ) {
        this.handlers.updatePeerConnectionState(
          peerId,
          ConnectionState.DISCONNECTED
        );
      }
    }
  }
}
