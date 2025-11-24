"use client";

import React, { useState } from "react";
import { Expense, Participant } from "@/lib/types";
import { formatCurrency, formatNumber, getInitials } from "@/lib/utils";
import { Card } from "./ui/Card";
import { Modal } from "./ui/Modal";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface ExpenseListProps {
  expenses: Expense[];
  participants: Participant[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
  showDetailModal?: boolean; // 상세 모달 표시 여부 (기본: true)
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  participants,
  onEdit,
  onDelete,
  showDetailModal = true,
}) => {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getParticipant = (id: string) => {
    return participants.find((p) => p.id === id);
  };

  // 날짜별/인원별 분담 금액 계산
  const calculateSplitDetails = (expense: Expense) => {
    const details: Array<{
      participantId: string;
      participantName: string;
      amount: number;
      dates?: string[];
    }> = [];

    // 날짜별 참여자가 있는 경우 (교통/숙박)
    if (expense.daily_participants && expense.daily_participants.length > 0) {
      const byDate: Record<string, string[]> = {};
      expense.daily_participants.forEach((dp) => {
        if (!byDate[dp.date]) {
          byDate[dp.date] = [];
        }
        byDate[dp.date].push(dp.participant_id);
      });

      const dates = Object.keys(byDate).sort();
      const dailyAmount = Math.floor(expense.amount / dates.length);
      const dailyRemainder = expense.amount % dates.length;

      const participantTotals: Record<string, { amount: number; dates: string[] }> = {};

      dates.forEach((date, dateIndex) => {
        const dayParticipants = byDate[date];
        const dateAmount = dailyAmount + (dateIndex === 0 ? dailyRemainder : 0);
        const perPerson = Math.floor(dateAmount / dayParticipants.length);
        const remainder = dateAmount % dayParticipants.length;

        dayParticipants.forEach((pid, index) => {
          if (!participantTotals[pid]) {
            participantTotals[pid] = { amount: 0, dates: [] };
          }
          participantTotals[pid].amount += perPerson + (index === 0 ? remainder : 0);
          participantTotals[pid].dates.push(date);
        });
      });

      Object.entries(participantTotals).forEach(([pid, data]) => {
        const participant = getParticipant(pid);
        if (participant) {
          details.push({
            participantId: pid,
            participantName: participant.name,
            amount: data.amount,
            dates: data.dates,
          });
        }
      });
    } else {
      // 일반 지출
      const expenseParticipants = expense.expense_participants || [];
      if (expense.settlement_type === "equal") {
        const perPerson = Math.floor(expense.amount / expenseParticipants.length);
        const remainder = expense.amount % expenseParticipants.length;

        expenseParticipants.forEach((ep, index) => {
          const participant = getParticipant(ep.participant_id);
          if (participant) {
            details.push({
              participantId: ep.participant_id,
              participantName: participant.name,
              amount: perPerson + (index === 0 ? remainder : 0),
            });
          }
        });
      } else {
        // Custom settlement
        expenseParticipants.forEach((ep) => {
          const participant = getParticipant(ep.participant_id);
          if (participant && ep.custom_amount) {
            details.push({
              participantId: ep.participant_id,
              participantName: participant.name,
              amount: ep.custom_amount,
            });
          }
        });
      }
    }

    return details;
  };

  const groupedByDate = expenses.reduce((acc, expense) => {
    const date = expense.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  return (
    <div className="space-y-6">
      {Object.entries(groupedByDate).map(([date, dateExpenses]) => (
        <div key={date}>
          <div className="space-y-3">
            {dateExpenses.map((expense) => {
              const payer = getParticipant(expense.payer_id);
              const expenseParticipants =
                expense.expense_participants || [];
              const participantNames = expenseParticipants
                .map((ep) => {
                  const p = getParticipant(ep.participant_id);
                  return p?.name;
                })
                .filter(Boolean)
                .join(", ");

              return (
                <Card 
                  key={expense.id} 
                  variant="outline"
                  className={showDetailModal ? "cursor-pointer hover:shadow-md transition-shadow" : ""}
                  onClick={() => {
                    if (showDetailModal) {
                      setSelectedExpense(expense);
                      setIsModalOpen(true);
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-lg">
                          {expense.item_name}
                        </h4>
                        {expense.category && (
                          <span className="text-sm text-gray-500">
                            {expense.category}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base text-gray-900">
                            {formatCurrency(expense.amount, expense.currency)}
                          </span>
                          <span className="text-xs">
                            ({expense.payment_type === "cash" ? "현금" : "카드"})
                          </span>
                        </div>
                        <div>
                          <span className="font-medium">결제자:</span>{" "}
                          {payer?.name}
                        </div>
                        <div>
                          <span className="font-medium">참여자:</span>{" "}
                          {participantNames || "없음"}
                        </div>
                        {expense.location && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs">📍</span>
                            <span>{expense.location}</span>
                          </div>
                        )}
                        {expense.memo && (
                          <div className="text-xs text-gray-500 mt-1">
                            {expense.memo}
                          </div>
                        )}
                      </div>
                    </div>
                    {(onEdit || onDelete) && (
                      <div className="flex gap-2 ml-4">
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(expense);
                            }}
                            className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            수정
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(expense.id);
                            }}
                            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            삭제
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
      {expenses.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          지출 내역이 없습니다.
        </div>
      )}

      {/* 상세 내역 모달 */}
      {selectedExpense && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedExpense(null);
          }}
          title="지출 상세 내역"
        >
          <div className="p-4 space-y-4">
            {/* 기본 정보 */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {selectedExpense.item_name}
              </h3>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl font-bold text-blue-600">
                  {formatCurrency(selectedExpense.amount, selectedExpense.currency)}
                </span>
                {selectedExpense.category && (
                  <span className="px-2 py-1 bg-white rounded text-sm">
                    {selectedExpense.category}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">결제일:</span>
                  <span className="ml-2 font-medium">
                    {format(new Date(selectedExpense.date), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">결제방법:</span>
                  <span className="ml-2 font-medium">
                    {selectedExpense.payment_type === "cash" ? "현금" : "카드"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">결제자:</span>
                  <span className="ml-2 font-medium">
                    {getParticipant(selectedExpense.payer_id)?.name}
                  </span>
                </div>
                {selectedExpense.location && (
                  <div className="col-span-2">
                    <span className="text-gray-600">📍 위치:</span>
                    <span className="ml-2 font-medium">{selectedExpense.location}</span>
                  </div>
                )}
                {selectedExpense.memo && (
                  <div className="col-span-2">
                    <span className="text-gray-600">메모:</span>
                    <div className="ml-2 text-gray-700 mt-1 text-xs">
                      {selectedExpense.memo}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 계산 방식 설명 */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span>📊</span>
                <span>정산 계산식</span>
              </h4>
              {selectedExpense.daily_participants && selectedExpense.daily_participants.length > 0 ? (
                <>
                  {/* 날짜별 지출 계산 */}
                  <div className="space-y-3 text-sm">
                    <div className="font-medium text-gray-700">
                      💡 날짜별 분담 방식 ({selectedExpense.category})
                    </div>
                    {(() => {
                      const byDate: Record<string, string[]> = {};
                      selectedExpense.daily_participants.forEach((dp) => {
                        if (!byDate[dp.date]) byDate[dp.date] = [];
                        byDate[dp.date].push(dp.participant_id);
                      });
                      const dates = Object.keys(byDate).sort();
                      const dailyAmount = Math.floor(selectedExpense.amount / dates.length);
                      const dailyRemainder = selectedExpense.amount % dates.length;

                      return (
                        <>
                          <div className="p-3 bg-white rounded border border-yellow-300">
                            <div className="text-xs text-gray-600 mb-2">1단계: 총 금액을 날짜 수로 분배</div>
                            <div className="font-mono text-sm">
                              {formatCurrency(selectedExpense.amount, selectedExpense.currency)} ÷ {dates.length}일 
                              = {formatCurrency(dailyAmount, selectedExpense.currency)}/일
                              {dailyRemainder > 0 && <span className="text-xs text-gray-500"> (+나머지 {formatCurrency(dailyRemainder, selectedExpense.currency)})</span>}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="text-xs text-gray-600">2단계: 각 날짜별로 참여자 수로 분배</div>
                            {dates.map((date, dateIndex) => {
                              const dayParticipants = byDate[date];
                              const dateAmount = dailyAmount + (dateIndex === 0 ? dailyRemainder : 0);
                              const perPerson = Math.floor(dateAmount / dayParticipants.length);
                              const remainder = dateAmount % dayParticipants.length;

                              return (
                                <div key={date} className="p-2 bg-white rounded border border-gray-200">
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    {format(new Date(date), "M월 d일", { locale: ko })} ({dayParticipants.length}명)
                                  </div>
                                  <div className="font-mono text-xs text-gray-600">
                                    {formatCurrency(dateAmount, selectedExpense.currency)} ÷ {dayParticipants.length}명 
                                    = {formatCurrency(perPerson, selectedExpense.currency)}/인
                                    {remainder > 0 && <span className="text-gray-400"> (+나머지 {formatCurrency(remainder, selectedExpense.currency)})</span>}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    참여: {dayParticipants.map(pid => getParticipant(pid)?.name).join(", ")}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </>
              ) : (
                <>
                  {/* 일반 지출 계산 */}
                  <div className="space-y-2 text-sm">
                    <div className="font-medium text-gray-700">
                      💡 {selectedExpense.settlement_type === "equal" ? "동일 분할" : "직접 정산"} 방식
                    </div>
                    {selectedExpense.settlement_type === "equal" ? (
                      <>
                        <div className="p-3 bg-white rounded border border-yellow-300">
                          <div className="font-mono text-sm">
                            {formatCurrency(selectedExpense.amount, selectedExpense.currency)} ÷ {selectedExpense.expense_participants?.length || 0}명
                            = {formatCurrency(
                              Math.floor(selectedExpense.amount / (selectedExpense.expense_participants?.length || 1)),
                              selectedExpense.currency
                            )}/인
                            {(() => {
                              const remainder = selectedExpense.amount % (selectedExpense.expense_participants?.length || 1);
                              return remainder > 0 ? (
                                <span className="text-xs text-gray-500">
                                  {" "}(+나머지 {formatCurrency(remainder, selectedExpense.currency)} → 첫 번째 참여자)
                                </span>
                              ) : null;
                            })()}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 p-2 bg-white rounded">
                          참여자: {selectedExpense.expense_participants?.map(ep => 
                            getParticipant(ep.participant_id)?.name
                          ).join(", ")}
                        </div>
                      </>
                    ) : (
                      <div className="p-3 bg-white rounded border border-yellow-300 text-xs text-gray-600">
                        각 참여자별로 직접 입력된 금액으로 정산됩니다.
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* 인원별 분담 금액 */}
            <div>
              <h4 className="font-semibold text-gray-800 mb-3">최종 인원별 분담 금액</h4>
              <div className="space-y-2">
                {calculateSplitDetails(selectedExpense).map((detail) => (
                  <div
                    key={detail.participantId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium">{detail.participantName}</div>
                      {detail.dates && detail.dates.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          참여일: {detail.dates.map((d) => 
                            format(new Date(d), "M/d", { locale: ko })
                          ).join(", ")}
                        </div>
                      )}
                    </div>
                    <div className="text-lg font-bold text-blue-600">
                      {formatCurrency(detail.amount, selectedExpense.currency)}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* 총합 확인 */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>합계:</span>
                  <span className="font-semibold">
                    {formatCurrency(
                      calculateSplitDetails(selectedExpense).reduce((sum, d) => sum + d.amount, 0),
                      selectedExpense.currency
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* 액션 버튼 */}
            {(onEdit || onDelete) && (
              <div className="flex gap-2 pt-2 border-t border-gray-200">
                {onEdit && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onEdit(selectedExpense);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                  >
                    수정
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      onDelete(selectedExpense.id);
                    }}
                    className="flex-1 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

