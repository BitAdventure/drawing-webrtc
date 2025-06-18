import { useCallback } from "react";
import { WebRTCService } from "@/services/webrtc";
import { Socket } from "socket.io-client";
import { LineType } from "@/constants/types";

interface UseBroadcastParams {
  webRTCService: WebRTCService | null;
  socket: Socket;
  eventId: string | undefined;
}

interface UseBroadcastReturn {
  broadcast: (data: { roundId: string; lines: Array<LineType> }) => void;
}

export const useBroadcast = ({
  webRTCService,
  socket,
  eventId,
}: UseBroadcastParams): UseBroadcastReturn => {
  const broadcast = useCallback(
    (data: any) => {
      // First broadcast to WebRTC peers
      webRTCService?.broadcast(
        JSON.stringify({
          event: "lines",
          data,
        })
      );

      socket.emit("update-lines", data);
    },
    [webRTCService, eventId, socket]
  );

  return { broadcast };
};
