import { getEventInfo } from "./api.js";
import {
  AUTO_PICK_WORD_PREFIX,
  createEventInitialState,
  handleProcessRoundResults,
  handleStartRound,
  validateToken,
} from "./utils.js";
import { Event, Line, Message, RegisterHandlersProps, Round, Team, Word } from "./types.js";
import { RoundStatuses } from "./enums.js";

const registerHandlers = async ({ io, socket, redisClient, timersMap, serverState }: RegisterHandlersProps) => {
  const { accessToken, eventId, playerId } = socket.handshake.auth;

  if (!validateToken(accessToken)) return socket.disconnect();

  const redisEventData: Event | null = await redisClient.get(eventId).then((data) => data && JSON.parse(data));

  if (!serverState[eventId]) {
    if (redisEventData) {
      serverState[eventId] = redisEventData;
    } else {
      try {
        const hasuraEventInfo = await getEventInfo(eventId);
        if (hasuraEventInfo.teams[0].players[0].id === playerId) {
          const event = createEventInitialState({ io, socket, redisClient, serverState, timersMap, hasuraEventInfo });

          await redisClient.set(eventId, JSON.stringify(event));
          serverState[eventId] = event;
        }
      } catch (e: any) {
        return socket.disconnect();
      }
    }
  }

  socket.join(eventId);

  // send event data message to this connection
  console.log("ON CONNECTION", new Date().getSeconds());

  io.to(eventId).emit("event-data", serverState[eventId]);

  socket.on("update-drawarea", async ({ roundId, drawAreaSize }: { roundId: string; drawAreaSize: string }) => {
    if (serverState[eventId]) {
      serverState[eventId].teams = serverState[eventId].teams.map((team: Team) => ({
        ...team,
        rounds: team.rounds.map((round) =>
          round.id === roundId
            ? {
                ...round,
                drawAreaSize,
              }
            : round,
        ),
      }));

      console.log("UPDATE DRAW AREA", new Date().getSeconds());
      io.to(eventId).emit("update-partial-current-round", { drawAreaSize });
    }
  });

  socket.on(
    "start-round",
    ({ roundId, updates }: { roundId: string; updates: { word: Word; startTime: number; status: RoundStatuses } }) => {
      clearTimeout(timersMap[`${AUTO_PICK_WORD_PREFIX}${roundId}`]);
      handleStartRound({ io, socket, redisClient, serverState, timersMap, eventId, roundId, updates });
    },
  );

  // Handle socket events here
  socket.on("update-lines", ({ roundId, lines }: { roundId: string; lines: Array<Line> }) => {
    if (serverState[eventId]) {
      serverState[eventId].teams = serverState[eventId].teams.map((team) => ({
        ...team,
        rounds: team.rounds.map((round) =>
          round.id === roundId
            ? {
                ...round,
                lines,
              }
            : round,
        ),
      }));
      console.log("UPDATE LINES", new Date().getSeconds());
      socket.to(eventId).emit("update-lines", { lines });
    }
  });

  socket.on("new-message", (message: Message) => {
    if (serverState[eventId]) {
      let currRound: Round | null = null;
      const currentTeam = serverState[eventId].teams.find((team) =>
        team.rounds.find((round) => {
          if (round.id === message.roundId) {
            currRound = { ...round } as Round;
            return true;
          }
          return false;
        }),
      );

      if (currentTeam && currRound) {
        (currRound as Round).messages.push(message);

        let isNeedToProcessRoundResults: boolean = false;
        if (message.type === "DEFAULT") {
          const isUserGuessTheWord =
            (currRound as Round).word?.label.toLowerCase().trim() === message.text.toLowerCase().trim();

          isUserGuessTheWord &&
            !(currRound as Round).correctAnswers.find((answer) => answer.playerId === message.player.id) &&
            (currRound as Round).correctAnswers.push({
              playerId: message.player.id,
              guessedAt: message.createdAt,
            });

          if ((currRound as Round).correctAnswers.length === currentTeam.players.length - 1) {
            isNeedToProcessRoundResults = true;
          }
        }

        serverState[eventId].teams = serverState[eventId].teams.map((team) =>
          team.id === currentTeam.id
            ? {
                ...team,
                rounds: team.rounds.map((round) =>
                  round.id === (currRound as Round).id
                    ? {
                        ...(currRound as Round),
                      }
                    : round,
                ),
              }
            : team,
        );
        console.log("UPDATE MESSAGES", new Date().getSeconds());
        io.to(eventId).emit("update-partial-current-round", {
          messages: (currRound as Round).messages,
          correctAnswers: (currRound as Round).correctAnswers,
        });

        if (isNeedToProcessRoundResults) {
          clearTimeout(timersMap[message.roundId]);

          handleProcessRoundResults({
            io,
            socket,
            redisClient,
            serverState,
            timersMap,
            eventId,
            roundId: message.roundId,
            isLastRound: (currRound as Round).index === currentTeam.rounds.length - 1,
          });
        }
      }
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("A user disconnected: ", reason, playerId);
  });
};

export default registerHandlers;
