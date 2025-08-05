import { Config } from "@/services/config";

export const MAX_ROUNDS = 8;
export const RECONNECT_TIMEOUT = 5000;
export const ICE_GATHERING_TIMEOUT = 10000;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const HEARTBEAT_INTERVAL = 10000;
export const RECREATE_OFFER_TIMEOUT = 1000;

export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    // // Google's public STUN servers
    // { urls: "stun:stun.l.google.com:19302" },
    // { urls: "stun:stun1.l.google.com:19302" },
    // { urls: "stun:stun2.l.google.com:19302" },
    // { urls: "stun:stun3.l.google.com:19302" },
    // { urls: "stun:stun4.l.google.com:19302" },
    // // Twilio's STUN server
    // { urls: "stun:global.stun.twilio.com:3478" },
    // custom freestun server
    { urls: `stun:${Config.TURN_SERVER_IP_ADDRESS}` },
    {
      urls: `turn:${Config.TURN_SERVER_IP_ADDRESS}`,
      username: Config.TURN_SERVER_USERNAME,
      credential: Config.TURN_SERVER_CREDENTIAL,
    },
  ],
  iceCandidatePoolSize: 10, // Add candidate pool for faster connections
};
