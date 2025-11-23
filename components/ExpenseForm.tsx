"use client";

import React, { useState, useEffect } from "react";
import { Expense, Participant, Category } from "@/lib/types";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { ParticipantSelector } from "./ParticipantSelector";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface ExpenseFormProps {
  participants: Participant[];
  categories: Category[];
  defaultPayerId?: string;
  initialExpense?: Expense;
  onSubmit: (
    expense: Partial<Expense>,
    participantIds: string[],
    customAmounts?: Record<string, number>,
    dailyParticipants?: Record<string, string[]>
  ) => Promise<void>;
  onCancel?: () => void;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  participants,
  categories,
  defaultPayerId,
  initialExpense,
  onSubmit,
  onCancel,
}) => {
  const isEditMode = !!initialExpense;
  
  const [amount, setAmount] = useState(
    initialExpense ? String(initialExpense.amount) : ""
  );
  const [itemName, setItemName] = useState(initialExpense?.item_name || "");
  const [description, setDescription] = useState(initialExpense?.description || "");
  const [location, setLocation] = useState(initialExpense?.location || "");
  const [memo, setMemo] = useState(initialExpense?.memo || "");
  const [categoryId, setCategoryId] = useState<string>(() => {
    if (initialExpense?.category_id) {
      return initialExpense.category_id;
    }
    // category 이름으로 찾기
    if (initialExpense?.category) {
      const found = categories.find((c) => c.name === initialExpense.category);
      return found?.id || "";
    }
    return "";
  });
  const [payerId, setPayerId] = useState<string>(
    initialExpense?.payer_id || defaultPayerId || ""
  );
  const [settlementType, setSettlementType] = useState<"equal" | "custom">(
    initialExpense?.settlement_type || "equal"
  );
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<
    string[]
  >(initialExpense?.expense_participants?.map((ep) => ep.participant_id) || []);
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(
    () => {
      if (initialExpense?.expense_participants) {
        const amounts: Record<string, string> = {};
        initialExpense.expense_participants.forEach((ep) => {
          if (ep.custom_amount) {
            amounts[ep.participant_id] = String(ep.custom_amount);
          }
        });
        return amounts;
      }
      return {};
    }
  );
  const [date, setDate] = useState(
    initialExpense?.date || new Date().toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    initialExpense?.end_date || ""
  );
  const [paymentType, setPaymentType] = useState<"cash" | "card">(
    initialExpense?.payment_type || "cash"
  );
  const [currency, setCurrency] = useState(initialExpense?.currency || "KRW");
  const [isLoading, setIsLoading] = useState(false);
  
  // 날짜별 참여자 (교통/숙박 카테고리용)
  const [dailyParticipants, setDailyParticipants] = useState<Record<string, string[]>>(() => {
    if (initialExpense?.daily_participants && initialExpense.daily_participants.length > 0) {
      const byDate: Record<string, string[]> = {};
      initialExpense.daily_participants.forEach((dp) => {
        if (!byDate[dp.date]) {
          byDate[dp.date] = [];
        }
        byDate[dp.date].push(dp.participant_id);
      });
      return byDate;
    }
    return {};
  });

  // categories가 로드된 후 categoryId 설정
  useEffect(() => {
    if (initialExpense && categories.length > 0 && !categoryId) {
      if (initialExpense.category) {
        const found = categories.find((c) => c.name === initialExpense.category);
        if (found) {
          setCategoryId(found.id);
        }
      }
    }
  }, [categories, initialExpense, categoryId]);

  // 선택된 카테고리가 교통/숙박인지 확인
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const isMultiDayCategory = selectedCategory && 
    (selectedCategory.name === "교통" || selectedCategory.name === "숙박");

  // 날짜 범위에서 모든 날짜 생성
  const getDateRange = (start: string, end: string): string[] => {
    if (!end || start === end) return [start];
    
    const dates: string[] = [];
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split("T")[0]);
    }
    
    return dates;
  };

  // 날짜 범위 변경 시 dailyParticipants 초기화
  useEffect(() => {
    if (isMultiDayCategory && endDate) {
      const dates = getDateRange(date, endDate);
      const newDailyParticipants: Record<string, string[]> = {};
      dates.forEach((d) => {
        // 기존 값 유지하거나 모든 참여자로 초기화
        newDailyParticipants[d] = dailyParticipants[d] || selectedParticipantIds;
      });
      setDailyParticipants(newDailyParticipants);
    } else {
      setDailyParticipants({});
    }
  }, [isMultiDayCategory, date, endDate, selectedParticipantIds.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !itemName || !payerId || selectedParticipantIds.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      const expenseData: Partial<Expense> = {
        amount: parseInt(amount.replace(/,/g, "")),
        item_name: itemName,
        description: description || undefined,
        location: location || undefined,
        memo: memo || undefined,
        category_id: categoryId || undefined,
        payer_id: payerId,
        payment_type: paymentType,
        currency,
        settlement_type: settlementType,
        date,
        end_date: endDate || date, // end_date가 없으면 date와 동일
        expense_date: date,
        // 수정 모드일 때는 trip_id 유지
        ...(isEditMode && initialExpense?.trip_id ? { trip_id: initialExpense.trip_id } : {}),
      };

      const customAmountsMap: Record<string, number> = {};
      if (settlementType === "custom") {
        selectedParticipantIds.forEach((pid) => {
          const amountValue = customAmounts[pid];
          if (amountValue) {
            customAmountsMap[pid] = parseInt(amountValue.replace(/,/g, ""));
          }
        });
      }

      await onSubmit(
        expenseData, 
        selectedParticipantIds, 
        customAmountsMap,
        isMultiDayCategory && endDate ? dailyParticipants : undefined
      );
      
      // Reset form (수정 모드가 아닐 때만)
      if (!isEditMode) {
        setAmount("");
        setItemName("");
        setDescription("");
        setLocation("");
        setMemo("");
        setCategoryId("");
        setSelectedParticipantIds([]);
        setCustomAmounts({});
      }
    } catch (error) {
      console.error("Error submitting expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setAmount(numericValue);
  };

  const handleCustomAmountChange = (participantId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setCustomAmounts((prev) => ({
      ...prev,
      [participantId]: numericValue,
    }));
  };

  const totalAmount = parseInt(amount.replace(/,/g, "") || "0");
  const perPersonAmount =
    settlementType === "equal" && selectedParticipantIds.length > 0
      ? Math.floor(totalAmount / selectedParticipantIds.length)
      : 0;
  const remainder =
    settlementType === "equal" && selectedParticipantIds.length > 0
      ? totalAmount % selectedParticipantIds.length
      : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 금액 입력 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          금액
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            value={amount ? formatNumber(parseInt(amount.replace(/,/g, ""))) : ""}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="w-full h-14 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div className="flex gap-2 mt-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
          </select>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as "cash" | "card")}
            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
          >
            <option value="cash">현금</option>
            <option value="card">카드</option>
          </select>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          카테고리
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setCategoryId(category.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-4 py-3 rounded-lg border-2 min-w-[80px] transition-all",
                categoryId === category.id
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs font-medium">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 지출 내용 */}
      <Input
        label="지출 내용"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="예: 점심 식사"
        required
      />

      {/* 날짜 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isMultiDayCategory ? "시작일" : "날짜"}
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {isMultiDayCategory && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={date}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* 결제자 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          결제자
        </label>
        <select
          value={payerId}
          onChange={(e) => setPayerId(e.target.value)}
          className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        >
          <option value="">선택하세요</option>
          {participants.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 정산 방법 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          정산 방법
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSettlementType("equal")}
            className={cn(
              "flex-1 h-11 rounded-lg border-2 font-medium transition-all",
              settlementType === "equal"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-700"
            )}
          >
            동일 분할
          </button>
          <button
            type="button"
            onClick={() => setSettlementType("custom")}
            className={cn(
              "flex-1 h-11 rounded-lg border-2 font-medium transition-all",
              settlementType === "custom"
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-700"
            )}
          >
            직접 정산
          </button>
        </div>
      </div>

      {/* 참여자 선택 */}
      {!isMultiDayCategory || !endDate ? (
        <ParticipantSelector
          participants={participants}
          selectedIds={selectedParticipantIds}
          onToggle={(id) => {
            if (selectedParticipantIds.includes(id)) {
              setSelectedParticipantIds(
                selectedParticipantIds.filter((pid) => pid !== id)
              );
              setCustomAmounts((prev) => {
                const newAmounts = { ...prev };
                delete newAmounts[id];
                return newAmounts;
              });
            } else {
              setSelectedParticipantIds([...selectedParticipantIds, id]);
            }
          }}
        />
      ) : (
        <>
          {/* 전체 참여자 선택 (날짜별 기본값) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              전체 참여자 (날짜별 기본값)
            </label>
            <ParticipantSelector
              participants={participants}
              selectedIds={selectedParticipantIds}
              onToggle={(id) => {
                if (selectedParticipantIds.includes(id)) {
                  const newIds = selectedParticipantIds.filter((pid) => pid !== id);
                  setSelectedParticipantIds(newIds);
                  // 모든 날짜에서 제거
                  setDailyParticipants((prev) => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach((date) => {
                      updated[date] = updated[date].filter((pid) => pid !== id);
                    });
                    return updated;
                  });
                } else {
                  const newIds = [...selectedParticipantIds, id];
                  setSelectedParticipantIds(newIds);
                  // 모든 날짜에 추가
                  setDailyParticipants((prev) => {
                    const updated = { ...prev };
                    Object.keys(updated).forEach((date) => {
                      if (!updated[date].includes(id)) {
                        updated[date] = [...updated[date], id];
                      }
                    });
                    return updated;
                  });
                }
              }}
            />
          </div>

          {/* 날짜별 참여자 선택 */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700">
              날짜별 참여자 선택
            </h3>
            {getDateRange(date, endDate).map((dateStr) => (
              <div key={dateStr} className="space-y-2">
                <label className="block text-xs font-medium text-gray-600">
                  {new Date(dateStr).toLocaleDateString("ko-KR", {
                    month: "short",
                    day: "numeric",
                    weekday: "short",
                  })}
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedParticipantIds.map((pid) => {
                    const participant = participants.find((p) => p.id === pid);
                    if (!participant) return null;
                    const isSelected = dailyParticipants[dateStr]?.includes(pid);
                    return (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => {
                          setDailyParticipants((prev) => {
                            const updated = { ...prev };
                            if (isSelected) {
                              updated[dateStr] = updated[dateStr].filter(
                                (id) => id !== pid
                              );
                            } else {
                              updated[dateStr] = [
                                ...(updated[dateStr] || []),
                                pid,
                              ];
                            }
                            return updated;
                          });
                        }}
                        className={cn(
                          "px-3 py-1 text-sm rounded-lg border-2 transition-all",
                          isSelected
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-gray-200 bg-white text-gray-600"
                        )}
                      >
                        {participant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 직접 정산 금액 입력 */}
      {settlementType === "custom" && selectedParticipantIds.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            개별 금액 입력
          </label>
          {selectedParticipantIds.map((pid) => {
            const participant = participants.find((p) => p.id === pid);
            return (
              <div key={pid} className="flex items-center gap-2">
                <span className="w-20 text-sm font-medium">
                  {participant?.name}
                </span>
                <input
                  type="text"
                  value={
                    customAmounts[pid]
                      ? formatNumber(
                          parseInt(customAmounts[pid].replace(/,/g, ""))
                        )
                      : ""
                  }
                  onChange={(e) =>
                    handleCustomAmountChange(pid, e.target.value)
                  }
                  placeholder="0"
                  className="flex-1 h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 계산 미리보기 */}
      {settlementType === "equal" &&
        totalAmount > 0 &&
        selectedParticipantIds.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">정산 미리보기</p>
            <p className="text-lg font-semibold text-blue-700">
              인당 {formatCurrency(perPersonAmount, currency)}
              {remainder > 0 && ` (+${formatCurrency(remainder, currency)} 첫 번째 참여자)`}
            </p>
          </div>
        )}

      {/* 선택 필드 */}
      <Input
        label="장소 (선택)"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="예: 강남역"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          메모 (선택)
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="추가 메모를 입력하세요"
          className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 버튼 */}
      <div className="flex gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          className="flex-1"
          disabled={
            !amount ||
            !itemName ||
            !payerId ||
            selectedParticipantIds.length === 0 ||
            (settlementType === "custom" &&
              selectedParticipantIds.some(
                (id) => !customAmounts[id] || parseInt(customAmounts[id].replace(/,/g, "") || "0") === 0
              ))
          }
        >
          {isEditMode ? "수정하기" : "추가하기"}
        </Button>
      </div>
    </form>
  );
};

