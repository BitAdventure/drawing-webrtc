import { ConnectionState, EventStatuses, RoundStatuses } from "./enums";

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

export type GameInfoType = {
  id: string;
  drawTime: number;
  hints: boolean;
  totalRounds: number | null;
  categories: Array<string>;
};

export type WordType = {
  id: string;
  label: string;
};

export type PlayerType = {
  id: string;
  name: string;
  index: number;
  avatarId: number | null;
  result: number | null;
};

export type PlayerResultType = PlayerType & {
  rank: number;
};

export type RoundResults = Array<
  PlayerType & {
    roundResult: number;
  }
>;

export type AnswerResultType = "correct" | "wrong" | null;

export type RoundType = {
  id: string;
  index: number;
  status: RoundStatuses;
  startTime: number | null;
  word: WordType | null;
  drawer: PlayerType;
  messages: Array<MessageType>;
  lines: Array<LineType>;
  drawAreaSize: string;
  correctAnswers: Array<CorrectAnswerType>;
  wordsForDraw: Array<WordType>;
  wordChoiceStartTime: number | null;
  hints: Array<number>;
};

export type TeamType = {
  id: string;
  name: string;
  players: Array<PlayerType>;
};

export type EventInfoType = {
  id: string;
  status: EventStatuses;
  team: TeamType;
  code: string;
  gameLink: string;
  gameInformation: GameInfoType;
  isStarted: boolean;
};

export type MessageType = {
  id: string;
  createdAt: string;
  text: string;
  type: "DEFAULT" | "LIKE" | "DISLIKE";
  player: {
    id: string;
    name: string;
  };
  roundId: string;
};

export type LineType = {
  id: string;
  createdAt: string;
  thickness: number;
  color: string;
  tool: string;
  points: Array<number>;
  roundId: string;
};

export type CorrectAnswerType = {
  playerId: string;
  guessedAt: string;
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
  handleUpdateEventInfo: (event: any) => void;
  handleUpdateCurrentRound: (event: any) => void;
  handleUpdatePartialRound: (event: any) => void;
  handleUpdateRoundResults: (event: any) => void;
  // handleStartRound: (event: any) => void;
  // handleFinishRound: (event: any) => void;
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
