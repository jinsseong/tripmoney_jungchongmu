"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Expense } from "@/lib/types";

export function useExpenses(tripId?: string, date?: string) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
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

      // 날짜별 참여자 정보 가져오기 (테이블이 있는 경우)
      const expensesWithDailyParticipants = await Promise.all(
        (data || []).map(async (expense) => {
          try {
            const { data: dailyParticipants } = await supabase
              .from("expense_daily_participants")
              .select("*")
              .eq("expense_id", expense.id);
            
            // 카테고리 정보 추가
            let categoryName = expense.category;
            if (expense.categories && expense.categories.name) {
              categoryName = expense.categories.name;
            }

            return {
              ...expense,
              daily_participants: dailyParticipants || [],
              category: categoryName,
            };
          } catch (err) {
            // 테이블이 없으면 무시
            return expense;
          }
        })
      );

      setExpenses(expensesWithDailyParticipants);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "지출 조회 실패");
      console.error("Error fetching expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [tripId, date]);

  const addExpense = async (
    expenseData: Partial<Expense>,
    participantIds: string[],
    customAmounts?: Record<string, number>,
    dailyParticipants?: Record<string, string[]>
  ) => {
    try {
      // Insert expense (need trip_id, set to null for now if not provided)
      const expenseToInsert = {
        ...expenseData,
        trip_id: expenseData.trip_id || null,
      };

      // @ts-expect-error - Supabase types may not be available during build
      const { data: expense, error: expenseError } = await supabase
        .from("expenses")
        .insert([expenseToInsert])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Insert expense participants
      if (participantIds.length > 0) {
        const expenseParticipants = participantIds.map((pid) => ({
          expense_id: expense.id,
          participant_id: pid,
          custom_amount: customAmounts?.[pid] || undefined,
        }));

        // @ts-expect-error - Supabase types may not be available during build
        const { error: participantsError } = await supabase
          .from("expense_participants")
          .insert(expenseParticipants);

        if (participantsError) throw participantsError;
      }

      // Insert daily participants (if provided)
      if (dailyParticipants && Object.keys(dailyParticipants).length > 0) {
        const dailyParticipantsData: any[] = [];
        Object.entries(dailyParticipants).forEach(([date, pids]) => {
          pids.forEach((pid) => {
            dailyParticipantsData.push({
              expense_id: expense.id,
              participant_id: pid,
              date: date,
            });
          });
        });

        try {
          // @ts-expect-error - Supabase types may not be available during build
          const { error: dailyError } = await supabase
            .from("expense_daily_participants")
            .insert(dailyParticipantsData);

          if (dailyError) {
            const errorCode = dailyError.code || "";
            const errorMessage = dailyError.message || "";
            
            // 테이블이 없으면 경고만 출력하고 계속 진행
            if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
              console.warn("expense_daily_participants 테이블이 없습니다. SCHEMA_UPDATE_V2.sql을 실행해주세요.");
              console.warn("날짜별 참여자 정보는 저장되지 않았지만, 지출은 정상적으로 추가됩니다.");
            } else {
              throw dailyError;
            }
          }
        } catch (err: any) {
          const errorCode = err?.code || "";
          const errorMessage = err?.message || "";
          
          // 테이블이 없으면 경고만 출력하고 계속 진행
          if (errorCode === "42P01" || errorMessage.includes("does not exist")) {
            console.warn("expense_daily_participants 테이블이 없습니다. SCHEMA_UPDATE_V2.sql을 실행해주세요.");
            console.warn("날짜별 참여자 정보는 저장되지 않았지만, 지출은 정상적으로 추가됩니다.");
          } else {
            throw err;
          }
        }
      }

      await fetchExpenses();
      return expense;
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
      const { data, error } = await supabase
        .from("expenses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;

      // Update expense participants if provided
      if (participantIds !== undefined) {
        // Delete existing participants
        await supabase
          .from("expense_participants")
          .delete()
          .eq("expense_id", id);

        // Insert new participants
        if (participantIds.length > 0) {
          const expenseParticipants = participantIds.map((pid) => ({
            expense_id: id,
            participant_id: pid,
            custom_amount: customAmounts?.[pid] || undefined,
          }));

          // @ts-expect-error - Supabase types may not be available during build
          const { error: participantsError } = await supabase
            .from("expense_participants")
            .insert(expenseParticipants);

          if (participantsError) throw participantsError;
        }
      }

      // Update daily participants if provided
      if (dailyParticipants !== undefined) {
        try {
          // Delete existing daily participants
          await supabase
            .from("expense_daily_participants")
            .delete()
            .eq("expense_id", id);

          // Insert new daily participants
          if (Object.keys(dailyParticipants).length > 0) {
            const dailyParticipantsData: any[] = [];
            Object.entries(dailyParticipants).forEach(([date, pids]) => {
              pids.forEach((pid) => {
                dailyParticipantsData.push({
                  expense_id: id,
                  participant_id: pid,
                  date: date,
                });
              });
            });

            // @ts-expect-error - Supabase types may not be available during build
            const { error: dailyError } = await supabase
              .from("expense_daily_participants")
              .insert(dailyParticipantsData);

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
        } catch (err: any) {
          const errorCode = err?.code || "";
          const errorMessage = err?.message || "";
          
          // 테이블이 없으면 경고만 출력
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

