import { v4 as uuidv4 } from "uuid";
import { EventStatuses, RoundStatuses } from "./enums.js";
import {
  Event,
  HandleStartRoundArgs,
  Message,
  Player,
  RegisterHandlersProps,
  Round,
  RoundResults,
  ServerState,
  TimersMap,
  Word,
} from "./types.js";
import { processingRoundResults, updateEvent } from "./api.js";
import { Server, Socket } from "socket.io";
import { type RedisClient } from "./redisClient.js";

export const AUTO_PICK_WORD_PREFIX = "word-auto-pick_";
export const WORD_HINT_PREFIX = "word-hint_";

function shuffleArray<T>(array: Array<T>): Array<T> {
  return array
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value);
}

export const createEventInitialState = ({
  io,
  socket,
  redisClient,
  serverState,
  timersMap,
  hasuraEventInfo,
}: RegisterHandlersProps & { hasuraEventInfo: any }): Event => {
  const { id: eventId, gameInformationSketchWars, teams: hasuraTeams } = hasuraEventInfo;
  const totalRounds = gameInformationSketchWars.totalRounds;

  const allWordsForDraw = shuffleArray(
    gameInformationSketchWars.categories.reduce(
      (result: Array<Word>, currentCategory: any) => [
        ...result,
        ...currentCategory.category.categoryWords.map((categoryWord: any) => categoryWord.word),
      ],
      [],
    ),
  );

  const teams = hasuraTeams.map((team: any) => {
    const shuffledPlayers = shuffleArray(team.players);

    const rounds = new Array(totalRounds).fill(null).map((_, index) => ({
      id: uuidv4(),
      index,
      status: RoundStatuses.UPCOMING,
      startTime: null,
      eventId,
      teamId: team.id,
      drawer: shuffledPlayers[index % shuffledPlayers.length],
      word: null,
      lines: [],
      messages: [],
      drawAreaSize: "0, 0",
      correctAnswers: [],
      wordsForDraw: allWordsForDraw.slice(index * 3, index * 3 + 3),
      wordChoiceStartTime: index === 0 ? new Date().getTime() + 2 * 1000 : null,
      hints: [],
    }));

    return {
      ...team,
      rounds,
    };
  });

  const firstRound = teams[0].rounds[0];

  timersMap[`${AUTO_PICK_WORD_PREFIX}${firstRound.id}`] = setTimeout(() => {
    handleStartRound({
      io,
      socket,
      redisClient,
      serverState,
      timersMap,
      eventId,
      roundId: firstRound.id,
      updates: {
        word: firstRound.wordsForDraw[teams[0].players.length % 3],
        startTime: new Date().getTime(),
        status: RoundStatuses.ONGOING,
      },
    });
  }, 17 * 1000); // 15 sec + 2 sec for request

  return {
    ...hasuraEventInfo,
    gameInformationSketchWars: {
      ...hasuraEventInfo.gameInformationSketchWars,
      categories: [], // unnecessary in the game
    },
    teams,
  };
};

export const handleStartRound = ({
  io,
  socket,
  redisClient,
  serverState,
  timersMap,
  eventId,
  roundId,
  updates,
}: HandleStartRoundArgs) => {
  if (serverState[eventId]) {
    let isLastRound: boolean = false;
    let roundData: Round | undefined;

    serverState[eventId].teams = serverState[eventId].teams.map((team) => ({
      ...team,
      rounds: team.rounds.map((round, _, roundsList) => {
        if (round.id === roundId) {
          isLastRound = round.index === roundsList.length - 1;

          roundData = {
            ...round,
            ...updates,
          };

          return roundData;
        }
        return round;
      }),
    }));

    if (serverState[eventId].gameInformationSketchWars.hints) {
      timersMap[`${WORD_HINT_PREFIX}${roundId}`] = setInterval(() => {
        let hints: Array<number> = [];
        serverState[eventId].teams = serverState[eventId].teams.map((team) => ({
          ...team,
          rounds: team.rounds.map((round) => {
            if (round.id === roundId && round.word) {
              hints = [...round.hints];
              const lettersWithoutSpaceIndexes = [];
              for (let i = 0; i < round.word.label.length; i++) {
                if (round.word.label[i] !== " ") {
                  lettersWithoutSpaceIndexes.push(i);
                }
              }
              if (hints.length < lettersWithoutSpaceIndexes.length - 3) {
                const availableIndexes = lettersWithoutSpaceIndexes.filter((index) => !round.hints.includes(index));

                hints.push(availableIndexes[Math.floor(Math.random() * availableIndexes.length)]);

                return {
                  ...round,
                  hints,
                };
              }
              clearInterval(timersMap[`${WORD_HINT_PREFIX}${roundId}`]);
            }
            return round;
          }),
        }));
        io.to(eventId).emit("update-partial-current-round", { hints });
      }, 20 * 1000);
    }

    timersMap[roundId] = setTimeout(
      () =>
        handleProcessRoundResults({
          io,
          socket,
          redisClient,
          serverState,
          eventId,
          roundId,
          isLastRound,
          timersMap,
        }),
      serverState[eventId].gameInformationSketchWars.drawTime * 1000,
    );

    console.log("START ROUND", new Date().getSeconds());

    io.to(eventId).emit("update-current-round", roundData);
  }
};

