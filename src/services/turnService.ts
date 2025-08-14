import { Config } from "./config";

export interface IceServer {
  urls: string[];
  username?: string;
  credential?: string;
}

export interface TurnCredentialsResponse {
  iceServers: IceServer[];
}

export async function fetchTurnCredentials(): Promise<RTCConfiguration> {
  try {
    const response = await fetch(
      `${Config.SOCKET_IO_SERVER_URL}/api/turn-credentials`
    );

    if (!response.ok) {
      throw new Error(
        `Failed to fetch TURN credentials: ${response.statusText}`
      );
    }

    const data: TurnCredentialsResponse = await response.json();

    return {
      iceServers: data.iceServers,
      iceCandidatePoolSize: 10,
    };
  } catch (error) {
    console.error(
      "Error fetching TURN credentials, using fallback configuration:",
      error
    );

    return {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
      iceCandidatePoolSize: 10,
    };
  }
}
