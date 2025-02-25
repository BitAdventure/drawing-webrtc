import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
import { initializeRedisClient, redisOptions } from "./redisClient.js";
import cors from "cors";
import { RoundStatuses } from "./enums.js";
import { Job, Queue, Worker } from "bullmq";

const DRAW_TIME = 75;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "static")));

const server = http.createServer(app);
const clients: any = {},
  serverState: any = {},
  timers: any = {};

const redisClient = await initializeRedisClient();
const pubSubRedisClient = await initializeRedisClient();

async function disconnected(client: any) {
  console.log(`Client ${client.id} disconnected`);
  delete clients[client.id];
  await redisClient.del(`messages:${client.id}`);
  await redisClient.del(`messages:${client.eventId}`);

  const eventIds = await redisClient.sMembers(`${client.id}:channels`);
  await redisClient.del(`${client.id}:channels`);

  await Promise.all(
    eventIds.map(async (eventId) => {
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
          if (peerId !== client.id) {
            await redisClient.publish(`messages:${peerId}`, msg);
          }
        })
      );
    })
  );
}

function auth(req: any, res: any, next: any) {
  let token;
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
    req.user = user;
    next();
  });
}

app.post("/access", (req: any, res: any) => {
  if (!req.body.username) {
    return res.sendStatus(403);
  }
  const user = {
    id: uuidv4(),
    username: req.body.username,
  };

  const token = jwt.sign(user, process.env.TOKEN_SECRET || "", {
    expiresIn: "20 days",
    // expiresIn: "3600s",
  });

  return res.json({ token });
});

app.get("/connect", auth, async (req: any, res: any) => {
  const { eventId } = req.query;

  if (req.headers.accept !== "text/event-stream") {
    return res.sendStatus(404);
  }

  // write the event stream headers
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // setup a client
  const client = {
    id: req.user.id,
    eventId,
    user: req.user,
    redis: pubSubRedisClient,
    emit: (event: any, data: any) => {
      res.write(`id: ${uuidv4()}\n`);
      res.write(`event: ${event}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
  };

  // cache the current connection until it disconnects
  console.log(`Client ${client.id} connected`);
  clients[client.id] = client;

  client.redis.subscribe(
    [`messages:${client.id}`, `messages:${eventId}`],
    (msg: any) => {
      const { event, data } = JSON.parse(msg);

      client.emit(event, data);
    }
  );

  // emit the connected state
  client.emit("connected", { user: req.user });

  // ping to the client every so often
  setInterval(() => {
    client.emit("ping", {});
  }, 10000);

  req.on("close", () => {
    disconnected(client);
  });
});

const processJoin = async (job: Job) => {
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
        drawerId: user.id,
        lines: [],
      },
    };
  }

  await redisClient.sAdd(`${user.id}:channels`, eventId);

  const peerIds = await redisClient.sMembers(`channels:${eventId}`);
  console.log(
    `PEER IDS FOR USER ${user.id}, EVENT ${eventId}: ${JSON.stringify(peerIds)}`
  );
  peerIds.forEach((peerId: any) => {
    redisClient.publish(
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
    redisClient.publish(
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
  });

  await redisClient.sAdd(`channels:${eventId}`, user.id);
};

// Create a worker for a specific eventId
function createWorker(eventId: string) {
  const worker = new Worker(eventId, processJoin, {
    connection: redisOptions,
    limiter: {
      max: 1, // Only one job processed at a time
      duration: 1000, // Allow one job every second (optional)
    },
  });

  // Subscribe to the completed event
  worker.on("completed", (job: Job) => {
    console.log(
      `Job for user ${job.data.user.id} successfully completed for event ${job.data.eventId}`
    );
    console.log(`Clients: ${JSON.stringify(clients)}`);
    clients[job.data.user.id].emit(
      "join-completed",
      serverState[job.data.eventId]
    );
    // Add any additional logic you want to execute on completion here
  });

  worker.on("error", (err) => {
    // log the error
    console.error("WORKER ERROR: ", err);
  });

  return worker;
}

app.post("/:eventId/join", auth, async (req: any, res: any) => {
  const eventId = req.params.eventId;
  const user = req.user;

  const queue = new Queue(eventId, {
    connection: { url: process.env.REDIS_URL || "redis://localhost:6379" },
  });

  // Create a worker to process jobs in this queue
  createWorker(eventId);

  // Add a job to the event-specific queue
  await queue.add("joinJob", { user, eventId });

  return res.sendStatus(200);
});

app.post("/relay/:peerId/:event", auth, async (req: any, res: any) => {
  const peerId = req.params.peerId;
  const msg = {
    event: req.params.event,
    data: {
      peer: req.user,
      data: req.body,
    },
  };
  await redisClient.publish(`messages:${peerId}`, JSON.stringify(msg));
  return res.sendStatus(200);
});

app.post("/updateEvent/:eventId", auth, (req: any, res: any) => {
  try {
    const { eventId } = req.params;
    const { event: eventType, data } = req.body;

    switch (eventType) {
      case "start-round":
        serverState[eventId].roundInfo = {
          ...serverState[eventId].roundInfo,
          startTime: data.startTime,
          status: RoundStatuses.ONGOING,
          word: {
            label: "Example",
            id: "example",
          },
        };

        timers[eventId] = setTimeout(
          () => {
            serverState[eventId].roundInfo.status = RoundStatuses.SHOW_RESULT;

            const msg = {
              event: "finish-round",
              data: { eventId },
            };
            redisClient.publish(`messages:${eventId}`, JSON.stringify(msg));
            delete timers[eventId];
            delete serverState[eventId];
          },
          data.startTime + DRAW_TIME * 1000 - new Date().getTime()
        );
        break;
      case "lines":
        if (serverState[eventId]) serverState[eventId].roundInfo.lines = data;
        break;
    }
  } catch {
    return res.sendStatus(500);
  }

  return res.sendStatus(200);
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "static", "index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
