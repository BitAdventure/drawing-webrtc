import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { initializeRedisClient, redisOptions } from "./redisClient.js";
import cors from "cors";
import { RoundStatuses, ClientStatuses } from "./enums.js";
import { Job, Queue, Worker } from "bullmq";
import { EventData, TimersMap } from "./types.js";

const DRAW_TIME = 75;
// const RECONNECT_GRACE_PERIOD = 30000;
const HEARTBEAT_INTERVAL = 10000;
const PEER_TIMEOUT = 60000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));

const server = http.createServer(app);
const clients: any = {};
const serverState: {
  [key: string]: EventData;
} = {};
const timers: TimersMap = {};
const clientIntervals: TimersMap = {};
// const disconnectionTimers: TimersMap = {};
const pendingIceCandidates: { [key: string]: Array<any> } = {};

const redisClient = await initializeRedisClient();
const pubSubRedisClient = await initializeRedisClient();

async function updatePeerPresence(
  clientId: string,
  isActive: boolean = true
): Promise<void> {
  try {
    const key = `peer:presence:${clientId}`;
    if (isActive) {
      await redisClient.set(key, Date.now().toString(), { EX: 120 });
    } else {
      await redisClient.del(key);
    }
  } catch (error: any) {
    console.error(`Error updating peer presence: ${error.message}`);
  }
}

async function isPeerAvailable(peerId: string): Promise<boolean> {
  try {
    const key = `peer:presence:${peerId}`;
    const timestamp = await redisClient.get(key);
    if (!timestamp) return false;

    const lastSeen = parseInt(timestamp);
    return Date.now() - lastSeen < PEER_TIMEOUT;
  } catch (error: any) {
    console.error(`Error checking peer availability: ${error.message}`);
    return false;
  }
}

async function markClientStatus(
  client: any,
  status: ClientStatuses
): Promise<void> {
  try {
    const key = `client:status:${client.id}`;
    await redisClient.set(key, status);
    await updatePeerPresence(client.id, status === ClientStatuses.CONNECTED);
  } catch (error: any) {
    console.error(`Error marking client as ${status}: ${error.message}`);
  }
}

async function isClientConnected(clientId: string): Promise<boolean> {
  try {
    const key = `client:status:${clientId}`;
    const status = await redisClient.get(key);
    return status === "connected";
  } catch (error: any) {
    console.error(`Error checking client connection status: ${error.message}`);
    return false;
  }
}

async function storeIceCandidate(peerId: string, data: any): Promise<void> {
  try {
    if (!pendingIceCandidates[peerId]) {
      pendingIceCandidates[peerId] = [];
    }
    pendingIceCandidates[peerId].push(data);

    const key = `pending:ice:${peerId}`;
    await redisClient.rPush(key, JSON.stringify(data));
    await redisClient.expire(key, 300);
  } catch (error: any) {
    console.error(`Error storing ICE candidate: ${error.message}`);
  }
}

async function getPendingIceCandidates(peerId: string): Promise<any[]> {
  try {
    const key = `pending:ice:${peerId}`;
    const candidates = await redisClient.lRange(key, 0, -1);
    await redisClient.del(key);

    return candidates.map((candidate) => JSON.parse(candidate));
  } catch (error: any) {
    console.error(`Error getting pending ICE candidates: ${error.message}`);
    return [];
  }
}

async function disconnected(client: any): Promise<void> {
  console.log(`Client ${client.id} disconnected - starting grace period`);

  if (clientIntervals[client.id]) {
    clearInterval(clientIntervals[client.id]);
    delete clientIntervals[client.id];
  }

  await markClientStatus(client, ClientStatuses.DISCONNECTED);

  console.log(
    `Grace period ended for client ${client.id} - cleaning up resources`
  );

  delete clients[client.id];

  try {
    await redisClient.del(`messages:${client.id}`);

    const eventIds = await redisClient.sMembers(`${client.id}:channels`);
    await redisClient.del(`${client.id}:channels`);

    await Promise.all(
      eventIds.map(async (eventId: string) => {
        await redisClient.sRem(`channels:${eventId}`, client.id);
        const peerIds = await redisClient.sMembers(`channels:${eventId}`);

        const msg = JSON.stringify({
          event: "remove-peer",
          data: {
            peer: client.user,
            eventId,
          },
        });

        await Promise.all(
          peerIds.map(async (peerId: string) => {
            if (peerId !== client.id && (await isPeerAvailable(peerId))) {
              await redisClient.publish(`messages:${peerId}`, msg);
            }
          })
        );
      })
    );

    await redisClient.del(`client:status:${client.id}`);
    await redisClient.del(`peer:presence:${client.id}`);
  } catch (error: any) {
    console.error(`Error during client cleanup: ${error.message}`);
  }
}

