import {
  acquireProviderLock,
  buildLockOwnerMarker,
  createLockOwnerId,
  parseLockOwnerMarker,
  releaseProviderLock
} from "../../../../supabase/functions/provider-sync/lockOwner.js";

function createClientMock(result) {
  const calls = [];
  const builder = {
    from(table) { calls.push(["from", table]); return builder; },
    update(values) { calls.push(["update", values]); return builder; },
    eq(field, value) { calls.push(["eq", field, value]); return builder; },
    select(fields) { calls.push(["select", fields]); return builder; },
    maybeSingle() { calls.push(["maybeSingle"]); return Promise.resolve(result); }
  };
  return { client: builder, calls };
}

test("creates an owner before lock and formats its marker", () => {
  const ownerId = createLockOwnerId(() => "owner-a");
  expect(ownerId).toBe("owner-a");
  expect(buildLockOwnerMarker(ownerId)).toBe("__lock_owner:owner-a");
  expect(parseLockOwnerMarker("__lock_owner:owner-a")).toBe(ownerId);
});

test("acquires only an unlocked registry row and records the owner", async () => {
  const { client, calls } = createClientMock({ data: { provider_code: "olx" }, error: null });
  await acquireProviderLock(client, {
    empresaId: "empresa-a",
    provider: "olx",
    ownerId: "owner-a",
    nowIso: "2026-09-14T00:00:00.000Z"
  });

  expect(calls).toContainEqual(["update", {
    sync_running: true,
    last_execution: "2026-09-14T00:00:00.000Z",
    last_error: "__lock_owner:owner-a"
  }]);
  expect(calls).toContainEqual(["eq", "sync_running", false]);
});

test("releases only when the registry still belongs to the same owner", async () => {
  const { client, calls } = createClientMock({ data: { provider_code: "olx" }, error: null });
  const result = await releaseProviderLock(client, {
    empresaId: "empresa-a",
    provider: "olx",
    ownerId: "owner-a",
    nextExecutionIso: "2026-09-14T04:00:00.000Z",
    success: true,
    nowIso: "2026-09-14T00:01:00.000Z"
  });

  expect(result.data).toEqual({ provider_code: "olx" });
  expect(calls).toContainEqual(["eq", "sync_running", true]);
  expect(calls).toContainEqual(["eq", "last_error", "__lock_owner:owner-a"]);
});

test("a late unlock from owner A cannot match owner B", async () => {
  const { client, calls } = createClientMock({ data: null, error: null });
  const result = await releaseProviderLock(client, {
    empresaId: "empresa-a",
    provider: "olx",
    ownerId: "owner-a",
    nextExecutionIso: "2026-09-14T04:00:00.000Z",
    success: false,
    errorMessage: "late A",
    nowIso: "2026-09-14T00:05:00.000Z"
  });

  expect(result.data).toBeNull();
  expect(calls).toContainEqual(["eq", "last_error", "__lock_owner:owner-a"]);
});

test("real errors are written only by the fenced owner", async () => {
  const { client, calls } = createClientMock({ data: { provider_code: "olx" }, error: null });
  await releaseProviderLock(client, {
    empresaId: "empresa-a",
    provider: "olx",
    ownerId: "owner-a",
    nextExecutionIso: "2026-09-14T00:00:00.000Z",
    success: false,
    errorMessage: "provider failed",
    nowIso: "2026-09-14T00:01:00.000Z"
  });

  expect(calls).toContainEqual(["update", expect.objectContaining({
    last_error: "provider failed",
    sync_running: false
  })]);
});

test("successful release clears the technical owner marker", async () => {
  const { client, calls } = createClientMock({ data: { provider_code: "olx" }, error: null });
  await releaseProviderLock(client, {
    empresaId: "empresa-a",
    provider: "olx",
    ownerId: "owner-a",
    nextExecutionIso: "2026-09-14T04:00:00.000Z",
    success: true,
    nowIso: "2026-09-14T00:01:00.000Z"
  });

  expect(calls).toContainEqual(["update", expect.objectContaining({
    last_error: null,
    sync_running: false
  })]);
});
