import type { AgentEvent } from './types';

export type AgentEventListener = (event: AgentEvent) => void;

/** Lightweight event bus. The transport can later be swapped for Redis/NATS. */
export class AgentEventBus {
  private listeners = new Set<AgentEventListener>();

  subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(event: AgentEvent): void {
    for (const listener of this.listeners) listener(event);
  }
}
