"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { SharedDashboard, DashboardSnapshot } from "@/lib/types";

export function useSharedDashboard() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createDashboard = async (
    tripId: string | null,
    title: string,
    description: string,
    startDate: string,
    endDate: string,
    password?: string
  ) => {
    try {
      setLoading(true);
      const shareKey = generateShareKey();

      // Create dashboard
      // @ts-expect-error - Supabase types may not be available during build
      const { data: dashboard, error: dashboardError } = await supabase
        .from("shared_dashboards")
        .insert([
          {
            trip_id: tripId,
            share_key: shareKey,
            title,
            description,
            start_date: startDate,
            end_date: endDate,
            password_hash: password ? await hashPassword(password) : null,
          },
        ])
        .select()
        .single();

      if (dashboardError) throw dashboardError;

      return {
        ...dashboard,
        shareUrl: `${window.location.origin}/shared/${shareKey}`,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "대시보드 생성 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getDashboard = async (shareKey: string, password?: string) => {
    try {
      setLoading(true);
      // @ts-expect-error - Supabase types may not be available during build
      const { data: dashboard, error: dashboardError } = await supabase
        .from("shared_dashboards")
        .select("*")
        .eq("share_key", shareKey)
        .eq("is_active", true)
        .single();

      if (dashboardError) throw dashboardError;

      // Check password if exists
      if (dashboard.password_hash) {
        if (!password) {
          throw new Error("비밀번호가 필요합니다.");
        }
        // In production, use proper password verification
        // For now, simple check
        const isValid = await verifyPassword(password, dashboard.password_hash);
        if (!isValid) {
          throw new Error("비밀번호가 올바르지 않습니다.");
        }
      }

      // Get snapshots
      // @ts-expect-error - Supabase types may not be available during build
      const { data: snapshots, error: snapshotsError } = await supabase
        .from("dashboard_snapshots")
        .select("*")
        .eq("dashboard_id", dashboard.id)
        .order("created_at", { ascending: false });

      if (snapshotsError) throw snapshotsError;

      // Update view count
      // @ts-expect-error - Supabase types may not be available during build
      await supabase
        .from("shared_dashboards")
        .update({ view_count: (dashboard.view_count || 0) + 1 })
        .eq("id", dashboard.id);

      return {
        dashboard,
        snapshots: snapshots || [],
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "대시보드 조회 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const createSnapshot = async (
    dashboardId: string,
    participantId: string | null,
    participantName: string,
    regularAmount: number,
    sharedAmount: number,
    totalAmount: number,
    expenseDetails: Record<string, unknown>
  ) => {
    try {
      // @ts-expect-error - Supabase types may not be available during build
      const { data, error } = await supabase
        .from("dashboard_snapshots")
        .insert([
          {
            dashboard_id: dashboardId,
            participant_id: participantId,
            participant_name: participantName,
            regular_amount: regularAmount,
            shared_amount: sharedAmount,
            total_amount: totalAmount,
            expense_details: expenseDetails,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "스냅샷 생성 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    loading,
    error,
    createDashboard,
    getDashboard,
    createSnapshot,
  };
}

function generateShareKey(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function hashPassword(password: string): Promise<string> {
  // Simple hash for demo - in production use bcrypt or similar
  return btoa(password);
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  // Simple verification for demo
  return btoa(password) === hash;
}

