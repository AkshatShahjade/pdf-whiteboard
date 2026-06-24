import { MarkDTO, SessionDTO } from '../../shared_doman_models_and_dtos/dtos';
import { AppState } from '../app_state_store';

export type EventPayloads = {
  SESSION_LOADED: SessionDTO;
  MARK_ADDED: MarkDTO;
  MARK_UPDATED: MarkDTO;
  MARK_DELETED: { markId: string };
  WHITEBOARD_UPDATED: { markId: string };
  APPSTATE_MUTATED: Partial<AppState>;
};

export type EventType = keyof EventPayloads;

export interface Subscription {
  unsubscribe(): void;
}

export interface OutputAPIInterface {
  subscribe<T extends EventType>(
    type: T,
    listener: (payload: EventPayloads[T]) => void
  ): Subscription;
  publish<T extends EventType>(type: T, payload: EventPayloads[T]): void;
}

export function createOutputAPI(): OutputAPIInterface {
  // Map of event types to sets of callback listeners
  const listenersMap = new Map<EventType, Set<(payload: any) => void>>();

  return {
    subscribe<T extends EventType>(
      type: T,
      listener: (payload: EventPayloads[T]) => void
    ): Subscription {
      if (!listenersMap.has(type)) {
        listenersMap.set(type, new Set());
      }
      listenersMap.get(type)!.add(listener);

      return {
        unsubscribe() {
          const listeners = listenersMap.get(type);
          if (listeners) {
            listeners.delete(listener);
            if (listeners.size === 0) {
              listenersMap.delete(type);
            }
          }
        }
      };
    },

    publish<T extends EventType>(type: T, payload: EventPayloads[T]): void {
      const listeners = listenersMap.get(type);
      if (listeners) {
        listeners.forEach(listener => {
          try {
            listener(payload);
          } catch (err) {
            console.error(`[OutputAPI] Error in listener execution for event "${type}":`, err);
          }
        });
      }
    }
  };
}
