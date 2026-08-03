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

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function getTripAccessSession(tripId?: string | null): TripAccessSession | null {
  if (!tripId || !canUseStorage()) return null;

  try {
    const rawSession = localStorage.getItem(`${ACCESS_PREFIX}${tripId}`);
    if (rawSession) {
      return JSON.parse(rawSession) as TripAccessSession;
    }
  } catch {
    return null;
  }

  return null;
}

export function setTripAccessSession(session: TripAccessSession) {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(`${ACCESS_PREFIX}${session.tripId}`, JSON.stringify(session));
    if (session.mode === "participant" && session.participantId) {
      localStorage.setItem(`${LEGACY_PARTICIPANT_PREFIX}${session.tripId}`, session.participantId);
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
  if (!tripId || !canUseStorage()) return "";

  const session = getTripAccessSession(tripId);
  if (session?.mode === "participant" && session.participantId) {
    return session.participantId;
  }

  try {
    return localStorage.getItem(`${LEGACY_PARTICIPANT_PREFIX}${tripId}`) || "";
  } catch {
    return "";
  }
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
