"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Expense, ExpenseDailyParticipant, ExpenseParticipant } from "@/lib/types";

interface UseExpensesOptions {
  enabled?: boolean;
  requireTripId?: boolean;
}

type ExpenseRecord = Expense & {
  categories?: {
    name?: string | null;
  } | null;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
};

type ExpenseParticipantInsert = Omit<ExpenseParticipant, "id">;
type ExpenseDailyParticipantInsert = Omit<ExpenseDailyParticipant, "id" | "created_at">;

const isMissingRelationError = (error: SupabaseErrorLike | null | undefined) => {
  const errorCode = error?.code || "";
  const errorMessage = error?.message || "";

  return errorCode === "42P01" || errorMessage.includes("does not exist");
};

const buildExpenseParticipantRows = (
  expenseId: string,
  participantIds: string[],
  customAmounts?: Record<string, number>
): ExpenseParticipantInsert[] =>
  participantIds.map((participantId) => ({
    expense_id: expenseId,
    participant_id: participantId,
    custom_amount: customAmounts?.[participantId] || undefined,
  }));

const buildDailyParticipantRows = (
  expenseId: string,
  dailyParticipants?: Record<string, string[]>
): ExpenseDailyParticipantInsert[] => {
  if (!dailyParticipants) {
    return [];
  }

  return Object.entries(dailyParticipants).flatMap(([date, participantIds]) =>
    participantIds.map((participantId) => ({
      expense_id: expenseId,
      participant_id: participantId,
      date,
    }))
  );
};

