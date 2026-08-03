/**
 * ADR-003 — Provider Synchronization Engine
 * Estados oficiais do ciclo de sincronização.
 */
export const SyncState = Object.freeze({
  IDLE: "idle",
  PREPARING: "preparing",
  CONNECTING: "connecting",
  FETCHING: "fetching",
  PROCESSING: "processing",
  SAVING: "saving",
  FINALIZING: "finalizing",
  COMPLETED: "completed",
  FAILED: "failed"
});

export class SyncProgressEvent {
  constructor({ state, provider, detail = {} }) {
    this.state = state;
    this.provider = provider;
    this.detail = detail;
    this.timestamp = new Date().toISOString();
    // Stats — extracted from detail; numeric fields default to 0, never null
    this.processed   = Number(detail.processed)   || 0;
    this.total       = Number(detail.total)       || 0;
    this.imported    = Number(detail.imported)    || 0;
    this.updated     = Number(detail.updated)     || 0;
    this.ignored     = Number(detail.ignored)     || 0;
    this.errors      = Number(detail.errors)      || 0;
    this.elapsedTime = Number(detail.elapsedTime) || 0;
    this.startedAt   = detail.startedAt  || null;
    this.finishedAt  = detail.finishedAt || null;
  }
}
