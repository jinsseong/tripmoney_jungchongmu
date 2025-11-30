"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Trip } from "@/lib/types";

export function useTrips() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .order("start_date", { ascending: false });

      if (error) throw error;
      setTrips((data || []) as Trip[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "여행 조회 실패");
      console.error("Error fetching trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
  }, []);

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
      const { data, error } = await supabase
        .from("trips")
        .update(updates as any)
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

