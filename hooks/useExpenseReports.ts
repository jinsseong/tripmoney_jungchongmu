"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ExpenseReport, ExpenseReportStatus } from "@/lib/types";

type ExpenseReportInsert = Omit<
  ExpenseReport,
  "id" | "status" | "approved_expense_id" | "reviewed_at" | "created_at" | "updated_at"
> & {
  status?: ExpenseReportStatus;
};

const normalizeReport = (report: ExpenseReport): ExpenseReport => ({
  ...report,
  participant_ids: Array.isArray(report.participant_ids)
    ? report.participant_ids
    : [],
});

export function useExpenseReports(tripId?: string, enabled = true) {
  const shouldFetch = enabled && Boolean(tripId);
  const [reports, setReports] = useState<ExpenseReport[]>([]);
  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!shouldFetch || !tripId) {
      setReports([]);
      setLoading(false);
      setError(null);
      return [];
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("expense_reports")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42P01" || error.message.includes("does not exist")) {
          setReports([]);
          setError("expense_reports 테이블이 없습니다. Supabase 스키마를 적용해주세요.");
          return [];
        }

        throw error;
      }

      const normalizedReports = ((data || []) as ExpenseReport[]).map(normalizeReport);
      setReports(normalizedReports);
      setError(null);
      return normalizedReports;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "지출 제보 조회 실패";
      setError(message);
      console.error("Error fetching expense reports:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [shouldFetch, tripId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const addReport = async (report: ExpenseReportInsert) => {
    try {
      const { data, error } = await supabase
        .from("expense_reports")
        .insert([{ ...report, status: report.status || "pending" }] as any)
        .select()
        .single();

      if (error) throw error;

      const newReport = normalizeReport(data as ExpenseReport);
      setReports((prev) => [newReport, ...prev]);
      return newReport;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "지출 제보 등록 실패";
      setError(message);
      throw new Error(message);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: ExpenseReportStatus,
    approvedExpenseId?: string
  ) => {
    try {
      const updates = {
        status,
        approved_expense_id: approvedExpenseId,
        reviewed_at: new Date().toISOString(),
      };
      const { data, error } = await (supabase
        .from("expense_reports") as any)
        .update(updates)
        .eq("id", reportId)
        .select()
        .single();

      if (error) throw error;

      const updatedReport = normalizeReport(data as ExpenseReport);
      setReports((prev) =>
        prev.map((report) => (report.id === reportId ? updatedReport : report))
      );
      return updatedReport;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "지출 제보 상태 변경 실패";
      setError(message);
      throw new Error(message);
    }
  };

  return {
    reports,
    loading,
    error,
    addReport,
    updateReportStatus,
    refetch: fetchReports,
  };
}
