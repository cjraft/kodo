import type { AgentEvent, AgentListener } from "./types.js";

interface Subscription {
  listener: AgentListener;
  sessionId?: string;
}

/**
 * In-memory session event fan-out. Optional session filtering lets consumers
 * subscribe to a single session without inspecting every emitted event.
 */
export class AgentEventBus {
  private readonly subscriptions = new Set<Subscription>();

  /**
   * Registers a listener and returns the unsubscribe cleanup function.
   */
  subscribe(listener: AgentListener, sessionId?: string) {
    const subscription: Subscription = { listener, sessionId };
    this.subscriptions.add(subscription);

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  /**
   * Delivers an event to all matching listeners synchronously.
   */
  emit(event: AgentEvent) {
    for (const subscription of this.subscriptions) {
      if (
        subscription.sessionId &&
        subscription.sessionId !== event.sessionId
      ) {
        continue;
      }

      subscription.listener(event);
    }
  }
}
