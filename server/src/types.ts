import { Server, Socket } from "socket.io";
import { EventStatuses, RoundStatuses } from "./enums.js";
import { type RedisClient } from "./redisClient.js";

export type RoundInfo = {
  id: string;
  index: number;
  status: RoundStatuses;
  startTime: number;
  word: Word | null;
  drawerId: string;
  lines: Array<any>;
};

export type EventData = {
  id: string;
  roundInfo: RoundInfo;
};

export type Word = {
  id: string;
  label: string;
};

export type Player = {
  id: string;
  name: string;
  index: number;
  avatarId: number | null;
  result: number | null;
};

export type RoundResults = Array<
  Player & {
    roundResult: number;
  }
>;

export type Team = {
  id: string;
  name: string;
  players: Array<Player>;
  rounds: Array<Round>;
};

export type Message = {
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

export type Line = {
  id: string;
  createdAt: string;
  thickness: number;
  color: string;
  tool: string;
  points: Array<number>;
  roundId: string;
};

export type Round = {
  id: string;
  index: number;
  status: RoundStatuses;
  startTime: number | null;
  word: Word | null;
  drawer: Player;
  messages: Array<Message>;
  lines: Array<Line>;
  drawAreaSize: string;
  correctAnswers: Array<{
    playerId: string;
    guessedAt: string;
  }>;
  wordsForDraw: Array<Word>;
  wordChoiceStartTime: number | null;
  hints: Array<number>;
};

export type GameInformation = {
  id: string;
  drawTime: number;
  hints: boolean;
  totalRounds: number;
  categories: Array<{
    category: {
      id: string;
      categoryWords: Array<{
        word: {
          id: string;
          label: string;
        };
      }>;
    };
  }>;
};

export type Event = {
  id: string;
  status: EventStatuses;
  teams: Array<Team>;
  codes: Array<{ code: string }>;
  gameInformationSketchWars: GameInformation;
};

export type RegisterHandlersProps = {
  io: Server;
  socket: Socket;
  redisClient: RedisClient;
  timersMap: TimersMap;
  serverState: ServerState;
};

export type StartRoundUpdates = {
  word: Word;
  startTime: number;
  status: RoundStatuses;
};

export type HandleStartRoundArgs = RegisterHandlersProps & {
  eventId: string;
  roundId: string;
  updates: StartRoundUpdates;
};

export type TimersMap = { [key: string]: NodeJS.Timeout };
export type ServerState = { [key: string]: Event };
