import { getEventInfo } from "./api.js";
import {
  AUTO_PICK_WORD_PREFIX,
  createEventInitialState,
  handleProcessRoundResults,
  handleStartRound,
  validateToken,
} from "./utils.js";
import {
  Event,
  Line,
  Message,
  RegisterHandlersProps,
  Round,
  Team,
  Word,
} from "./types.js";
import { ClientStatuses, RoundStatuses } from "./enums.js";
import {
  disconnected,
  getPendingIceCandidates,
  isPeerAvailable,
  markClientStatus,
  storeIceCandidate,
} from "./index.js";
import { Job, Queue, Worker } from "bullmq";
import { redisOptions } from "./redisClient.js";

const registerHandlers = async ({
  io,
  socket,
  redisClient,
  timersMap,
  serverState,
  clients,
  workers,
}: RegisterHandlersProps) => {
  const { accessToken, eventId, playerId } = socket.handshake.auth;

  if (!validateToken(accessToken)) return socket.disconnect();

  const client = {
    id: socket.id,
    eventId,
    user: {
      id: socket.id,
      staticId: playerId,
      createdAt: new Date().toISOString(),
    },
  };

  clients[client.id] = client;
  await markClientStatus(client, ClientStatuses.CONNECTED);

  const redisEventData: Event | null = await redisClient
    .get(eventId)
    .then((data) => data && JSON.parse(data));

  if (!serverState[eventId]) {
    if (redisEventData) {
      serverState[eventId] = redisEventData;
    } else {
      try {
        const hasuraEventInfo = await getEventInfo(eventId);
        if (hasuraEventInfo.teams[0].players[0].id === playerId) {
          const event = createEventInitialState({
            io,
            socket,
            redisClient,
            serverState,
            timersMap,
            hasuraEventInfo,
            clients,
            workers,
          });

          await redisClient.set(eventId, JSON.stringify(event));
          serverState[eventId] = event;
        }
      } catch (e: any) {
        return socket.disconnect();
      }
    }
  }

  socket.join(eventId);

  // process peer join
  async function handleJoinPeer(job: Job): Promise<any> {
    try {
      const { user, eventId } = job.data;

      await redisClient.sAdd(`${user.id}:channels`, eventId);

      const peerIds = await redisClient.sMembers(`channels:${eventId}`);
      console.log(
        `PEER IDS FOR USER ${user.id}, EVENT ${eventId}: ${JSON.stringify(peerIds)}`
      );

      for (const peerId of peerIds) {
        if (user.id !== peerId && (await isPeerAvailable(peerId))) {
          io.to(peerId).emit("add-peer", {
            peer: user,
            eventId,
            offer: false,
          });
          io.to(user.id).emit("add-peer", {
            peer: { id: peerId },
            eventId,
            offer: true,
          });
        }
      }

      await redisClient.sAdd(`channels:${eventId}`, user.id);

      const pendingCandidates = await getPendingIceCandidates(user.id);
      if (pendingCandidates.length > 0) {
        for (const candidateData of pendingCandidates) {
          io.to(user.id).emit("ice-candidate", candidateData);
        }
      }
    } catch (error: any) {
      console.error(`Error processing join (${job.data}): ${error.message}`);
    }
  }

  try {
    const queue = new Queue(eventId, {
      connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    });

    if (!workers[eventId]) {
      workers[eventId] = new Worker(eventId, handleJoinPeer, {
        connection: redisOptions,
        limiter: {
          max: 1,
          duration: 1000,
        },
      });

      workers[eventId].on("completed", (job: Job) => {
        console.log(
          `Job for user ${job.data.user.id} successfully completed for event ${job.data.eventId}`
        );

        io.to(eventId).emit("event-data", serverState[eventId]);
      });

      workers[eventId].on("error", (err: Error) => {
        console.error(`WORKER ERROR for event ${eventId}: ${err.message}`);
      });
    }

    await queue.add(
      "joinJob",
      { user: client.user, eventId },
      {
        removeOnComplete: true,
        removeOnFail: 1000,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      }
    );

    console.log(`JOIN COMPLETED FOR ${client.user}`);
  } catch (error: any) {
    console.error(
      `Error adding join job (client: ${client}, event: ${eventId}): ${error.message}`
    );
  }
  // finish peer join

  // Handle socket events here
  socket.on(
    "relay",
    async (payload: { peerId: string; event: string; data: any }) => {
      try {
        const { peerId, event, data } = payload;

        const eventData = {
          peer: client.user,
          data,
        };

        if (!(await isPeerAvailable(peerId))) {
          if (event === "ice-candidate") {
            await storeIceCandidate(peerId, eventData);
            return console.log(
              `SUCCESSFUL ICE CANDIDATE RELAY (peerId: ${peerId}, eventData: ${eventData})`
            );
          }
          return console.log(`Peer not available: ${peerId}`);
        }

        io.to(peerId).emit(event, eventData);
        console.log(
          `SUCCESSFUL RELAY (peerId: ${peerId}, event: ${event}, eventData: ${eventData})`
        );
      } catch (error: any) {
        console.error(
          `Error relaying message (payload: ${payload}): ${error.message}`
        );
      }
    }
  );

  socket.on(
    "update-drawarea",
    ({ roundId, drawAreaSize }: { roundId: string; drawAreaSize: string }) => {
      if (serverState[eventId]) {
        serverState[eventId].teams = serverState[eventId].teams.map(
          (team: Team) => ({
            ...team,
            rounds: team.rounds.map((round) =>
              round.id === roundId
                ? {
                    ...round,
                    drawAreaSize,
                  }
                : round
            ),
          })
        );

        console.log(`UPDATE DRAW AREA FOR EVENT ${eventId}`);
        io.to(eventId).emit("update-partial-current-round", { drawAreaSize });
      }
    }
  );

  socket.on(
    "start-round",
    ({
      roundId,
      updates,
    }: {
      roundId: string;
      updates: { word: Word; startTime: number; status: RoundStatuses };
    }) => {
      // clearTimeout(timersMap[`${AUTO_PICK_WORD_PREFIX}${roundId}`]);
      handleStartRound({
        io,
        socket,
        redisClient,
        serverState,
        timersMap,
        eventId,
        roundId,
        updates,
        clients,
        workers,
      });
    }
  );

  socket.on(
    "update-lines",
    ({ roundId, lines }: { roundId: string; lines: Array<Line> }) => {
      if (serverState[eventId]) {
        serverState[eventId].teams = serverState[eventId].teams.map((team) => ({
          ...team,
          rounds: team.rounds.map((round) =>
            round.id === roundId
              ? {
                  ...round,
                  lines,
                }
              : round
          ),
        }));
        console.log(`UPDATE LINES FOR EVENT ${eventId}`);
      }
    }
  );

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
        })
      );

      if (currentTeam && currRound) {
        (currRound as Round).messages.push(message);

        let isNeedToProcessRoundResults: boolean = false;
        if (message.type === "DEFAULT") {
          const isUserGuessTheWord =
            (currRound as Round).word?.label.toLowerCase().trim() ===
            message.text.toLowerCase().trim();

          isUserGuessTheWord &&
            !(currRound as Round).correctAnswers.find(
              (answer) => answer.playerId === message.player.id
            ) &&
            (currRound as Round).correctAnswers.push({
              playerId: message.player.id,
              guessedAt: message.createdAt,
            });

          if (
            (currRound as Round).correctAnswers.length ===
            currentTeam.players.length - 1
          ) {
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
                    : round
                ),
              }
            : team
        );
        console.log(`UPDATE MESSAGES FOR EVENT ${eventId}`);
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
            isLastRound:
              (currRound as Round).index === currentTeam.rounds.length - 1,
            clients,
            workers,
          });
        }
      }
    }
  });

  socket.on("disconnect", (reason) => {
    disconnected(client);
    console.log(`A user (${playerId}) disconnected: ${reason}`);
  });
};

export default registerHandlers;
