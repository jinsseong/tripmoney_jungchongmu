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
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
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

  const loadDashboard = useCallback(async (providedPassword?: string) => {
    try {
      if (!shareKey) return;
      const result = (await getDashboard(
        shareKey,
        providedPassword
      )) as SharedDashboardResult;
      setDashboard(result.dashboard);
      setSnapshots(result.snapshots);
      setShowPasswordModal(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "대시보드를 불러올 수 없습니다.";

      if (message.includes("비밀번호")) {
        setShowPasswordModal(true);
        setPasswordError(message);
      } else {
        alert("대시보드를 불러올 수 없습니다.");
        router.push("/");
      }
    }
  }, [getDashboard, router, shareKey]);

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

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    await loadDashboard(password);
  };

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

  if (!dashboard) {
    return null;
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

        {/* 비밀번호 모달 */}
        <Modal
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            router.push("/");
          }}
          title="비밀번호 입력"
          showCloseButton={false}
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <Input
              label="비밀번호"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              error={passwordError}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                className="flex-1"
              >
                취소
              </Button>
              <Button type="submit" variant="primary" className="flex-1">
                확인
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </div>
  );
}
