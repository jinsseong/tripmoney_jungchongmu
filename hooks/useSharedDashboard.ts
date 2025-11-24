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
        ] as any)
        .select()
        .single();

      if (dashboardError) throw dashboardError;

      return {
        ...(dashboard as any),
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
      const { data: dashboard, error: dashboardError } = await supabase
        .from("shared_dashboards")
        .select("*")
        .eq("share_key", shareKey)
        .eq("is_active", true)
        .single();

      if (dashboardError) throw dashboardError;

      const dashboardData = dashboard as any;

      // Check password if exists
      if (dashboardData.password_hash) {
        if (!password) {
          throw new Error("비밀번호가 필요합니다.");
        }
        // In production, use proper password verification
        // For now, simple check
        const isValid = await verifyPassword(password, dashboardData.password_hash);
        if (!isValid) {
          throw new Error("비밀번호가 올바르지 않습니다.");
        }
      }

      // Get snapshots
      const { data: snapshots, error: snapshotsError } = await supabase
        .from("dashboard_snapshots")
        .select("*")
        .eq("dashboard_id", dashboardData.id)
        .order("created_at", { ascending: false });

      if (snapshotsError) throw snapshotsError;

      // Update view count
      await (supabase
        .from("shared_dashboards") as any)
        .update({ view_count: (dashboardData.view_count || 0) + 1 })
        .eq("id", dashboardData.id);

      return {
        dashboard: dashboardData,
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
        ] as any)
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

