import assert from "node:assert/strict";
import test from "node:test";

import {
  getParticipantIdForTrip,
  getPreferredHomeMode,
  getStoredTripAccessSessions,
  setTripAccessSession,
} from "../lib/trip-access";

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

function installStorage() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: storage },
  });
  return storage;
}

test("저장된 접근 세션이 있는 여행만 홈 조회 대상으로 열거한다", () => {
  installStorage();

  setTripAccessSession({
    tripId: "admin-trip",
    mode: "admin",
    adminKey: "admin-key",
    joinedAt: "2026-08-13T00:00:00.000Z",
  });
  setTripAccessSession({
    tripId: "participant-trip",
    mode: "participant",
    participantId: "participant-1",
    joinedAt: "2026-08-13T00:00:00.000Z",
  });

  assert.deepEqual(
    getStoredTripAccessSessions().map(({ tripId, mode }) => ({ tripId, mode })),
    [
      { tripId: "admin-trip", mode: "admin" },
      { tripId: "participant-trip", mode: "participant" },
    ]
  );
  assert.equal(getPreferredHomeMode(), "participant");
});

test("이전 버전 참가자 저장값도 해당 여행의 참가 권한으로 복원한다", () => {
  const storage = installStorage();
  storage.setItem("jungchongmu-participant:legacy-trip", "legacy-participant");

  assert.deepEqual(getStoredTripAccessSessions(), [
    {
      tripId: "legacy-trip",
      mode: "participant",
      participantId: "legacy-participant",
      joinedAt: "",
    },
  ]);
});

test("관리자 세션은 남아 있는 예전 참가자 값보다 우선한다", () => {
  const storage = installStorage();
  storage.setItem("jungchongmu-participant:trip-1", "old-participant");
  setTripAccessSession({
    tripId: "trip-1",
    mode: "admin",
    adminKey: "admin-key",
    joinedAt: "2026-08-13T00:00:00.000Z",
  });

  assert.equal(getParticipantIdForTrip("trip-1"), "");
  assert.equal(getPreferredHomeMode(), "admin");
});

test("손상되거나 허용되지 않은 접근 세션은 무시한다", () => {
  const storage = installStorage();
  storage.setItem("jungchongmu-trip-access:broken", "{broken-json");
  storage.setItem(
    "jungchongmu-trip-access:forged",
    JSON.stringify({ tripId: "forged", mode: "owner" })
  );

  assert.deepEqual(getStoredTripAccessSessions(), []);
});
