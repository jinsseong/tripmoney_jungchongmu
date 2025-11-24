"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Participant } from "@/lib/types";
import { generateAvatarColor } from "@/lib/utils";

export function useParticipants() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Supabase 클라이언트 확인
      if (!supabase) {
        throw new Error("Supabase 클라이언트가 초기화되지 않았습니다. 환경 변수를 확인해주세요.");
      }

      const { data, error } = await supabase
        .from("participants")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Supabase error details:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        throw error;
      }
      
      setParticipants(data || []);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error 
        ? err.message 
        : typeof err === 'object' && err !== null && 'message' in err
        ? String(err.message)
        : typeof err === 'object' && err !== null
        ? JSON.stringify(err, null, 2)
        : "참여자 조회 실패";
      setError(errorMessage);
      console.error("Error fetching participants:", {
        error: err,
        errorMessage,
        stack: err instanceof Error ? err.stack : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, []);

  const addParticipant = async (name: string, phone?: string): Promise<Participant | null> => {
    try {
      const avatarColor = generateAvatarColor(name);
      const { data, error } = await supabase
        .from("participants")
        .insert([{ name, avatar_color: avatarColor, phone }] as any)
        .select()
        .single();

      if (error) throw error;
      setParticipants((prev) => [...prev, data as Participant]);
      return data as Participant;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "참여자 추가 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateParticipant = async (
    id: string,
    updates: { name?: string; avatar_color?: string; phone?: string }
  ) => {
    try {
      const { data, error } = await (supabase
        .from("participants") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setParticipants((prev) =>
        prev.map((p) => (p.id === id ? data : p))
      );
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "참여자 수정 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteParticipant = async (id: string) => {
    try {
      const { error } = await supabase
        .from("participants")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setParticipants((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "참여자 삭제 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    participants,
    loading,
    error,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    refetch: fetchParticipants,
  };
}

