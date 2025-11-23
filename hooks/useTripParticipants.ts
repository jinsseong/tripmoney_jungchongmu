"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Participant } from "@/lib/types";

export function useTripParticipants(tripId: string | null | undefined) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = async () => {
    if (!tripId) {
      setParticipants([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Supabase 클라이언트 확인
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 초기화되지 않았습니다. 환경 변수를 확인해주세요.");
      }

      // trip_participants를 통해 해당 여행의 참가자 조회
      const { data: tripParticipants, error: tripError } = await supabase
        .from("trip_participants")
        .select("participant_id")
        .eq("trip_id", tripId);

      if (tripError) {
        const errorCode = tripError.code || "";
        const errorMessage = tripError.message || "알 수 없는 오류";
        
        // 테이블이 존재하지 않는 경우 (42P01) 또는 권한 오류 (42501) 처리
        if (errorCode === "42P01" || errorCode === "42501" || 
            errorMessage.includes("does not exist") || 
            errorMessage.includes("permission denied")) {
          console.warn("trip_participants 테이블이 없거나 접근 권한이 없습니다. 데이터베이스 스키마를 확인해주세요.");
          console.warn("SQL 실행 필요:", `
-- trip_participants 테이블 생성
CREATE TABLE IF NOT EXISTS trip_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES participants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trip_id, participant_id)
);

-- RLS 정책 추가
ALTER TABLE trip_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all operations on trip_participants" ON trip_participants;
CREATE POLICY "Allow all operations on trip_participants" ON trip_participants
  FOR ALL USING (true) WITH CHECK (true);
          `);
          // 테이블이 없을 경우 빈 배열 반환 (오류로 처리하지 않음)
          setParticipants([]);
          setError(null);
          setLoading(false);
          return;
        }
        
        // 기타 오류는 상세 로그와 함께 throw
        const errorDetails = {
          message: errorMessage,
          details: tripError.details || null,
          hint: tripError.hint || null,
          code: errorCode || null,
          fullError: tripError,
        };
        console.error("Supabase trip_participants error details:", errorDetails);
        throw tripError;
      }

      if (!tripParticipants || tripParticipants.length === 0) {
        setParticipants([]);
        setLoading(false);
        return;
      }

      const participantIds = tripParticipants.map((tp) => tp.participant_id);

      // 참가자 정보 조회
      const { data: participantsData, error: participantsError } = await supabase
        .from("participants")
        .select("*")
        .in("id", participantIds)
        .order("created_at", { ascending: true });

      if (participantsError) {
        console.error("Supabase participants error details:", {
          message: participantsError.message,
          details: participantsError.details,
          hint: participantsError.hint,
          code: participantsError.code,
        });
        throw participantsError;
      }

      setParticipants(participantsData || []);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : typeof err === "object" && err !== null
          ? JSON.stringify(err, null, 2)
          : "참가자 조회 실패";
      setError(errorMessage);
      console.error("Error fetching trip participants:", {
        error: err,
        errorMessage,
        tripId,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const addParticipantToTrip = async (participantId: string) => {
    if (!tripId) throw new Error("여행 ID가 필요합니다.");

    try {
      // Supabase 클라이언트 확인
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
      }

      const { data, error } = await supabase
        .from("trip_participants")
        .insert({
          trip_id: tripId,
          participant_id: participantId,
        })
        .select();

      if (error) {
        const errorCode = error.code || "";
        const errorMessage = error.message || "알 수 없는 오류";
        
        // 테이블이 존재하지 않는 경우 처리
        if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
          console.warn("trip_participants 테이블이 없습니다. 데이터베이스 스키마를 확인해주세요.");
          throw new Error("trip_participants 테이블이 없습니다. 데이터베이스 스키마를 실행해주세요.");
        }
        
        console.error("Supabase trip_participants insert error:", {
          message: errorMessage,
          details: error.details,
          hint: error.hint,
          code: errorCode,
          fullError: error,
        });
        throw error;
      }

      await fetchParticipants();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : typeof err === "object" && err !== null
          ? JSON.stringify(err, null, 2)
          : "참가자 추가 실패";
      console.error("Error adding participant to trip:", {
        error: err,
        errorMessage,
        tripId,
        participantId,
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw new Error(errorMessage);
    }
  };

  const removeParticipantFromTrip = async (participantId: string) => {
    if (!tripId) throw new Error("여행 ID가 필요합니다.");

    try {
      // Supabase 클라이언트 확인
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 초기화되지 않았습니다.");
      }

      const { error } = await supabase
        .from("trip_participants")
        .delete()
        .eq("trip_id", tripId)
        .eq("participant_id", participantId);

      if (error) {
        const errorCode = error.code || "";
        const errorMessage = error.message || "알 수 없는 오류";
        
        console.error("Supabase trip_participants delete error:", {
          message: errorMessage,
          details: error.details,
          hint: error.hint,
          code: errorCode,
          fullError: error,
        });
        throw error;
      }

      await fetchParticipants();
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String(err.message)
          : typeof err === "object" && err !== null
          ? JSON.stringify(err, null, 2)
          : "참가자 제거 실패";
      console.error("Error removing participant from trip:", {
        error: err,
        errorMessage,
        tripId,
        participantId,
        stack: err instanceof Error ? err.stack : undefined,
      });
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [tripId]);

  return {
    participants,
    loading,
    error,
    refetch: fetchParticipants,
    addParticipantToTrip,
    removeParticipantFromTrip,
  };
}

