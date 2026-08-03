/**
 * ADR-003 — Provider Synchronization Engine (PSE)
 *
 * Motor de sincronização reutilizável.
 * Responsável por emitir e gerir os estados do ciclo de sincronização.
 * Não contém lógica de negócio nem dependências de UI.
 */
import { SyncProgressEvent, SyncState } from "./SyncProgressEvent.js";

export { SyncState } from "./SyncProgressEvent.js";

export class ProviderSyncEngine {
  constructor() {
    this._subscribers = new Set();
    this._state = SyncState.IDLE;
  }

  /** Estado actual da sincronização. */
  get state() {
    return this._state;
  }

  /**
   * Subscreve eventos de progresso.
   * @param {function(SyncProgressEvent): void} fn
   * @returns {function} unsubscribe
   */
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }

  /**
   * Emite um evento de progresso para todos os subscritores.
   * @param {string} state  - SyncState
   * @param {string} provider
   * @param {object} [detail]
   * @returns {SyncProgressEvent}
   */
  emit(state, provider, detail = {}) {
    this._state = state;
    const event = new SyncProgressEvent({ state, provider, detail });
    for (const fn of this._subscribers) {
      try {
        fn(event);
      } catch (_) {
        // subscritores não podem interromper o fluxo de sincronização
      }
    }
    return event;
  }

  /** Repõe o estado para idle sem emitir evento. */
  reset() {
    this._state = SyncState.IDLE;
  }
}

/** Instância singleton do PSE — partilhada por toda a aplicação. */
export const providerSyncEngine = new ProviderSyncEngine();
