import { ConnectionState, RoundStatuses } from "./enums";

export type EventData = {
  id: string;
  roundInfo: RoundType;
};

export type UserData = {
  id: string; // it's token, used for all keys in redis subscription and server state
  staticId: string; // statis hasura player id
  createdAt: string;
  // Add other user properties as needed
};
export type UserPeerData = {
  peers: { [key: string]: RTCPeerConnection };
  channels: { [key: string]: RTCDataChannel };
  connectionState: { [key: string]: ConnectionState };
  reconnectAttempts: { [key: string]: number };
};

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

// connection.types.ts

export interface ConnectionConfig {
  reconnectTimeout: number;
  iceGatheringTimeout: number;
  maxReconnectAttempts: number;
  rtcConfig: RTCConfiguration;
}

export interface EventSourceHandlers {
  addPeer: (event: any) => void;
  removePeer: (event: any) => void;
  sessionDescription: (event: any) => void;
  iceCandidate: (event: any) => void;
  handleJoin: (event: any) => void;
  handleCompleteJoin: (event: any) => void;
  handleStartRound: (event: any) => void;
  handleFinishRound: (event: any) => void;
  handleEventSourceError: (error: any) => void;
}

export interface WebRTCHandlers {
  onPeerData: (peerId: string, data: any) => void;
  updatePeerConnectionState: (peerId: string, state: ConnectionState) => void;
  createOffer: (peerId: string, peer: RTCPeerConnection) => Promise<void>;
  handlePeerDisconnect: (peerId: string) => void;
  setupPeerConnectionListeners: (
    peer: RTCPeerConnection,
    peerId: string
  ) => void;
  setupDataChannelListeners: (channel: RTCDataChannel, peerId: string) => void;
}

export interface RelayFunction {
  (peerId: string, event: string, data: any): Promise<void>;
}
