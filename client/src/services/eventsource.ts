import { ServerURL } from "../constants/constants";
import { EventSourceHandlers } from "../constants/types";

export class EventSourceService {
  private eventSourceRef: React.RefObject<EventSource | null>;
  private handlers: EventSourceHandlers;
  private token: string;
  private eventId: string;

  constructor(
    eventSourceRef: React.RefObject<EventSource | null>,
    handlers: EventSourceHandlers,
    token: string,
    eventId: string
  ) {
    this.eventSourceRef = eventSourceRef;
    this.handlers = handlers;
    this.token = token;
    this.eventId = eventId;
  }

  public setup(): () => void {
    if (!this.token || !this.eventId) {
      return () => {};
    }

    // Close existing connection if present
    if (this.eventSourceRef.current) {
      this.eventSourceRef.current.close();
    }

    // Create new connection
    const eventSource = new EventSource(
      `${ServerURL}/connect?token=${this.token}&eventId=${this.eventId}`
    );
    this.eventSourceRef.current = eventSource;

    // Add event listeners
    eventSource.addEventListener("add-peer", this.handlers.addPeer, false);
    eventSource.addEventListener(
      "remove-peer",
      this.handlers.removePeer,
      false
    );
    eventSource.addEventListener(
      "session-description",
      this.handlers.sessionDescription,
      false
    );
    eventSource.addEventListener(
      "ice-candidate",
      this.handlers.iceCandidate,
      false
    );
    eventSource.addEventListener("connected", this.handlers.handleJoin);
    eventSource.addEventListener(
      "join-completed",
      this.handlers.handleCompleteJoin
    );
    eventSource.addEventListener(
      "start-round",
      this.handlers.handleStartRound,
      false
    );
    eventSource.addEventListener(
      "finish-round",
      this.handlers.handleFinishRound,
      false
    );

    // Error handling
    eventSource.onerror = this.handlers.handleEventSourceError;

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  public close(): void {
    if (this.eventSourceRef.current) {
      this.eventSourceRef.current.close();
      this.eventSourceRef.current = null;
    }
  }

  public isConnected(): boolean {
    return (
      !!this.eventSourceRef.current &&
      this.eventSourceRef.current.readyState === 1
    );
  }

  public isClosed(): boolean {
    return (
      !!this.eventSourceRef.current &&
      this.eventSourceRef.current.readyState === 2
    );
  }
}
