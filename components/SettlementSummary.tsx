"use client";

import React, { useMemo, useState } from "react";
import { UserTotal, SettlementTransfer, SettlementBalance } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { formatCurrency, getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { validateSettlement, validateTransfers } from "@/lib/settlement-calculator";
import { CheckCircle, AlertCircle, X } from "lucide-react";
import { Modal } from "./ui/Modal";

interface SettlementSummaryProps {
  userTotals: UserTotal[];
  transfers: SettlementTransfer[];
  expenses?: any[];
  participants?: any[];
  currency?: string;
}

export const SettlementSummary: React.FC<SettlementSummaryProps> = ({
  userTotals,
  transfers,
  currency = "KRW",
}) => {
  const [selectedUser, setSelectedUser] = useState<UserTotal | null>(null);
  const [showModal, setShowModal] = useState(false);

  // 정산 검증
  const validation = useMemo(() => {
    // userTotals에서 balance 정보 추출
    const balances: SettlementBalance[] = userTotals.map((user) => ({
      participant_id: user.id,
      participant_name: user.name,
      total_paid: user.totalPaid || 0,
      total_owed: user.totalAmount,
      net_balance: user.netBalance || 0,
    }));

    const settlementValidation = validateSettlement(balances);
    const transferValidation = validateTransfers(balances, transfers);

    return {
      settlement: settlementValidation,
      transfer: transferValidation,
    };
  }, [userTotals, transfers]);

  // 특정 사용자의 송금/수령 내역 필터링
  const getUserTransfers = (userId: string) => {
    const toReceive = transfers.filter((t) => t.to.id === userId);
    const toSend = transfers.filter((t) => t.from.id === userId);
    return { toReceive, toSend };
  };

  const handleUserClick = (user: UserTotal) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 정산 검증 상태 */}
      {validation.settlement.isValid ? (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
          <span className="text-sm text-green-700 font-medium">
            {validation.settlement.message}
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <span className="text-sm text-red-700 font-medium">
            {validation.settlement.message}
          </span>
        </div>
      )}

      {/* 개인별 정산 현황 */}
      <Card>
        <CardHeader>
          <CardTitle>개인별 정산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userTotals.map((user) => {
              const isPositive = (user.netBalance || 0) > 0;
              const isNegative = (user.netBalance || 0) < 0;
              const isZero = (user.netBalance || 0) === 0;

              return (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="flex w-full flex-col gap-3 rounded-lg bg-gray-50 p-4 text-left transition-colors hover:bg-gray-100 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{
                        backgroundColor: isPositive
                          ? "#10B981"
                          : isNegative
                          ? "#EF4444"
                          : "#6B7280",
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="truncate font-semibold">{user.name}</div>
                      <div className="text-sm text-gray-500">
                        사용한 금액: {formatCurrency(user.totalAmount, currency)}
                      </div>
                      {user.totalPaid !== undefined && (
                        <div className="text-xs text-gray-400 mt-0.5">
                          지불한 금액: {formatCurrency(user.totalPaid, currency)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div
                      className={cn(
                        "break-all text-xl font-bold sm:text-lg",
                        isPositive && "text-green-600",
                        isNegative && "text-red-600",
                        isZero && "text-gray-600"
                      )}
                    >
                      {isPositive && "+"}
                      {formatCurrency(user.netBalance || 0, currency)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isPositive
                        ? "받을 금액"
                        : isNegative
                        ? "낼 금액"
                        : "정산 완료"}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs text-gray-500">
            이름을 선택하면 상세 정산 내역을 확인할 수 있습니다
          </p>
        </CardContent>
      </Card>

      {/* 정산 원리 설명 (처음 사용자를 위한 안내) */}
      {userTotals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">정산 원리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong className="text-gray-900">1. 지출 분담:</strong> 각 지출마다 참여한 사람들만 n분의 1로 분담합니다.
              </p>
              <p>
                <strong className="text-gray-900">2. 차액 계산:</strong> (실제 결제 금액) - (부담해야 할 금액) = 받을/낼 돈
              </p>
              <p>
                <strong className="text-gray-900">3. 최적화:</strong> 가장 적은 송금 횟수로 정산을 완료합니다.
              </p>
              <p className="mt-3 text-xs">
                예시: A가 30,000원 지출(참여: A,B,C), B가 20,000원 지출(참여: B,C만) 
                → A는 10,000원 부담, B는 20,000원 부담, C는 20,000원 부담
                → A는 +20,000원(받을 돈), B는 0원, C는 -20,000원(낼 돈)
                → C가 A에게 20,000원 송금으로 정산 완료!
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 개인별 정산 상세 모달 */}
      {selectedUser && (
        <Modal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedUser(null);
          }}
          title={`${selectedUser.name}님의 정산 내역`}
        >
          <div className="space-y-6">
            {/* 요약 정보 */}
            <div className="rounded-lg border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white"
                    style={{
                      backgroundColor:
                        (selectedUser.netBalance || 0) > 0
                          ? "#10B981"
                          : (selectedUser.netBalance || 0) < 0
                          ? "#EF4444"
                          : "#6B7280",
                    }}
                  >
                    {getInitials(selectedUser.name)}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{selectedUser.name}</h3>
                    <p className="text-sm text-gray-600">정산 요약</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600 mb-1">사용한 금액</p>
                  <p className="break-all text-lg font-bold">
                    {formatCurrency(selectedUser.totalAmount, currency)}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-gray-600 mb-1">지불한 금액</p>
                  <p className="break-all text-lg font-bold">
                    {formatCurrency(selectedUser.totalPaid || 0, currency)}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-gray-700 font-medium">최종 정산 금액</span>
                  <span
                    className={cn(
                      "break-all text-2xl font-bold",
                      (selectedUser.netBalance || 0) > 0 && "text-green-600",
                      (selectedUser.netBalance || 0) < 0 && "text-red-600",
                      (selectedUser.netBalance || 0) === 0 && "text-gray-600"
                    )}
                  >
                    {(selectedUser.netBalance || 0) > 0 && "+"}
                    {formatCurrency(selectedUser.netBalance || 0, currency)}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {(selectedUser.netBalance || 0) > 0
                    ? "받으실 금액입니다"
                    : (selectedUser.netBalance || 0) < 0
                    ? "송금하실 금액입니다"
                    : "정산이 완료되었습니다"}
                </p>
              </div>
            </div>

            {/* 송금해야 할 내역 */}
            {(() => {
              const { toSend, toReceive } = getUserTransfers(selectedUser.id);
              
              return (
                <>
                  {toSend.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        보내야 할 금액
                      </h4>
                      <div className="space-y-2">
                        {toSend.map((transfer, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500 text-xs font-semibold text-white">
                                {getInitials(transfer.to.name)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {transfer.to.name}
                                </p>
                                <p className="text-xs text-gray-600">에게 송금</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="break-all text-lg font-bold text-red-600">
                                {formatCurrency(transfer.amount, currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="text-sm text-red-800">
                          <strong>총 {formatCurrency(
                            toSend.reduce((sum, t) => sum + t.amount, 0),
                            currency
                          )}</strong>를 송금해주세요.
                        </p>
                      </div>
                    </div>
                  )}

                  {toReceive.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-green-700 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        받으실 금액
                      </h4>
                      <div className="space-y-2">
                        {toReceive.map((transfer, index) => (
                          <div
                            key={index}
                            className="flex flex-col gap-3 rounded-lg border border-green-200 bg-green-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
                                {getInitials(transfer.from.name)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {transfer.from.name}
                                </p>
                                <p className="text-xs text-gray-600">로부터 수령</p>
                              </div>
                            </div>
                            <div className="text-left sm:text-right">
                              <p className="break-all text-lg font-bold text-green-600">
                                +{formatCurrency(transfer.amount, currency)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                        <p className="text-sm text-green-800">
                          <strong>총 {formatCurrency(
                            toReceive.reduce((sum, t) => sum + t.amount, 0),
                            currency
                          )}</strong>를 받으시게 됩니다.
                        </p>
                      </div>
                    </div>
                  )}

                  {toSend.length === 0 && toReceive.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 font-medium">
                        정산이 완료되었습니다!
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        보내거나 받을 금액이 없습니다.
                      </p>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        </Modal>
      )}
    </div>
  );
};
