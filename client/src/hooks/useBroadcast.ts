import { useCallback } from "react";
import { WebRTCService } from "../services/webrtc";
import { Config } from "@/services/config";

interface UseBroadcastParams {
  webRTCService: WebRTCService | null;
  eventId: string | undefined;
  token: string;
}

interface UseBroadcastReturn {
  broadcast: (data: string) => void;
}

export const useBroadcast = ({ webRTCService, eventId, token }: UseBroadcastParams): UseBroadcastReturn => {
  const broadcast = useCallback(
    (data: string) => {
      // First broadcast to WebRTC peers
      webRTCService?.broadcast(data);

      // Then update server state
      if (eventId && token) {
        try {
          fetch(`${Config.SERVER_URL}/updateEvent/${eventId}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: data,
          }).catch((error) => {
            console.error("Error updating event on server:", error);
          });
        } catch (error) {
          console.error("Error in broadcast:", error);
        }
      }
    },
    [webRTCService, eventId, token]
  );

  return { broadcast };
};