// async function disconnected(client: any): Promise<void> {
//   console.log(`Client ${client.id} disconnected - starting grace period`);

//   if (clientIntervals[client.id]) {
//     clearInterval(clientIntervals[client.id]);
//     delete clientIntervals[client.id];
//   }

//   if (disconnectionTimers[client.id]) {
//     clearTimeout(disconnectionTimers[client.id]);
//   }

//   await markClientStatus(client, ClientStatuses.DISCONNECTED);

//   disconnectionTimers[client.id] = setTimeout(async () => {
//     console.log(
//       `Grace period ended for client ${client.id} - cleaning up resources`
//     );

//     delete clients[client.id];
//     delete disconnectionTimers[client.id];

//     try {
//       await redisClient.del(`messages:${client.id}`);

//       const eventIds = await redisClient.sMembers(`${client.id}:channels`);
//       await redisClient.del(`${client.id}:channels`);

//       await Promise.all(
//         eventIds.map(async (eventId: string) => {
//           await redisClient.sRem(`channels:${eventId}`, client.id);
//           const peerIds = await redisClient.sMembers(`channels:${eventId}`);

//           const msg = JSON.stringify({
//             event: "remove-peer",
//             data: {
//               peer: client.user,
//               eventId,
//             },
//           });

//           await Promise.all(
//             peerIds.map(async (peerId: string) => {
//               if (peerId !== client.id && (await isPeerAvailable(peerId))) {
//                 await redisClient.publish(`messages:${peerId}`, msg);
//               }
//             })
//           );
//         })
//       );

//       await redisClient.del(`client:status:${client.id}`);
//       await redisClient.del(`peer:presence:${client.id}`);
//     } catch (error: any) {
//       console.error(`Error during client cleanup: ${error.message}`);
//     }
//   }, RECONNECT_GRACE_PERIOD);
// }

function auth(req: any, res: any, next: any): void {
  let token: string | undefined;
  if (req.headers.authorization) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (typeof token !== "string") {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.TOKEN_SECRET || "", (err: any, user: any) => {
    if (err) {
      return res.sendStatus(403);
    }
    req.user = {
      ...user,
      id: token,
    };
    next();
  });
}

app.post("/access", (req: any, res: any) => {
  if (!req.body.id) {
    return res.sendStatus(403);
  }
  const user = {
    staticId: req.body.id,
    createdAt: new Date().toISOString(),
  };

  const token = jwt.sign(user, process.env.TOKEN_SECRET || "", {
    expiresIn: "5 hours",
    // expiresIn: "20 days",
  });

  return res.json({ token });
});