export const handleProcessRoundResults = async ({
  io,
  socket,
  serverState,
  redisClient,
  timersMap,
  eventId,
  roundId,
  isLastRound,
}: {
  io: Server;
  socket: Socket;
  serverState: ServerState;
  redisClient: RedisClient;
  timersMap: TimersMap;
  eventId: string;
  roundId: string;
  isLastRound: boolean;
}) => {
  clearInterval(timersMap[`${WORD_HINT_PREFIX}${roundId}`]);
  if (serverState[eventId]) {
    let currRound: Round | null = null,
      nextRound: Round | null = null;
    const currentTeam = serverState[eventId].teams.find((team) =>
      team.rounds.find((round, index, roundsList) => {
        if (round.id === roundId) {
          currRound = { ...round };
          nextRound = roundsList[index + 1] || null;
          return true;
        }
        return false;
      }),
    );

    if (currentTeam && currRound) {
      try {
        const updatedPlayers = await processingRoundResults({
          players: currentTeam.players,
          messages: (currRound as Round).messages,
          startTime: (currRound as Round).startTime || 0,
          word: (currRound as Round).word?.label || "",
          drawTime: serverState[eventId].gameInformationSketchWars.drawTime,
          drawerId: (currRound as Round).drawer.id,
        });

        serverState[eventId].teams = serverState[eventId].teams.map((team) =>
          team.id === currentTeam.id
            ? {
                ...team,
                players: updatedPlayers,
                rounds: team.rounds.map((round) =>
                  round.id === (currRound as Round).id
                    ? {
                        ...round,
                        status: RoundStatuses.SHOW_RESULT,
                      }
                    : round,
                ),
              }
            : team,
        );

        console.log("PROCESSING ROUND RESULTS", new Date().getSeconds());

        io.to(eventId).emit("show-result", { roundResults: updatedPlayers });

        setTimeout(async () => {
          serverState[eventId].teams = serverState[eventId].teams.map((team) =>
            team.id === currentTeam.id
              ? {
                  ...team,
                  rounds: team.rounds.map((round) =>
                    round.id === (currRound as Round).id
                      ? {
                          ...round,
                          messages: [], // for optimization. we dont need messages if it's not current round
                          lines: [], // for optimization. we dont need lines if it's not current round
                          status: RoundStatuses.COMPLETED,
                        }
                      : round.id === nextRound?.id
                        ? {
                            ...round,
                            wordChoiceStartTime: new Date().getTime() + 3 * 1000,
                          }
                        : {
                            ...round,
                            messages: [], // for optimization. we dont need messages if it's not current round
                            lines: [], // for optimization. we dont need lines if it's not current round
                          },
                  ),
                }
              : team,
          );

          if (isLastRound) {
            serverState[eventId].status = EventStatuses.COMPLETED;
            await updateEvent({
              eventId,
              updates: { status: EventStatuses.COMPLETED },
            });
          } else if (nextRound) {
            timersMap[`${AUTO_PICK_WORD_PREFIX}${nextRound.id}`] = setTimeout(() => {
              nextRound &&
                handleStartRound({
                  io,
                  socket,
                  redisClient,
                  serverState,
                  timersMap,
                  eventId,
                  roundId: nextRound.id,
                  updates: {
                    word: nextRound.wordsForDraw[(serverState[eventId].teams[0].rounds.length - nextRound.index) % 3],
                    startTime: new Date().getTime(),
                    status: RoundStatuses.ONGOING,
                  },
                });
            }, 17 * 1000); // 15 sec + 2 sec for request
          }

          redisClient.set(eventId, JSON.stringify(serverState[eventId]));
          console.log("ROUND COMPLETED", new Date().getSeconds());
          io.to(eventId).emit("event-data", serverState[eventId]);
        }, 5000);
      } catch (e) {
        console.log(e);
      }
    }
  }
};

export const validateToken = (accessToken: string) => {
  return accessToken;
};

const maxRoundPoints = 1000;
const wrongGuessPenaltyPoints = 50;

export const getCorrectMessage = ({
  messages,
  player,
  word,
}: {
  messages: Array<Message>;
  player: Player;
  word: string;
}) =>
  messages.find(
    (message) =>
      message.type === "DEFAULT" &&
      message.text.toLowerCase().trim() === word.toLowerCase().trim() &&
      message.player.id === player.id,
  );

export const getRoundResults = ({
  players,
  messages,
  startTime,
  drawTime,
  word,
  drawerId,
}: {
  players: Array<Player>;
  messages: Array<Message>;
  startTime: number;
  drawTime: number;
  word: string;
  drawerId: string;
}): RoundResults => {
  const getPlayerResult = (messageTime: string) => {
    return messageTime
      ? Math.ceil(((startTime + drawTime * 1000 - new Date(messageTime).getTime()) / 1000 / drawTime) * maxRoundPoints)
      : 0;
  };

  let drawerIndex = 0;
  let totalTeamPointsWithoutDrawer = 0;
  let isWordGuessed = false;

  const playersWithResults = players.map((player, index) => {
    if (player.id === drawerId) {
      drawerIndex = index;
      return {
        ...player,
        roundResult: 0,
      };
    }

    let isUserAlreadyGuessTheWord = false;

    const roundResult = messages
      .filter((message) => message.player.id === player.id && message.type === "DEFAULT")
      .reduce((sum, curr) => {
        if (curr.text.toLowerCase().trim() === word.toLowerCase().trim() && !isUserAlreadyGuessTheWord) {
          isUserAlreadyGuessTheWord = true;
          isWordGuessed = true;
          return sum + getPlayerResult(curr.createdAt);
        }

        return sum - wrongGuessPenaltyPoints;
      }, 0);

    totalTeamPointsWithoutDrawer += roundResult;

    return {
      ...player,
      roundResult,
    };
  });

  playersWithResults[drawerIndex].roundResult =
    players.length === 2
      ? isWordGuessed
        ? 500
        : totalTeamPointsWithoutDrawer < 0
          ? 0
          : totalTeamPointsWithoutDrawer
      : Math.ceil(totalTeamPointsWithoutDrawer / (players.length - 1));

  return playersWithResults.sort((playerA, playerB) => playerB.roundResult - playerA.roundResult);
};
