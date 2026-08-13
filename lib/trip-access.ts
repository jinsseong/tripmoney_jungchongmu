"use client";

import { Trip } from "@/lib/types";

export type TripAccessMode = "admin" | "participant";

export interface TripAccessSession {
  tripId: string;
  mode: TripAccessMode;
  participantId?: string;
  participantName?: string;
  adminKey?: string;
  joinedAt: string;
}

const ACCESS_PREFIX = "jungchongmu-trip-access:";
const LEGACY_PARTICIPANT_PREFIX = "jungchongmu-participant:";
const LAST_MODE_KEY = "jungchongmu-last-access-mode";

function getStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isTripAccessSession(value: unknown): value is TripAccessSession {
  if (!value || typeof value !== "object") return false;

  const session = value as Partial<TripAccessSession>;
  return (
    typeof session.tripId === "string" &&
    session.tripId.length > 0 &&
    (session.mode === "admin" || session.mode === "participant")
  );
}

export function getTripAccessSession(tripId?: string | null): TripAccessSession | null {
  const storage = getStorage();
  if (!tripId || !storage) return null;

  try {
    const rawSession = storage.getItem(`${ACCESS_PREFIX}${tripId}`);
    if (rawSession) {
      const parsedSession = JSON.parse(rawSession) as unknown;
      if (isTripAccessSession(parsedSession) && parsedSession.tripId === tripId) {
        return parsedSession;
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function setTripAccessSession(session: TripAccessSession) {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(`${ACCESS_PREFIX}${session.tripId}`, JSON.stringify(session));
    storage.setItem(LAST_MODE_KEY, session.mode);
    if (session.mode === "participant" && session.participantId) {
      storage.setItem(`${LEGACY_PARTICIPANT_PREFIX}${session.tripId}`, session.participantId);
    }
  } catch {
    // 참가/관리자 진입 자체는 localStorage 실패와 독립적으로 동작해야 합니다.
  }
}

export function rememberAdminTrip(trip: Trip) {
  if (!trip.admin_key) return;

  setTripAccessSession({
    tripId: trip.id,
    mode: "admin",
    adminKey: trip.admin_key,
    joinedAt: new Date().toISOString(),
  });
}

export function getParticipantIdForTrip(tripId?: string | null) {
  const storage = getStorage();
  if (!tripId || !storage) return "";

  const session = getTripAccessSession(tripId);
  if (session) {
    return session.mode === "participant" && session.participantId
      ? session.participantId
      : "";
  }

  try {
    return storage.getItem(`${LEGACY_PARTICIPANT_PREFIX}${tripId}`) || "";
  } catch {
    return "";
  }
}

export function getStoredTripAccessSessions(): TripAccessSession[] {
  const storage = getStorage();
  if (!storage) return [];

  const sessions = new Map<string, TripAccessSession>();

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(ACCESS_PREFIX)) continue;

      const rawSession = storage.getItem(key);
      if (!rawSession) continue;

      try {
        const parsedSession = JSON.parse(rawSession) as unknown;
        if (isTripAccessSession(parsedSession)) {
          sessions.set(parsedSession.tripId, parsedSession);
        }
      } catch {
        // 손상된 로컬 항목은 다른 여행의 접근 정보에 영향을 주지 않습니다.
      }
    }

    // 초기 버전에서 저장한 참가자 정보도 접근 목록으로 마이그레이션합니다.
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key?.startsWith(LEGACY_PARTICIPANT_PREFIX)) continue;

      const tripId = key.slice(LEGACY_PARTICIPANT_PREFIX.length);
      const participantId = storage.getItem(key);
      if (!tripId || !participantId || sessions.has(tripId)) continue;

      sessions.set(tripId, {
        tripId,
        mode: "participant",
        participantId,
        joinedAt: "",
      });
    }
  } catch {
    return [];
  }

  return Array.from(sessions.values());
}

export function getPreferredHomeMode(
  sessions: TripAccessSession[] = getStoredTripAccessSessions()
): TripAccessMode {
  const storage = getStorage();
  const hasAdminSession = sessions.some((session) => session.mode === "admin");
  const hasParticipantSession = sessions.some(
    (session) => session.mode === "participant"
  );

  try {
    const lastMode = storage?.getItem(LAST_MODE_KEY);
    if (lastMode === "admin" && hasAdminSession) return "admin";
    if (lastMode === "participant" && hasParticipantSession) return "participant";
  } catch {
    // 저장된 모드를 읽지 못하면 보유한 접근 권한으로 결정합니다.
  }

  if (hasAdminSession) return "admin";
  if (hasParticipantSession) return "participant";
  return "admin";
}

export function hasParticipantAccess(tripId?: string | null) {
  return Boolean(getParticipantIdForTrip(tripId));
}

export function hasAdminAccess(tripId?: string | null) {
  return getTripAccessSession(tripId)?.mode === "admin";
}

export function extractInviteKeyFromInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split("/").filter(Boolean);
    return segments[segments.length - 1] || "";
  } catch {
    const withoutQuery = trimmed.split(/[?#]/)[0];
    const segments = withoutQuery.split("/").filter(Boolean);
    return segments[segments.length - 1] || trimmed;
  }
}
