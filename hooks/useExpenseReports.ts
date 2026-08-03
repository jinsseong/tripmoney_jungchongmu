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

const EXPENSE_REPORTS_SETUP_MESSAGE =
  "지출 제보 기능을 사용하려면 Supabase에서 supabase-schema-safe.sql을 먼저 실행해주세요.";

const getErrorText = (err: unknown) => {
  if (err instanceof Error) {
    return err.message;
  }

  if (err && typeof err === "object") {
    const maybeError = err as {
      code?: string;
      details?: string;
      hint?: string;
      message?: string;
    };
    return [
      maybeError.code,
      maybeError.message,
      maybeError.details,
      maybeError.hint,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  return "";
};

const isMissingExpenseReportsTable = (err: unknown) => {
  if (!err || typeof err !== "object") {
    return false;
  }

  const maybeError = err as {
    code?: string;
    details?: string;
    message?: string;
  };
  const text = [
    maybeError.code,
    maybeError.message,
    maybeError.details,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    text.includes("42p01") ||
    text.includes("pgrst205") ||
    text.includes("expense_reports") && (
      text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("could not find")
    )
  );
};

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
        if (isMissingExpenseReportsTable(error)) {
          setReports([]);
          setError(EXPENSE_REPORTS_SETUP_MESSAGE);
          return [];
        }

        throw error;
      }

      const normalizedReports = ((data || []) as ExpenseReport[]).map(normalizeReport);
      setReports(normalizedReports);
      setError(null);
      return normalizedReports;
    } catch (err) {
      if (isMissingExpenseReportsTable(err)) {
        setReports([]);
        setError(EXPENSE_REPORTS_SETUP_MESSAGE);
        return [];
      }

      const message = getErrorText(err) || "지출 제보 조회 실패";
      setError(message);
      console.warn("Expense report fetch failed:", message);
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