app.get("/connect", auth, async (req: any, res: any) => {
  const { eventId } = req.query;

  if (req.headers.accept !== "text/event-stream") {
    return res.sendStatus(404);
  }

  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const client = {
    id: req.user.id,
    eventId,
    user: req.user,
    redis: pubSubRedisClient,
    emit: (event: string, data: any) => {
      res.write(`id: ${uuidv4()}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
  };

  console.log(`Client ${client.id} connected`);

  clients[client.id] = client;
  await markClientStatus(client, ClientStatuses.CONNECTED);

  client.redis.subscribe(
    [`messages:${client.id}`, `messages:${eventId}`],
    (msg: any) => {
      try {
        const { event, data } = JSON.parse(msg);
        client.emit(event, data);
      } catch (error: any) {
        console.error(`Error handling message: ${error.message}`);
      }
    }
  );

  client.emit("connected", { user: req.user });

  const heartbeatInterval = setInterval(() => {
    try {
      client.emit("ping", { timestamp: Date.now() });
      updatePeerPresence(client.id);
    } catch (error: any) {
      console.error(`Error sending heartbeat: ${error.message}`);
    }
  }, HEARTBEAT_INTERVAL);

  clientIntervals[client.id] = heartbeatInterval;

  req.on("close", () => {
    disconnected(client);
  });
});

// app.get("/connect", auth, async (req: any, res: any) => {
//   const { eventId } = req.query;

//   if (req.headers.accept !== "text/event-stream") {
//     return res.sendStatus(404);
//   }

//   res.setHeader("Cache-Control", "no-cache");
//   res.setHeader("Content-Type", "text/event-stream");
//   res.setHeader("Access-Control-Allow-Origin", "*");
//   res.flushHeaders();

//   const client = {
//     id: req.user.id,
//     eventId,
//     user: req.user,
//     redis: pubSubRedisClient,
//     emit: (event: string, data: any) => {
//       res.write(`id: ${uuidv4()}\n`);
//       res.write(`event: ${event}\n`);
//       res.write(`data: ${JSON.stringify(data)}\n\n`);
//     },
//   };

//   console.log(`Client ${client.id} connected`);

//   if (disconnectionTimers[client.id]) {
//     clearTimeout(disconnectionTimers[client.id]);
//     delete disconnectionTimers[client.id];
//     console.log(`Client ${client.id} reconnected within grace period`);
//   }

//   clients[client.id] = client;
//   await markClientStatus(client, ClientStatuses.CONNECTED);

//   client.redis.subscribe(
//     [`messages:${client.id}`, `messages:${eventId}`],
//     (msg: any) => {
//       try {
//         const { event, data } = JSON.parse(msg);
//         client.emit(event, data);
//       } catch (error: any) {
//         console.error(`Error handling message: ${error.message}`);
//       }
//     }
//   );

//   client.emit("connected", { user: req.user });

//   const heartbeatInterval = setInterval(() => {
//     try {
//       client.emit("ping", { timestamp: Date.now() });
//       updatePeerPresence(client.id);
//     } catch (error: any) {
//       console.error(`Error sending heartbeat: ${error.message}`);
//     }
//   }, HEARTBEAT_INTERVAL);

//   clientIntervals[client.id] = heartbeatInterval;

//   req.on("close", () => {
//     disconnected(client);
//   });
// });

const processJoin = async (job: Job): Promise<any> => {
  try {
    const { user, eventId } = job.data;

    if (!serverState[eventId]) {
      serverState[eventId] = {
        id: eventId,
        roundInfo: {
          id: "1",
          index: 1,
          status: RoundStatuses.UPCOMING,
          startTime: 0,
          word: null,
          drawerId: user.staticId,
          lines: [],
        },
      };
    }

    await redisClient.sAdd(`${user.id}:channels`, eventId);

    const peerIds = await redisClient.sMembers(`channels:${eventId}`);
    console.log(
      `PEER IDS FOR USER ${user.id}, EVENT ${eventId}: ${JSON.stringify(peerIds)}`
    );

    for (const peerId of peerIds) {
      if (user.id !== peerId && (await isPeerAvailable(peerId))) {
        await redisClient.publish(
          `messages:${peerId}`,
          JSON.stringify({
            event: "add-peer",
            data: {
              peer: user,
              eventId,
              offer: false,
            },
          })
        );

        await redisClient.publish(
          `messages:${user.id}`,
          JSON.stringify({
            event: "add-peer",
            data: {
              peer: { id: peerId },
              eventId,
              offer: true,
            },
          })
        );
      }
    }

    await redisClient.sAdd(`channels:${eventId}`, user.id);

    const pendingCandidates = await getPendingIceCandidates(user.id);
    if (pendingCandidates.length > 0) {
      for (const candidateData of pendingCandidates) {
        await redisClient.publish(
          `messages:${user.id}`,
          JSON.stringify({
            event: "ice-candidate",
            data: candidateData,
          })
        );
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error(`Error processing join: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const workers: { [key: string]: Worker } = {};

function getOrCreateWorker(eventId: string): Worker {
  if (!workers[eventId]) {
    workers[eventId] = new Worker(eventId, processJoin, {
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

      const clientId = job.data.user.id;
      if (clients[clientId]) {
        clients[clientId].emit("join-completed", serverState[job.data.eventId]);
      }
    });

    workers[eventId].on("error", (err: Error) => {
      console.error(`WORKER ERROR for event ${eventId}: ${err.message}`);
    });
  }

  return workers[eventId];
}

app.post("/:eventId/join", auth, async (req: any, res: any) => {
  try {
    const eventId = req.params.eventId;
    const user = req.user;

    const queue = new Queue(eventId, {
      connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
    });

    getOrCreateWorker(eventId);

    await queue.add(
      "joinJob",
      { user, eventId },
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

    return res.sendStatus(200);
  } catch (error: any) {
    console.error(`Error adding join job: ${error.message}`);
    return res.status(500).json({ error: "Failed to join" });
  }
});

app.post("/relay/:peerId/:event", auth, async (req: any, res: any) => {
  try {
    const peerId = req.params.peerId;
    const event = req.params.event;

    if (!(await isPeerAvailable(peerId))) {
      if (event === "ice-candidate") {
        await storeIceCandidate(peerId, {
          peer: req.user,
          data: req.body,
        });
        return res.sendStatus(200);
      }
      return res.status(404).json({ error: "Peer not available" });
    }

    const msg = {
      event,
      data: {
        peer: req.user,
        data: req.body,
      },
    };

    await redisClient.publish(`messages:${peerId}`, JSON.stringify(msg));
    return res.sendStatus(200);
  } catch (error: any) {
    console.error(`Error relaying message: ${error.message}`);
    return res.status(500).json({ error: "Failed to relay message" });
  }
});

app.post("/updateEvent/:eventId", auth, async (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const { event: eventType, data } = req.body;
    console.log("UPDATE EVENT REQ: ", req.body);

    switch (eventType) {
      case "start-round":
        serverState[eventId] = serverState[eventId] || {
          id: eventId,
          roundInfo: {
            id: "1",
            index: 1,
            status: RoundStatuses.UPCOMING,
            startTime: 0,
            word: null,
            drawerId: req.user.id,
            lines: [],
          },
        };

        serverState[eventId].roundInfo = {
          ...serverState[eventId].roundInfo,
          startTime: data.startTime,
          status: RoundStatuses.ONGOING,
          word: {
            label: "Example",
            id: "example",
          },
        };

        timers[eventId] && clearTimeout(timers[eventId]);

        timers[eventId] = setTimeout(
          async () => {
            console.log(
              `FINISH ROUND FOR EVENT ${eventId}, START TIME: ${new Date(data.startTime).getTime()}, ENDTIME: ${new Date().getTime()}`
            );
            if (serverState[eventId]) {
              serverState[eventId].roundInfo.status = RoundStatuses.SHOW_RESULT;

              const msg = {
                event: "finish-round",
                data: { eventId },
              };

              await redisClient.publish(
                `messages:${eventId}`,
                JSON.stringify(msg)
              );

              delete timers[eventId];
              delete serverState[eventId];
            }
          },
          data.startTime + DRAW_TIME * 1000 - new Date().getTime()
        );
        break;
      case "lines":
        if (serverState[eventId]) serverState[eventId].roundInfo.lines = data;
        break;
    }

    return res.sendStatus(200);
  } catch (error: any) {
    console.error(`Error updating event: ${error.message}`);
    return res.status(500).json({ error: "Failed to update event" });
  }
});

app.get("*", (_, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

async function cleanup(): Promise<void> {
  console.log("Cleaning up resources before shutdown...");

  try {
    for (const intervalId of Object.values(clientIntervals)) {
      clearInterval(intervalId);
    }

    // for (const timerId of Object.values(disconnectionTimers)) {
    //   clearTimeout(timerId);
    // }

    for (const timerId of Object.values(timers)) {
      clearTimeout(timerId);
    }

    for (const worker of Object.values(workers)) {
      await worker.close();
    }

    await redisClient.quit();
    await pubSubRedisClient.quit();

    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });
  } catch (err: any) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
