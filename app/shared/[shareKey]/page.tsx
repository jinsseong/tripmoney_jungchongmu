"use client";

export const dynamic = "force-dynamic";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSharedDashboard } from "@/hooks/useSharedDashboard";
import { useExpenses } from "@/hooks/useExpenses";
import { useCategories } from "@/hooks/useCategories";
import { SettlementSummary } from "@/components/SettlementSummary";
import { ExpenseChart } from "@/components/ExpenseChart";
import { ExpenseList } from "@/components/ExpenseList";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  calculateConsolidatedSettlement,
  calculateSettlementBalance,
  optimizeTransfers,
} from "@/lib/settlement-calculator";
import {
  DashboardSnapshot,
  SettlementTransfer,
  SharedDashboard,
  UserTotal,
  Participant,
} from "@/lib/types";

type SharedDashboardResult = {
  dashboard: SharedDashboard;
  snapshots: DashboardSnapshot[];
};

export default function SettlementDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const shareKeyParam = params.shareKey;
  const shareKey = Array.isArray(shareKeyParam)
    ? shareKeyParam[0]
    : shareKeyParam;
  const { getDashboard, loading } = useSharedDashboard();
  const [dashboard, setDashboard] = useState<SharedDashboard | null>(null);
  const [snapshots, setSnapshots] = useState<DashboardSnapshot[]>([]);
  const [loadError, setLoadError] = useState("");
  
  // 정산 계산용 상태 (모든 useState는 최상단에!)
  const [userTotals, setUserTotals] = useState<UserTotal[]>([]);
  const [transfers, setTransfers] = useState<SettlementTransfer[]>([]);
  
  // trip_id가 있으면 지출 데이터 가져오기
  const tripId = dashboard?.trip_id || undefined;
  const { expenses, loading: expensesLoading } = useExpenses(
    tripId,
    undefined,
    { enabled: Boolean(tripId) }
  );
  const { categories, loading: categoriesLoading } = useCategories();

  const loadDashboard = useCallback(async () => {
    try {
      if (!shareKey) return;
      setLoadError("");
      const result = (await getDashboard(shareKey)) as SharedDashboardResult;
      setDashboard(result.dashboard);
      setSnapshots(result.snapshots);
    } catch (error) {
      console.error("Failed to load shared dashboard:", error);
      setLoadError(
        "공유 대시보드를 불러오지 못했습니다. 링크가 올바른지 확인해주세요."
      );
    }
  }, [getDashboard, shareKey]);

  useEffect(() => {
    if (shareKey) {
      loadDashboard();
    }
  }, [loadDashboard, shareKey]);

  const snapshotParticipants: Participant[] = useMemo(
    () =>
      snapshots
        .filter(
          (snapshot): snapshot is DashboardSnapshot & { participant_id: string } =>
            Boolean(snapshot.participant_id)
        )
        .map((snapshot) => ({
          id: snapshot.participant_id,
          name: snapshot.participant_name,
          avatar_color: "",
          created_at: "",
        })),
    [snapshots]
  );

  // 실제 지출 데이터가 있으면 정산 계산, 없으면 스냅샷 데이터 사용
  useEffect(() => {
    if (dashboard?.trip_id && expenses.length > 0) {
      const participants = snapshotParticipants.map((participant) => ({
        id: participant.id,
        name: participant.name,
      }));

      const totals = calculateConsolidatedSettlement(
        expenses,
        [],
        [],
        participants
      );
      
      const balances = calculateSettlementBalance(expenses, [], totals);
      
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
    } else if (snapshots.length > 0) {
      // 스냅샷 데이터 사용
      const snapshotTotals = snapshots.map((snapshot) => ({
        id: snapshot.participant_id || snapshot.id,
        name: snapshot.participant_name,
        regularAmount: snapshot.regular_amount,
        sharedAmount: snapshot.shared_amount,
        totalAmount: snapshot.total_amount,
        totalPaid: 0,
        totalOwed: snapshot.total_amount,
        netBalance: 0,
      }));
      setUserTotals(snapshotTotals);
      setTransfers([]);
    }
  }, [dashboard, expenses, snapshotParticipants, snapshots]);

  // 모든 Hook 호출 이후에 early return
  if (loading && !dashboard) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    );
  }

  if (!dashboard && loadError) {
    return (
      <main className="app-screen safe-area">
        <div className="page-container flex min-h-screen max-w-md items-center">
          <Card className="w-full text-center">
            <CardHeader>
              <CardTitle className="text-xl font-extrabold">
                공유 링크를 확인해주세요
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-6 text-[var(--muted)]">{loadError}</p>
              <Button
                type="button"
                variant="primary"
                className="mt-6 w-full"
                onClick={() => router.push("/")}
              >
                홈으로 돌아가기
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">공유 대시보드를 준비하는 중...</div>
      </div>
    );
  }

  const totalAmount =
    expenses.length > 0
      ? expenses.reduce((sum, expense) => sum + expense.amount, 0)
      : snapshots.reduce((sum, snapshot) => sum + snapshot.total_amount, 0);
  const isRefreshingDetails =
    Boolean(dashboard?.trip_id) && (expensesLoading || categoriesLoading);

  return (
    <div className="app-screen safe-area">
      <div className="page-container">
        {/* 대시보드 헤더 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="page-kicker mb-1">공유 정산</div>
            <CardTitle className="break-words text-2xl font-extrabold">
              {dashboard.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.description && (
              <p className="mb-4 text-sm leading-6 text-[var(--muted)]">
                {dashboard.description}
              </p>
            )}
            <div className="flex flex-col gap-2 text-sm text-[var(--muted)] sm:flex-row sm:items-center sm:gap-4">
              <span className="status-pill w-fit">
                기간: {new Date(dashboard.start_date).toLocaleDateString(
                  "ko-KR"
                )}{" "}
                ~ {new Date(dashboard.end_date).toLocaleDateString("ko-KR")}
              </span>
              <span className="status-pill w-fit">조회수: {dashboard.view_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {isRefreshingDetails && (
          <div className="mb-4 rounded-lg border border-[var(--surface-selected)] bg-[var(--primary-soft)] px-4 py-3 text-sm font-bold text-[var(--primary-pressed)]">
            최신 지출 내역을 불러오는 중...
          </div>
        )}

        {/* 총 사용금액 */}
        <Card className="summary-hero mb-6 !border-0 !border-t-[3px] !border-t-[var(--accent)] !bg-[var(--accent-soft)]">
          <CardContent>
            <div className="mb-1 text-sm font-bold opacity-70">총 사용금액</div>
            <div className="break-all text-3xl font-extrabold sm:text-4xl">
              {formatCurrency(totalAmount, "KRW")}
            </div>
            <div className="mt-2 text-sm font-bold opacity-70">
              {snapshots.length}명 참여
            </div>
          </CardContent>
        </Card>

        {/* 정산 요약 */}
        {userTotals.length > 0 && (
          <div className="mb-6">
            <SettlementSummary userTotals={userTotals} transfers={transfers} />
          </div>
        )}

        {/* 지출 내역 */}
        {expenses.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle>지출 내역</CardTitle>
              </CardHeader>
              <CardContent>
                <ExpenseList
                  expenses={expenses}
                  participants={snapshotParticipants}
                  showDetailModal={false}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* 지출 패턴 분석 */}
        {expenses.length > 0 && categories.length > 0 && (
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
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
      </div>
    </div>
  );
}
