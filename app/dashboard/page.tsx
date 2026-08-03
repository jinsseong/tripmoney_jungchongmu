"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { useTripParticipants } from "@/hooks/useTripParticipants";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseList } from "@/components/ExpenseList";
import { SettlementSummary } from "@/components/SettlementSummary";
import { TripDateSelector } from "@/components/TripDateSelector";
import { ExpenseChart } from "@/components/ExpenseChart";
import { CreateSharedDashboardModal } from "@/components/CreateSharedDashboardModal";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseReportInbox } from "@/components/ExpenseReportInbox";
import { PersonalSettlementPanel } from "@/components/PersonalSettlementPanel";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { useSharedDashboard } from "@/hooks/useSharedDashboard";
import { useCategories } from "@/hooks/useCategories";
import { useTrips } from "@/hooks/useTrips";
import { useExpenseReports } from "@/hooks/useExpenseReports";
import {
  calculateConsolidatedSettlement,
  calculateSettlementBalance,
  optimizeTransfers,
} from "@/lib/settlement-calculator";
import { Expense, ExpenseReport } from "@/lib/types";
import {
  getParticipantIdForTrip,
  getTripAccessSession,
  TripAccessSession,
} from "@/lib/trip-access";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ArrowLeft, ClipboardList, Plus, ReceiptText, Settings, Share2, ShieldCheck, UserRound, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DashboardTab = "overview" | "personal" | "reports";

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [selectedTripId, setSelectedTripId] = useState<string | null>(
    searchParams.get("trip") || null
  );
  const requestedMode = searchParams.get("mode");
  const [accessSession, setAccessSession] = useState<TripAccessSession | null>(null);
  const [currentParticipantId, setCurrentParticipantId] = useState("");
  const isParticipantMode =
    requestedMode === "participant" || accessSession?.mode === "participant";
  const isAdminMode = !isParticipantMode;
  const {
    participants,
    loading: participantsLoading,
  } = useTripParticipants(selectedTripId);
  const { trips, loading: tripsLoading, updateTrip } = useTrips();
  const { 
    expenses, 
    loading: expensesLoading, 
    addExpense,
    updateExpense, 
    deleteExpense,
    refetch: refetchExpenses 
  } = useExpenses(selectedTripId || undefined, undefined, {
    enabled: Boolean(selectedTripId),
  });
  const { categories, loading: categoriesLoading } = useCategories();
  const {
    reports,
    loading: reportsLoading,
    error: reportsError,
    updateReportStatus,
    refetch: refetchReports,
  } = useExpenseReports(selectedTripId || undefined, Boolean(selectedTripId));
  const [userTotals, setUserTotals] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const { createDashboard, createSnapshot } = useSharedDashboard();

  useEffect(() => {
    setAccessSession(getTripAccessSession(selectedTripId));
    setCurrentParticipantId(getParticipantIdForTrip(selectedTripId));
  }, [selectedTripId, requestedMode]);

  useEffect(() => {
    if (isParticipantMode && activeTab === "reports") {
      setActiveTab("personal");
    }
  }, [activeTab, isParticipantMode]);

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
  const pendingReportCount = reports.filter(
    (report) => report.status === "pending"
  ).length;
  const reportExpenseUrl =
    currentTrip?.invite_key ? `/report-expense/${currentTrip.invite_key}` : "";

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

  const handleApproveReport = async (report: ExpenseReport) => {
    if (!isAdminMode) {
      throw new Error("관리자 모드에서만 제보를 승인할 수 있습니다.");
    }

    if (!selectedTripId) {
      throw new Error("여행이 선택되지 않았습니다.");
    }

    const payerId = report.payer_id || report.reporter_id;
    if (!payerId) {
      throw new Error("결제자 정보가 없는 제보입니다.");
    }

    const createdExpense = await addExpense(
      {
        trip_id: selectedTripId,
        amount: report.amount,
        item_name: report.item_name,
        category_id: report.category_id || undefined,
        payer_id: payerId,
        payment_type: report.payment_type,
        currency: report.currency,
        settlement_type: "equal",
        date: report.date,
        end_date: report.date,
        expense_date: report.date,
        receipt_image_url: report.receipt_image_url,
        memo: report.ocr_text ? `지출 제보 OCR:\n${report.ocr_text}` : undefined,
      },
      report.participant_ids
    );

    await updateReportStatus(report.id, "approved", createdExpense.id);
    await refetchExpenses();
    await refetchReports();
  };

  const handleRejectReport = async (report: ExpenseReport) => {
    if (!isAdminMode) {
      throw new Error("관리자 모드에서만 제보를 반려할 수 있습니다.");
    }

    await updateReportStatus(report.id, "rejected");
    await refetchReports();
  };

  return (
    <div className="app-screen safe-area">
      <div className="page-container pb-28">
        <div className="mb-5 space-y-3 sm:mb-6">
          <div className="flex items-center justify-between gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                뒤로
              </Button>
            </Link>
            <div className="hidden gap-2 sm:flex">
              <Link
                href={
                  selectedTripId
                    ? `/participants?trip=${selectedTripId}${isParticipantMode ? "&mode=participant" : ""}`
                    : "/participants"
                }
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Users className="h-4 w-4" />
                  참가자
                </Button>
              </Link>
              {isAdminMode ? (
                <>
                  <Link href={selectedTripId ? `/settings?trip=${selectedTripId}` : "/settings"}>
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Settings className="h-4 w-4" />
                      총무 관리
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowShareModal(true)}
                    className="gap-1.5"
                  >
                    <Share2 className="h-4 w-4" />
                    정산 대시보드
                  </Button>
                  <Link
                    href={
                      selectedTripId
                        ? `/add-expense?trip=${selectedTripId}`
                        : "/add-expense"
                    }
                  >
                    <Button variant="primary" size="sm" className="gap-1.5">
                      <Plus className="h-4 w-4" />
                      지출 추가
                    </Button>
                  </Link>
                </>
              ) : reportExpenseUrl ? (
                <Link href={reportExpenseUrl}>
                  <Button variant="primary" size="sm" className="gap-1.5">
                    <ReceiptText className="h-4 w-4" />
                    지출 제보
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>
          <div className={`grid gap-2 sm:hidden ${isAdminMode ? "grid-cols-3" : "grid-cols-2"}`}>
            <Link
              href={
                selectedTripId
                  ? `/participants?trip=${selectedTripId}${isParticipantMode ? "&mode=participant" : ""}`
                  : "/participants"
              }
            >
              <Button variant="outline" size="sm" className="w-full flex-col gap-1 px-2 text-xs">
                <Users className="h-4 w-4" />
                참가자
              </Button>
            </Link>
            {isAdminMode ? (
              <>
                <Link href={selectedTripId ? `/settings?trip=${selectedTripId}` : "/settings"}>
                  <Button variant="outline" size="sm" className="w-full flex-col gap-1 px-2 text-xs">
                    <Settings className="h-4 w-4" />
                    총무
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(true)}
                  className="w-full flex-col gap-1 px-2 text-xs"
                >
                  <Share2 className="h-4 w-4" />
                  공유
                </Button>
              </>
            ) : reportExpenseUrl ? (
              <Link href={reportExpenseUrl}>
                <Button variant="primary" size="sm" className="w-full flex-col gap-1 px-2 text-xs">
                  <ReceiptText className="h-4 w-4" />
                  제보
                </Button>
              </Link>
            ) : null}
          </div>
        </div>

        {/* 여행이 없으면 홈으로 리다이렉트 */}
        {!currentTrip && !tripsLoading && trips.length === 0 ? (
          <div className="py-12 text-center">
            <p className="mb-4 text-[#6b7684]">등록된 여행이 없습니다.</p>
            <Link href="/">
              <Button variant="primary">여행 선택하기</Button>
            </Link>
          </div>
        ) : currentTrip ? (
          <>
            <div className="mb-4 sm:mb-6">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <div className="page-kicker">정산 대시보드</div>
                <span className="status-pill">
                  {isAdminMode ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      관리자 모드
                    </>
                  ) : (
                    <>
                      <UserRound className="h-3.5 w-3.5" />
                      참가자 모드
                    </>
                  )}
                </span>
              </div>
              <h1 className="page-title break-words">{currentTrip.name}</h1>
            </div>

            <div className="segment-control mb-4" data-count={isAdminMode ? 3 : 2}>
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className="segment-item"
                data-active={activeTab === "overview"}
              >
                <ClipboardList className="h-4 w-4" />
                <span className="hidden sm:inline">전체 대시보드</span>
                <span className="sm:hidden">전체</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("personal")}
                className="segment-item"
                data-active={activeTab === "personal"}
              >
                <UserRound className="h-4 w-4" />
                <span className="hidden sm:inline">개인별 정산</span>
                <span className="sm:hidden">개인</span>
              </button>
              {isAdminMode && (
                <button
                  type="button"
                  onClick={() => setActiveTab("reports")}
                  className="segment-item"
                  data-active={activeTab === "reports"}
                >
                  <ReceiptText className="h-4 w-4" />
                  <span className="hidden sm:inline">지출 제보함</span>
                  <span className="sm:hidden">제보</span>
                  {pendingReportCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f04452] px-1 text-xs font-bold text-white">
                      {pendingReportCount}
                    </span>
                  )}
                </button>
              )}
            </div>

            {isParticipantMode && !currentParticipantId && currentTrip.invite_key && (
              <Card className="mb-4 border-[#ffe1ad] bg-[#fff8e8]">
                <div className="text-sm font-bold leading-6 text-[#9a6700]">
                  참가자 초대 링크로 닉네임을 등록하면 본인 이름으로 지출을 제보할 수 있습니다.
                </div>
                <Link href={`/join/${currentTrip.invite_key}`}>
                  <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5">
                    <UserRound className="h-4 w-4" />
                    참가자 등록하기
                  </Button>
                </Link>
              </Card>
            )}


        {loading ? (
          <div className="py-12 text-center text-[#6b7684]">로딩 중...</div>
        ) : activeTab === "overview" ? (
          <>
            {/* 총 사용금액 카드 */}
            <Card className="mb-4 bg-[#171719] text-white">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="mb-1 text-sm font-bold text-white/65">총 지출</div>
                  <div className="break-all text-3xl font-extrabold text-white sm:text-4xl">
                    {formatCurrency(totalAmount, "KRW")}
                  </div>
                </div>
                <div className="status-pill bg-white/12 text-white">
                  {expenses.length}건
                </div>
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
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-[#171719] sm:text-xl">
                      {format(selectedDate, "yyyy년 M월 d일 (EEE)", {
                        locale: ko,
                      })}
                    </h2>
                  </div>
                  {filteredExpenses.length > 0 ? (
                    <ExpenseList
                      expenses={filteredExpenses}
                      participants={participants}
                      onEdit={
                        isAdminMode
                          ? (expense) => {
                              setEditingExpense(expense);
                              setShowEditModal(true);
                            }
                          : undefined
                      }
                      onDelete={
                        isAdminMode
                          ? async (expenseId) => {
                              if (confirm("정말 삭제하시겠습니까?")) {
                                try {
                                  await deleteExpense(expenseId);
                                  await refetchExpenses();
                                } catch (error) {
                                  console.error("Error deleting expense:", error);
                                  alert("지출 삭제에 실패했습니다.");
                                }
                              }
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <Card>
                      <div className="py-12 text-center text-[#6b7684]">
                        이 날짜에 지출 내역이 없습니다.
                      </div>
                    </Card>
                  )}
                </>
              ) : (
                <div>
                  <h2 className="mb-4 text-xl font-bold text-[#171719]">지출 내역</h2>
                  {expenses.length > 0 ? (
                    <ExpenseList
                      expenses={expenses}
                      participants={participants}
                      onEdit={
                        isAdminMode
                          ? (expense) => {
                              setEditingExpense(expense);
                              setShowEditModal(true);
                            }
                          : undefined
                      }
                      onDelete={
                        isAdminMode
                          ? async (expenseId) => {
                              if (confirm("정말 삭제하시겠습니까?")) {
                                try {
                                  await deleteExpense(expenseId);
                                  await refetchExpenses();
                                } catch (error) {
                                  console.error("Error deleting expense:", error);
                                  alert("지출 삭제에 실패했습니다.");
                                }
                              }
                            }
                          : undefined
                      }
                    />
                  ) : (
                    <Card>
                      <div className="py-12 text-center text-[#6b7684]">
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
                <div className="grid grid-cols-1 gap-4 mb-6 md:grid-cols-2 md:gap-6">
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
        ) : activeTab === "personal" ? (
          <PersonalSettlementPanel
            participants={participants}
            expenses={expenses}
            userTotals={userTotals}
            transfers={transfers}
          />
        ) : (
          <ExpenseReportInbox
            reports={reports}
            participants={participants}
            loading={reportsLoading}
            error={reportsError}
            canManage={isAdminMode}
            onApprove={handleApproveReport}
            onReject={handleRejectReport}
          />
        )}
        </>
        ) : null}
      </div>
      <PWAInstallPrompt />
      {currentTrip && isAdminMode && (
        <div className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-40 px-4 pt-3 bottom-safe sm:hidden">
          <Link
            href={
              selectedTripId
                ? `/add-expense?trip=${selectedTripId}`
                : "/add-expense"
            }
          >
            <Button variant="primary" size="lg" className="w-full">
              <Plus className="h-5 w-5 mr-2" />
              지출 추가
            </Button>
          </Link>
        </div>
      )}
      {currentTrip && isParticipantMode && reportExpenseUrl && (
        <div className="mobile-bottom-bar fixed inset-x-0 bottom-0 z-40 px-4 pt-3 bottom-safe sm:hidden">
          <Link href={reportExpenseUrl}>
            <Button variant="primary" size="lg" className="w-full">
              <ReceiptText className="h-5 w-5 mr-2" />
              지출 제보하기
            </Button>
          </Link>
        </div>
      )}
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
        <div>
          {editingExpense && (
            <ExpenseForm
              participants={participants}
              categories={categories}
              trip={currentTrip}
              onTripUpdate={currentTrip && selectedTripId ? async (tripId, startDate, endDate) => {
                try {
                  await updateTrip(tripId, { start_date: startDate, end_date: endDate });
                } catch (error) {
                  console.error("Error updating trip:", error);
                  throw error;
                }
              } : undefined}
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
                  await refetchExpenses();
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
