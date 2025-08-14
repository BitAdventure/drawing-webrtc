// Config import removed - now using dynamic TURN credentials

export const MAX_ROUNDS = 8;
export const RECONNECT_TIMEOUT = 5000;
export const ICE_GATHERING_TIMEOUT = 10000;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const HEARTBEAT_INTERVAL = 10000;
export const RECREATE_OFFER_TIMEOUT = 1000;

// Fallback RTC configuration (no longer used - kept for reference)
// WebRTC now uses dynamic TURN credentials from server API
export const FALLBACK_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
  iceCandidatePoolSize: 10,
};
