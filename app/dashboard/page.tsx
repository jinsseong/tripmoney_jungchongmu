"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { useParticipants } from "@/hooks/useParticipants";
import { useTripParticipants } from "@/hooks/useTripParticipants";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseList } from "@/components/ExpenseList";
import { SettlementSummary } from "@/components/SettlementSummary";
import { TripDateSelector } from "@/components/TripDateSelector";
import { ExpenseChart } from "@/components/ExpenseChart";
import { CreateSharedDashboardModal } from "@/components/CreateSharedDashboardModal";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useSharedDashboard } from "@/hooks/useSharedDashboard";
import { useCategories } from "@/hooks/useCategories";
import { useTrips } from "@/hooks/useTrips";
import {
  calculateConsolidatedSettlement,
  calculateSettlementBalance,
  optimizeTransfers,
} from "@/lib/settlement-calculator";
import { Expense, DailyParticipation } from "@/lib/types";
import { formatCurrency, getDateRange, cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    searchParams.get("trip") || null
  );
  const { participants: allParticipants } = useParticipants();
  const {
    participants,
    loading: participantsLoading,
  } = useTripParticipants(selectedTripId);
  const { trips, loading: tripsLoading } = useTrips();
  const { expenses, loading: expensesLoading } = useExpenses(selectedTripId || undefined);
  const { categories, loading: categoriesLoading } = useCategories();
  const [userTotals, setUserTotals] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { createDashboard, createSnapshot } = useSharedDashboard();
  const { updateExpense, deleteExpense } = useExpenses(selectedTripId || undefined);

  // 선택된 여행 또는 첫 번째 여행
  const currentTrip = selectedTripId
    ? trips.find((t) => t.id === selectedTripId)
    : trips[0] || null;

  // 선택된 날짜의 지출 필터링
  const filteredExpenses = selectedDate
    ? expenses.filter(
        (exp) => exp.date === format(selectedDate, "yyyy-MM-dd")
      )
    : expenses;

  // 날짜별 지출 금액 계산
  const expensesByDate = expenses.reduce((acc, exp) => {
    if (!acc[exp.date]) {
      acc[exp.date] = 0;
    }
    acc[exp.date] += exp.amount;
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    // Calculate total amount
    const expensesTotal = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    setTotalAmount(expensesTotal);

    if (participants.length > 0) {
      // Calculate settlement
      const totals = calculateConsolidatedSettlement(
        expenses,
        [],
        [],
        participants.map((p) => ({ id: p.id, name: p.name }))
      );

      // Calculate balances
      const balances = calculateSettlementBalance(expenses, [], totals);

      // Update totals with balance info
      const totalsWithBalance = totals.map((total) => {
        const balance = balances.find((b) => b.participant_id === total.id);
        return {
          ...total,
          totalPaid: balance?.total_paid || 0,
          totalOwed: balance?.total_owed || 0,
          netBalance: balance?.net_balance || 0,
        };
      });

      setUserTotals(totalsWithBalance);
      setTransfers(optimizeTransfers(balances));
    } else {
      setUserTotals([]);
      setTransfers([]);
    }
  }, [expenses, participants]);

  const loading =
    participantsLoading ||
    tripsLoading ||
    expensesLoading ||
    categoriesLoading;

  // 여행이 없으면 기본 날짜 범위 설정
  const defaultStartDate = currentTrip?.start_date || new Date().toISOString().split("T")[0];
  const defaultEndDate = currentTrip?.end_date || new Date().toISOString().split("T")[0];

  // 초기 선택 날짜 설정
  useEffect(() => {
    if (currentTrip && !selectedDate) {
      const today = new Date();
      const start = new Date(currentTrip.start_date);
      const end = new Date(currentTrip.end_date);
      if (today >= start && today <= end) {
        setSelectedDate(today);
      } else {
        setSelectedDate(start);
      }
    }
  }, [currentTrip]);

  // URL 파라미터 변경 시 selectedTripId 업데이트
  useEffect(() => {
    const tripParam = searchParams.get("trip");
    if (tripParam && tripParam !== selectedTripId) {
      setSelectedTripId(tripParam);
    } else if (!tripParam) {
      // 여행이 선택되지 않았으면 홈으로 리다이렉트
      if (trips.length === 0) {
        router.push("/");
      } else if (!selectedTripId) {
        // 첫 번째 여행으로 자동 선택
        router.push(`/dashboard?trip=${trips[0].id}`);
      }
    }
  }, [searchParams, trips, selectedTripId, router]);

  return (
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              뒤로
            </Button>
          </Link>
          <div className="flex gap-2">
            <Link
              href={
                selectedTripId
                  ? `/participants?trip=${selectedTripId}`
                  : "/participants"
              }
            >
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-1" />
                참가자
              </Button>
            </Link>
            <Link href={selectedTripId ? `/settings?trip=${selectedTripId}` : "/settings"}>
              <Button variant="outline" size="sm">
                총무 관리
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowShareModal(true)}
            >
              정산 대시보드
            </Button>
            <Link
              href={
                selectedTripId
                  ? `/add-expense?trip=${selectedTripId}`
                  : "/add-expense"
              }
            >
              <Button variant="primary" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                지출 추가
              </Button>
            </Link>
          </div>
        </div>

        {/* 여행이 없으면 홈으로 리다이렉트 */}
        {!currentTrip && !tripsLoading && trips.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">등록된 여행이 없습니다.</p>
            <Link href="/">
              <Button variant="primary">여행 선택하기</Button>
            </Link>
          </div>
        ) : currentTrip ? (
          <>
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {currentTrip.name}
            </h1>


        {loading ? (
          <div className="text-center py-12 text-gray-500">로딩 중...</div>
        ) : (
          <>
            {/* 총 사용금액 카드 */}
            <Card className="mb-4">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">총쓴돈</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(totalAmount, "KRW")}
                  </div>
                </div>
                <button className="p-2 rounded-lg hover:bg-gray-100">
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            </Card>

            {/* 여행 기간 날짜 선택기 */}
            {currentTrip ? (
              <div className="mb-6">
                <TripDateSelector
                  startDate={currentTrip.start_date}
                  endDate={currentTrip.end_date}
                  selectedDate={selectedDate}
                  onDateSelect={setSelectedDate}
                  expensesByDate={expensesByDate}
                />
              </div>
            ) : trips.length === 0 ? (
              <Card className="mb-6">
                <div className="p-8 text-center">
                  <p className="text-gray-600 mb-4">
                    여행을 먼저 추가해주세요.
                  </p>
                  <Link href="/trips">
                    <Button variant="primary">여행 추가하기</Button>
                  </Link>
                </div>
              </Card>
            ) : null}

            {/* 선택된 날짜의 지출 내역 - 날짜 선택기 바로 아래 */}
            <div className="mb-6">
              {selectedDate ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold">
                      {format(selectedDate, "yyyy년 M월 d일 (EEE)", {
                        locale: ko,
                      })}
                    </h2>
                  </div>
                  {filteredExpenses.length > 0 ? (
                    <ExpenseList
                      expenses={filteredExpenses}
                      participants={participants}
                      onEdit={(expense) => {
                        setEditingExpense(expense);
                        setShowEditModal(true);
                      }}
                      onDelete={async (expenseId) => {
                        if (confirm("정말 삭제하시겠습니까?")) {
                          try {
                            await deleteExpense(expenseId);
                          } catch (error) {
                            console.error("Error deleting expense:", error);
                            alert("지출 삭제에 실패했습니다.");
                          }
                        }
                      }}
                    />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-gray-500">
                        이 날짜에 지출 내역이 없습니다.
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <div>
                  <h2 className="text-xl font-semibold mb-4">지출 내역</h2>
                  {expenses.length > 0 ? (
                    <ExpenseList
                      expenses={expenses}
                      participants={participants}
                      onEdit={(expense) => {
                        setEditingExpense(expense);
                        setShowEditModal(true);
                      }}
                      onDelete={async (expenseId) => {
                        if (confirm("정말 삭제하시겠습니까?")) {
                          try {
                            await deleteExpense(expenseId);
                          } catch (error) {
                            console.error("Error deleting expense:", error);
                            alert("지출 삭제에 실패했습니다.");
                          }
                        }
                      }}
                    />
                  ) : (
                    <Card>
                      <div className="text-center py-12 text-gray-500">
                        지출 내역이 없습니다.
                      </div>
                    </Card>
                  )}
                </div>
              )}
            </div>

            {/* 정산 요약 - 각자 사용한 금액 */}
            {participants.length > 0 && (
              <div className="mb-6">
                <SettlementSummary
                  userTotals={userTotals}
                  transfers={transfers}
                  expenses={expenses}
                  participants={participants}
                />
              </div>
            )}

            {/* 지출 패턴 분석 */}
            {expenses.length > 0 && categories.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <ExpenseChart
                    expenses={expenses}
                    categories={categories}
                    type="category"
                  />
                  <ExpenseChart
                    expenses={expenses}
                    categories={categories}
                    type="daily"
                  />
                </div>
              )}
          </>
        )}
        </>
        ) : null}
      </div>
      <PWAInstallPrompt />
      <CreateSharedDashboardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        tripName={currentTrip?.name}
        onCreate={async (password) => {
          if (!currentTrip) {
            throw new Error("여행이 선택되지 않았습니다.");
          }

          const dashboard = await createDashboard(
            selectedTripId || null,
            `${currentTrip.name} 정산`,
            currentTrip.description || "",
            currentTrip.start_date,
            currentTrip.end_date,
            password
          );

          // Create snapshots for each participant
          for (const userTotal of userTotals) {
            await createSnapshot(
              dashboard.id,
              userTotal.id,
              userTotal.name,
              userTotal.regularAmount,
              userTotal.sharedAmount,
              userTotal.totalAmount,
              {}
            );
          }

          return {
            shareUrl: dashboard.shareUrl,
            shareKey: dashboard.share_key,
          };
        }}
      />
      
      {/* 지출 수정 모달 */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingExpense(null);
        }}
        title="지출 수정"
        size="lg"
      >
        <div className="p-4">
          {editingExpense && (
            <ExpenseForm
              participants={participants}
              categories={categories}
              initialExpense={editingExpense}
              onSubmit={async (
                expenseData: Partial<Expense>,
                participantIds: string[],
                customAmounts?: Record<string, number>,
                dailyParticipants?: Record<string, string[]>
              ) => {
                try {
                  await updateExpense(
                    editingExpense.id,
                    expenseData,
                    participantIds,
                    customAmounts,
                    dailyParticipants
                  );
                  setShowEditModal(false);
                  setEditingExpense(null);
                } catch (error) {
                  console.error("Error updating expense:", error);
                  alert("지출 수정에 실패했습니다.");
                }
              }}
              onCancel={() => {
                setShowEditModal(false);
                setEditingExpense(null);
              }}
            />
          )}
        </div>
      </Modal>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

