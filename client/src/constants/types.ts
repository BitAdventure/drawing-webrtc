import { ConnectionState, RoundStatuses } from "./enums";

export type EventData = {
  id: string;
  roundInfo: RoundType;
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

export type ToolType = "pen" | "eraser";
