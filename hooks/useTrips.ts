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

  return {
    trips,
    loading,
    error,
    addTrip,
    refetch: fetchTrips,
  };
}

