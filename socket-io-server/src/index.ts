import "./sentry.js";
import "./logger.js";

import http from "http";
import express from "express";
import path from "path";
import * as Sentry from "@sentry/node";
import { Server, Socket } from "socket.io";
import registerHandlers from "./handlers.js";
import { initializeRedisClient } from "./redisClient.js";
import { ServerState, TimersMap, Workers } from "./types.js";
import { ClientStatuses } from "./enums.js";
import { generateTurnCredentials } from "./turnCredentials.js";

const PEER_TIMEOUT = 60000;

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/api/turn-credentials", (req, res) => {
  const turnSecret = process.env.TURN_SECRET || "defaultsecret";
  const turnServerUrl = process.env.TURN_SERVER_IP_ADDRESS || "localhost";
  
  const credentials = generateTurnCredentials(turnSecret, turnServerUrl);
  
  res.json({
    iceServers: [
      {
        urls: credentials.urls,
        username: credentials.username,
        credential: credentials.credential,
      }
    ]
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(process.cwd(), "public", "index.html"));
});

Sentry.setupExpressErrorHandler(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

const clients: any = {};
const workers: Workers = {};
const serverState: ServerState = {};
const timersMap: TimersMap = {};
const pendingIceCandidates: { [key: string]: Array<any> } = {};

const redisClient = await initializeRedisClient();

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
    console.error(
      `Error updating peer presence (clientId: ${clientId}, isActive: ${isActive}): ${error.message}`
    );
  }
}

export async function isPeerAvailable(peerId: string): Promise<boolean> {
  try {
    const key = `peer:presence:${peerId}`;
    const timestamp = await redisClient.get(key);
    if (!timestamp) return false;
    const lastSeen = parseInt(timestamp);
    return Date.now() - lastSeen < PEER_TIMEOUT;
  } catch (error: any) {
    console.error(
      `Error checking peer availability (peerId: ${peerId}): ${error.message}`
    );
    return false;
  }
}

export async function markClientStatus(
  client: any,
  status: ClientStatuses
): Promise<void> {
  try {
    const key = `client:status:${client.id}`;
    await redisClient.set(key, status);
    await updatePeerPresence(client.id, status === ClientStatuses.CONNECTED);
  } catch (error: any) {
    console.error(
      `Error marking client (${client.id}) as ${status}: ${error.message}`
    );
  }
}

export async function storeIceCandidate(
  peerId: string,
  data: any
): Promise<void> {
  try {
    if (!pendingIceCandidates[peerId]) {
      pendingIceCandidates[peerId] = [];
    }
    pendingIceCandidates[peerId].push(data);

    const key = `pending:ice:${peerId}`;
    await redisClient.rPush(key, JSON.stringify(data));
    await redisClient.expire(key, 300);
  } catch (error: any) {
    console.error(
      `Error storing ICE candidate (peerId: ${peerId}, data: ${JSON.parse(JSON.stringify(data))}): ${error.message}`
    );
  }
}

export async function getPendingIceCandidates(peerId: string): Promise<any[]> {
  try {
    const key = `pending:ice:${peerId}`;
    const candidates = await redisClient.lRange(key, 0, -1);
    await redisClient.del(key);

    return candidates.map((candidate) => JSON.parse(candidate));
  } catch (error: any) {
    console.error(
      `Error getting pending ICE candidates (peerId: ${peerId}): ${error.message}`
    );
    return [];
  }
}

export async function disconnected(client: any): Promise<void> {
  console.log(`Client ${client.id} disconnected - starting grace period`);

  await markClientStatus(client, ClientStatuses.DISCONNECTED);

  console.log(
    `Grace period ended for client ${client.id} - cleaning up resources`
  );

  delete clients[client.id];

  try {
    // await redisClient.del(`messages:${client.id}`);

    const eventIds = await redisClient.sMembers(`${client.id}:channels`);
    await redisClient.del(`${client.id}:channels`);

    await Promise.all(
      eventIds.map(async (eventId: string) => {
        console.log(`REMOVE EVENT: event: ${eventId}, clientId: ${client.id}`);
        await redisClient.sRem(`channels:${eventId}`, client.id);
        const peerIds = await redisClient.sMembers(`channels:${eventId}`);
        console.log(
          `PEER IDS AFTER REMOVE: ${JSON.parse(JSON.stringify(peerIds))}`
        );

        peerIds.map(async (peerId: string) => {
          if (peerId !== client.id && (await isPeerAvailable(peerId))) {
            // await redisClient.publish(`messages:${peerId}`, msg);
            console.log(
              `emit remove peer (peerId: ${peerId}, clientId: ${client.id}, eventId: ${eventId})`
            );
            io.to(peerId).emit("remove-peer", {
              peer: client.user,
              eventId,
            });
          }
        });
      })
    );

    await redisClient.del(`client:status:${client.id}`);
    await redisClient.del(`peer:presence:${client.id}`);
  } catch (error: any) {
    console.error(
      `Error during client (${client.id}) cleanup: ${error.message}`
    );
  }
}

const onConnection = async (socket: Socket) => {
  await registerHandlers({
    io,
    socket,
    redisClient,
    timersMap,
    serverState,
    clients,
    workers,
  });
};

io.on("connection", onConnection);

process.on("SIGTERM", cleanup);
process.on("SIGINT", cleanup);

async function cleanup(): Promise<void> {
  console.log("Cleaning up resources before shutdown...");

  try {
    for (const timerId of Object.values(timersMap)) {
      clearTimeout(timerId);
    }

    for (const worker of Object.values(workers)) {
      await worker.close();
    }

    await redisClient.flushAll();
    await redisClient.quit();

    server.close(() => {
      console.log("Server closed successfully");
      process.exit(0);
    });
  } catch (err: any) {
    console.error("Error during cleanup:", err);
    process.exit(1);
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
