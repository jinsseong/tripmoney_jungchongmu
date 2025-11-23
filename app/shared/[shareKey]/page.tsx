"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
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

export default function SettlementDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const shareKey = params.shareKey as string;
  const { getDashboard, loading } = useSharedDashboard();
  const [dashboard, setDashboard] = useState<any>(null);
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  
  // 정산 계산용 상태 (모든 useState는 최상단에!)
  const [userTotals, setUserTotals] = useState<any[]>([]);
  const [transfers, setTransfers] = useState<any[]>([]);
  
  // trip_id가 있으면 지출 데이터 가져오기
  const tripId = dashboard?.trip_id || undefined;
  const { expenses, loading: expensesLoading } = useExpenses(tripId);
  const { categories, loading: categoriesLoading } = useCategories();

  useEffect(() => {
    if (shareKey) {
      loadDashboard();
    }
  }, [shareKey]);

  const loadDashboard = async (providedPassword?: string) => {
    try {
      const result = await getDashboard(shareKey, providedPassword);
      setDashboard(result.dashboard);
      setSnapshots(result.snapshots);
      setShowPasswordModal(false);
    } catch (error: any) {
      if (error.message.includes("비밀번호")) {
        setShowPasswordModal(true);
        setPasswordError(error.message);
      } else {
        alert("대시보드를 불러올 수 없습니다.");
        router.push("/");
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    await loadDashboard(password);
  };

  // 실제 지출 데이터가 있으면 정산 계산, 없으면 스냅샷 데이터 사용
  useEffect(() => {
    if (dashboard?.trip_id && expenses.length > 0) {
      // 실시간 정산 계산
      const { calculateConsolidatedSettlement, calculateSettlementBalance, optimizeTransfers } = 
        require("@/lib/settlement-calculator");
      
      const participants = snapshots.map((s) => ({
        id: s.participant_id,
        name: s.participant_name,
      }));
      
      const totals = calculateConsolidatedSettlement(
        expenses,
        [],
        [],
        participants
      );
      
      const balances = calculateSettlementBalance(expenses, [], totals);
      
      const totalsWithBalance = totals.map((total: any) => {
        const balance = balances.find((b: any) => b.participant_id === total.id);
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
        netBalance: 0,
      }));
      setUserTotals(snapshotTotals);
      setTransfers([]);
    }
  }, [dashboard, expenses, snapshots]);

  // 모든 Hook 호출 이후에 early return
  if (loading && !dashboard) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const totalAmount = snapshots.reduce(
    (sum, s) => sum + s.total_amount,
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 대시보드 헤더 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{dashboard.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {dashboard.description && (
              <p className="text-gray-600 mb-4">{dashboard.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>
                기간: {new Date(dashboard.start_date).toLocaleDateString(
                  "ko-KR"
                )}{" "}
                ~ {new Date(dashboard.end_date).toLocaleDateString("ko-KR")}
              </span>
              <span>조회수: {dashboard.view_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* 총 사용금액 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>총 사용금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(totalAmount, "KRW")}
            </div>
            <div className="text-sm text-gray-500 mt-2">
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
                  participants={snapshots.map((s) => ({
                    id: s.participant_id,
                    name: s.participant_name,
                    color: "",
                    created_at: "",
                  }))}
                  showDetailModal={false}
                />
              </CardContent>
            </Card>
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
            <div className="flex gap-2">
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

