"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useTripParticipants } from "@/hooks/useTripParticipants";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Card } from "@/components/ui/Card";
import { Expense, Category } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useTrips } from "@/hooks/useTrips";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AddExpensePage() {
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const { participants, loading: participantsLoading } = useTripParticipants(tripId);
  const { trips } = useTrips();
  const { addExpense, refetch } = useExpenses(tripId || undefined);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const router = useRouter();

  // 여행이 선택되지 않았으면 대시보드로 리다이렉트
  useEffect(() => {
    if (!tripId) {
      router.push("/");
    }
  }, [tripId, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from("categories")
          .select("*")
          .order("is_default", { ascending: false })
          .order("name", { ascending: true });

        if (error) throw error;

        // If no categories, create default ones
        if (!data || data.length === 0) {
          const defaultCategories = [
            { name: "식사", icon: "🍽️", color: "#FF6B6B", is_default: true },
            { name: "카페/음료", icon: "☕", color: "#4ECDC4", is_default: true },
            { name: "교통", icon: "🚗", color: "#45B7D1", is_default: true },
            { name: "숙박", icon: "🏨", color: "#96CEB4", is_default: true },
            { name: "액티비티", icon: "🎯", color: "#FFEAA7", is_default: true },
            { name: "쇼핑", icon: "🛍️", color: "#DDA0DD", is_default: true },
            { name: "숙/유흥", icon: "🍻", color: "#FF8C42", is_default: true },
            { name: "기타", icon: "💊", color: "#98D8C8", is_default: true },
          ];

          const { data: inserted, error: insertError } = await supabase
            .from("categories")
            .insert(defaultCategories)
            .select();

          if (insertError) throw insertError;
          setCategories(inserted || []);
        } else {
          setCategories(data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleSubmit = async (
    expenseData: Partial<Expense>,
    participantIds: string[],
    customAmounts?: Record<string, number>,
    dailyParticipants?: Record<string, string[]>
  ) => {
    try {
      // trip_id 추가
      const expenseWithTrip = {
        ...expenseData,
        trip_id: tripId || null,
      };
      await addExpense(expenseWithTrip, participantIds, customAmounts, dailyParticipants);
      await refetch();
      router.push(tripId ? `/dashboard?trip=${tripId}` : "/dashboard");
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("지출 추가에 실패했습니다. 다시 시도해주세요.");
    }
  };

  if (participantsLoading || loadingCategories) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (participants.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 safe-area">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <Link href={tripId ? `/dashboard?trip=${tripId}` : "/"}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-1" />
              뒤로
            </Button>
          </Link>
          <Card>
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                이 여행에 참여자가 없습니다. 먼저 참여자를 추가해주세요.
              </p>
              <Link href={tripId ? `/participants?trip=${tripId}` : "/participants"}>
                <Button variant="primary">참여자 추가하기</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href={tripId ? `/dashboard?trip=${tripId}` : "/dashboard"}>
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">지출 추가</h1>

        <Card>
          <div className="p-6">
            <ExpenseForm
              participants={participants}
              categories={categories}
              onSubmit={handleSubmit}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

