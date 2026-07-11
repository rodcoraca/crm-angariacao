export const SYNC_INTERVAL = 240 * 60 * 1000;

let isSyncRunning = false;
let lastSyncAt = null;
let nextSyncAt = null;
let syncStatus = 'Idle';

export const getSyncState = () => ({
  lastSyncAt,
  nextSyncAt,
  syncStatus
});

export const setSyncStatus = (status) => {
  syncStatus = status;
};

export const setSyncTimestamps = (last, next) => {
  lastSyncAt = last;
  nextSyncAt = next;
};

export const getIsSyncRunning = () => isSyncRunning;
export const setIsSyncRunning = (val) => { isSyncRunning = val; };
