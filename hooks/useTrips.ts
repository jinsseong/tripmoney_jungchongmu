"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trip } from "@/lib/types";
import { rememberAdminTrip } from "@/lib/trip-access";

interface UseTripsOptions {
  enabled?: boolean;
  ids?: string[];
  includeAdminKey?: boolean;
}

export function useTrips(options: UseTripsOptions = {}) {
  const { enabled = true, ids, includeAdminKey = false } = options;
  const idsKey = ids === undefined ? null : [...new Set(ids)].sort().join(",");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    if (!enabled || idsKey === "") {
      setTrips([]);
      setError(null);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      let query = supabase
        .from("trips")
        .select(
          includeAdminKey
            ? "*"
            : "id, name, start_date, end_date, description, cover_image_url, invite_key, created_at, updated_at"
        )
        .order("start_date", { ascending: false });

      if (idsKey !== null) {
        query = query.in("id", idsKey.split(","));
      }

      const { data, error } = await query;

      if (error) throw error;
      setTrips((data || []) as Trip[]);
      setError(null);
      return (data || []) as Trip[];
    } catch (err) {
      setError(err instanceof Error ? err.message : "여행 조회 실패");
      console.error("Error fetching trips:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled, idsKey, includeAdminKey]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  const addTrip = async (
    name: string,
    startDate: string,
    endDate: string,
    description?: string
  ): Promise<Trip | null> => {
    try {
      const { data, error } = await supabase
        .from("trips")
        .insert([{ name, start_date: startDate, end_date: endDate, description }] as any)
        .select()
        .single();

      if (error) throw error;
      setTrips((prev) => [data, ...prev]);
      rememberAdminTrip(data as Trip);
      return data as Trip;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "여행 추가 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteTrip = async (id: string) => {
    try {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "여행 삭제 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateTrip = async (
    id: string,
    updates: Partial<Pick<Trip, "name" | "start_date" | "end_date" | "description">>
  ) => {
    try {
      const { data, error } = await (supabase
        .from("trips") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setTrips((prev) =>
        prev.map((t) => (t.id === id ? (data as Trip) : t))
      );
      return data as Trip;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "여행 수정 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    trips,
    loading,
    error,
    addTrip,
    deleteTrip,
    updateTrip,
    refetch: fetchTrips,
  };
}