export function useExpenses(
  tripId?: string,
  date?: string,
  options: UseExpensesOptions = {}
) {
  const { enabled = true, requireTripId = true } = options;
  const shouldFetch = enabled && (!requireTripId || Boolean(tripId));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(shouldFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!shouldFetch) {
      setExpenses([]);
      setError(null);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      let query = supabase
        .from("expenses")
        .select(`
          *,
          expense_participants (*),
          categories:category_id (name, icon, color)
        `)
        .order("date", { ascending: false });

      if (tripId) {
        query = query.eq("trip_id", tripId);
      }

      if (date) {
        query = query.eq("date", date);
      }

      const { data, error } = await query;

      if (error) throw error;

      const expenseRows = (data || []) as ExpenseRecord[];
      const expenseIds = expenseRows.map((expense) => expense.id);
      let dailyParticipantsByExpenseId: Record<string, ExpenseDailyParticipant[]> = {};

      if (expenseIds.length > 0) {
        const { data: dailyParticipants, error: dailyError } = await supabase
          .from("expense_daily_participants")
          .select("*")
          .in("expense_id", expenseIds);

        if (dailyError) {
          if (isMissingRelationError(dailyError)) {
            console.warn("expense_daily_participants 테이블이 없습니다. 날짜별 참여자 정보는 조회되지 않습니다.");
          } else {
            throw dailyError;
          }
        } else {
          dailyParticipantsByExpenseId = ((dailyParticipants || []) as ExpenseDailyParticipant[]).reduce(
            (acc, dailyParticipant) => {
              if (!acc[dailyParticipant.expense_id]) {
                acc[dailyParticipant.expense_id] = [];
              }
              acc[dailyParticipant.expense_id].push(dailyParticipant);
              return acc;
            },
            {} as Record<string, ExpenseDailyParticipant[]>
          );
        }
      }

      const expensesWithDailyParticipants = expenseRows.map((expense) => ({
        ...expense,
        daily_participants: dailyParticipantsByExpenseId[expense.id] || [],
        category: expense.categories?.name || expense.category,
      })) as Expense[];

      setExpenses(expensesWithDailyParticipants);
      setError(null);
      return expensesWithDailyParticipants;
    } catch (err) {
      setError(err instanceof Error ? err.message : "지출 조회 실패");
      console.error("Error fetching expenses:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [date, shouldFetch, tripId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = async (
    expenseData: Partial<Expense>,
    participantIds: string[],
    customAmounts?: Record<string, number>,
    dailyParticipants?: Record<string, string[]>
  ) => {
    try {
      if (requireTripId && !expenseData.trip_id) {
        throw new Error("여행 정보가 없어 지출을 추가할 수 없습니다.");
      }

      const expenseToInsert = {
        ...expenseData,
        trip_id: expenseData.trip_id || null,
      };

      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert([expenseToInsert] as any)
        .select()
        .single();

      if (expenseError) throw expenseError;
      const createdExpense = expense as Expense;
      const createdExpenseId = createdExpense.id;

      try {
        // Insert expense participants
        if (participantIds.length > 0) {
          const expenseParticipants = buildExpenseParticipantRows(
            createdExpenseId,
            participantIds,
            customAmounts
          );

          const { error: participantsError } = await supabase
            .from("expense_participants")
            .insert(expenseParticipants as any);

          if (participantsError) throw participantsError;
        }

        // Insert daily participants (if provided)
        const dailyParticipantsData = buildDailyParticipantRows(
          createdExpenseId,
          dailyParticipants
        );
        if (dailyParticipantsData.length > 0) {
          try {
            const { error: dailyError } = await supabase
              .from("expense_daily_participants")
              .insert(dailyParticipantsData as any);

            if (dailyError) {
              if (isMissingRelationError(dailyError)) {
                throw new Error("날짜별 참여자 저장 테이블이 없어 지출을 추가하지 않았습니다. Supabase 스키마 업데이트가 필요합니다.");
              }

              throw dailyError;
            }
          } catch (err) {
            if (isMissingRelationError(err as SupabaseErrorLike)) {
              throw new Error("날짜별 참여자 저장 테이블이 없어 지출을 추가하지 않았습니다. Supabase 스키마 업데이트가 필요합니다.");
            }

            throw err;
          }
        }
      } catch (relatedDataError) {
        const { error: rollbackError } = await supabase
          .from("expenses")
          .delete()
          .eq("id", createdExpenseId);

        if (rollbackError) {
          console.error("참여자 저장 실패 후 지출 되돌리기 실패:", rollbackError);
        }

        throw relatedDataError;
      }

      await fetchExpenses();
      return createdExpense;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "지출 추가 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateExpense = async (
    id: string,
    updates: Partial<Expense>,
    participantIds?: string[],
    customAmounts?: Record<string, number>,
    dailyParticipants?: Record<string, string[]>
  ) => {
    try {
      // Update expense
      const { data, error } = await (supabase
        .from("expenses") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update expense participants if provided
      if (participantIds !== undefined) {
        // Delete existing participants
        const { error: deleteError } = await supabase
          .from("expense_participants")
          .delete()
          .eq("expense_id", id);

        if (deleteError) {
          console.error("expense_participants 삭제 오류:", deleteError);
          throw deleteError;
        }

        // Insert new participants
        if (participantIds.length > 0) {
          const expenseParticipants = participantIds.map((pid) => ({
            expense_id: id,
            participant_id: pid,
            custom_amount: customAmounts?.[pid] || undefined,
          }));

          const { error: participantsError } = await supabase
            .from("expense_participants")
            .insert(expenseParticipants as any);

          if (participantsError) throw participantsError;
        }
      }

      // Update daily participants if provided
      // dailyParticipants가 undefined가 아니면 항상 업데이트 (빈 객체면 모든 daily participants 삭제)
      if (dailyParticipants !== undefined) {
        try {
          // Delete existing daily participants
          const { error: deleteDailyError } = await supabase
            .from("expense_daily_participants")
            .delete()
            .eq("expense_id", id);

          if (deleteDailyError) {
            const errorCode = deleteDailyError.code || "";
            const errorMessage = deleteDailyError.message || "";
            
            // 테이블이 없으면 경고만 출력
            if (errorCode !== "42P01" && !errorMessage.includes("does not exist")) {
              console.error("expense_daily_participants 삭제 오류:", deleteDailyError);
            }
          }

          // Insert new daily participants (빈 객체가 아닐 때만)
          if (dailyParticipants && Object.keys(dailyParticipants).length > 0) {
            const dailyParticipantsData: any[] = [];
            Object.entries(dailyParticipants).forEach(([date, pids]) => {
              if (pids && pids.length > 0) {
                pids.forEach((pid) => {
                  dailyParticipantsData.push({
                    expense_id: id,
                    participant_id: pid,
                    date: date,
                  });
                });
              }
            });

            if (dailyParticipantsData.length > 0) {
              const { error: dailyError } = await supabase
                .from("expense_daily_participants")
                .insert(dailyParticipantsData as any);

              if (dailyError) {
                const errorCode = dailyError.code || "";
                const errorMessage = dailyError.message || "";
                
                // 테이블이 없으면 경고만 출력
                if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
                  console.warn("expense_daily_participants 테이블이 없습니다. SCHEMA_UPDATE_V2.sql을 실행해주세요.");
                } else {
                  throw dailyError;
                }
              }
            }
          }
        } catch (err: any) {
          const errorCode = err?.code || "";
          const errorMessage = err?.message || "";
          
          // 테이블이 없으면 경고만 출력하고 계속 진행
          if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
            console.warn("expense_daily_participants 테이블이 없습니다. SCHEMA_UPDATE_V2.sql을 실행해주세요.");
          } else {
            throw err;
          }
        }
      }

      await fetchExpenses();
      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "지출 수정 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      // 먼저 관련 테이블 데이터 삭제 (CASCADE가 설정되어 있어도 명시적으로 삭제)
      // expense_daily_participants 삭제
      try {
        await supabase
          .from("expense_daily_participants")
          .delete()
          .eq("expense_id", id);
      } catch (err: any) {
        // 테이블이 없으면 무시
        const errorCode = err?.code || "";
        const errorMessage = err?.message || "";
        if (errorCode !== "42P01" && !errorMessage.includes("does not exist")) {
          console.warn("expense_daily_participants 삭제 중 오류:", err);
        }
      }

      // expense_participants 삭제
      try {
        await supabase
          .from("expense_participants")
          .delete()
          .eq("expense_id", id);
      } catch (err) {
        console.error("expense_participants 삭제 중 오류:", err);
      }

      // expenses 삭제 (CASCADE로 관련 데이터도 자동 삭제되지만 명시적으로 처리)
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      await fetchExpenses();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "지출 삭제 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    expenses,
    loading,
    error,
    addExpense,
    updateExpense,
    deleteExpense,
    refetch: fetchExpenses,
  };
}
