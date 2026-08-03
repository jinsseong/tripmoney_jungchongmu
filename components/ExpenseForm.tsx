"use client";

import React, { useState, useEffect } from "react";
import { Expense, Participant, Category, Trip } from "@/lib/types";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { ParticipantSelector } from "./ParticipantSelector";
import { Modal } from "./ui/Modal";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface ExpenseFormProps {
  participants: Participant[];
  categories: Category[];
  trip?: Trip | null;
  defaultPayerId?: string;
  initialExpense?: Expense;
  onTripUpdate?: (tripId: string, startDate: string, endDate: string) => Promise<void>;
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
  trip,
  defaultPayerId,
  initialExpense,
  onTripUpdate,
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
  const [formError, setFormError] = useState("");
  const [showDateWarningModal, setShowDateWarningModal] = useState(false);
  const [pendingExpenseData, setPendingExpenseData] = useState<{
    expense: Partial<Expense>;
    participantIds: string[];
    customAmounts?: Record<string, number>;
    dailyParticipants?: Record<string, string[]>;
  } | null>(null);
  const [dateWarningMessage, setDateWarningMessage] = useState("");
  
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

  // 날짜가 여행 기간 내에 있는지 확인
  const isDateWithinTripRange = (checkDate: string): boolean => {
    if (!trip) return true; // trip 정보가 없으면 검증하지 않음
    
    const tripStart = new Date(trip.start_date);
    const tripEnd = new Date(trip.end_date);
    const checkDateObj = new Date(checkDate);
    
    return checkDateObj >= tripStart && checkDateObj <= tripEnd;
  };

  // 날짜 범위가 여행 기간과 겹치는지 확인 및 범위 벗어남 여부 체크
  const getDateRangeValidation = (): {
    isValid: boolean;
    message: string;
    needsStartDateExtend: boolean;
    needsEndDateExtend: boolean;
    newStartDate?: string;
    newEndDate?: string;
  } => {
    if (!trip) {
      return { isValid: true, message: "", needsStartDateExtend: false, needsEndDateExtend: false };
    }

    const tripStart = new Date(trip.start_date);
    const tripEnd = new Date(trip.end_date);
    const expenseStart = new Date(date);
    const expenseEnd = endDate ? new Date(endDate) : expenseStart;
    
    const isStartBeforeTrip = expenseStart < tripStart;
    const isEndAfterTrip = expenseEnd > tripEnd;
    
    if (!isStartBeforeTrip && !isEndAfterTrip) {
      return { isValid: true, message: "", needsStartDateExtend: false, needsEndDateExtend: false };
    }
    
    const messages: string[] = [];
    if (isStartBeforeTrip) {
      messages.push(`${new Date(trip.start_date).toLocaleDateString("ko-KR")} 이전 날짜입니다`);
    }
    if (isEndAfterTrip) {
      messages.push(`${new Date(trip.end_date).toLocaleDateString("ko-KR")} 이후 날짜입니다`);
    }
    
    return {
      isValid: false,
      message: messages.join(", "),
      needsStartDateExtend: isStartBeforeTrip,
      needsEndDateExtend: isEndAfterTrip,
      newStartDate: isStartBeforeTrip ? date : trip.start_date,
      newEndDate: isEndAfterTrip ? (endDate || date) : trip.end_date,
    };
  };

  const parseMoneyInput = (value: string) =>
    parseInt(value.replace(/,/g, "") || "0");

  const totalAmount = parseMoneyInput(amount);
  const customAmountTotal =
    settlementType === "custom"
      ? selectedParticipantIds.reduce(
          (sum, pid) => sum + parseMoneyInput(customAmounts[pid] || ""),
          0
        )
      : 0;
  const customAmountDiff = totalAmount - customAmountTotal;
  const hasMissingCustomAmount =
    settlementType === "custom" &&
    selectedParticipantIds.some(
      (id) => parseMoneyInput(customAmounts[id] || "") <= 0
    );
  const hasCustomAmountMismatch =
    settlementType === "custom" &&
    totalAmount > 0 &&
    selectedParticipantIds.length > 0 &&
    customAmountTotal !== totalAmount;
  const missingDailyParticipantDates =
    isMultiDayCategory && endDate
      ? getDateRange(date, endDate).filter(
          (dateStr) => (dailyParticipants[dateStr] || []).length === 0
        )
      : [];

  const getFormValidationMessage = () => {
    if (totalAmount <= 0) {
      return "금액은 1원 이상 입력해주세요.";
    }
    if (!itemName.trim()) {
      return "지출 내용을 입력해주세요.";
    }
    if (!payerId) {
      return "결제자를 선택해주세요.";
    }
    if (selectedParticipantIds.length === 0) {
      return "참여자를 한 명 이상 선택해주세요.";
    }
    if (missingDailyParticipantDates.length > 0) {
      return "날짜별 참여자가 비어 있는 날짜가 있습니다.";
    }
    if (hasMissingCustomAmount) {
      return "직접 정산 금액은 선택한 참여자마다 1원 이상 입력해주세요.";
    }
    if (hasCustomAmountMismatch) {
      return "직접 정산 금액의 합계가 총 금액과 일치해야 합니다.";
    }

    return "";
  };

  const validationMessage = getFormValidationMessage();
  const isSubmitDisabled = Boolean(validationMessage) || isLoading;
  const hasStartedForm =
    Boolean(amount) ||
    Boolean(itemName.trim()) ||
    Boolean(categoryId) ||
    Boolean(payerId) ||
    selectedParticipantIds.length > 0 ||
    Boolean(location.trim()) ||
    Boolean(memo.trim());
  const visibleValidationMessage =
    formError || (hasStartedForm ? validationMessage : "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (validationMessage) {
      setFormError(validationMessage);
      return;
    }

    // 날짜 범위 검증
    const validation = getDateRangeValidation();
    
    if (!validation.isValid && trip) {
      // 여행 기간 외 날짜이면 경고 모달 표시
      setDateWarningMessage(validation.message);
      setPendingExpenseData({
        expense: {
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
          end_date: endDate || date,
          expense_date: date,
          ...(isEditMode && initialExpense?.trip_id ? { trip_id: initialExpense.trip_id } : {}),
        },
        participantIds: selectedParticipantIds,
        customAmounts: settlementType === "custom" ? Object.fromEntries(
          selectedParticipantIds.map((pid) => {
            const amountValue = customAmounts[pid];
            return [pid, parseMoneyInput(amountValue || "")];
          })
        ) : undefined,
        dailyParticipants: isMultiDayCategory && endDate ? dailyParticipants : undefined,
      });
      setShowDateWarningModal(true);
      return;
    }

    // 정상 제출 처리
    await submitExpense();
  };

  const submitExpense = async (extendTripDates = false) => {
    if (!pendingExpenseData && !amount) {
      return;
    }

    setIsLoading(true);
    try {
      let expenseData: Partial<Expense>;
      let participantIds: string[];
      let customAmountsMap: Record<string, number> | undefined;
      let dailyParticipantsData: Record<string, string[]> | undefined;

      if (pendingExpenseData) {
        expenseData = pendingExpenseData.expense;
        participantIds = pendingExpenseData.participantIds;
        customAmountsMap = pendingExpenseData.customAmounts;
        dailyParticipantsData = pendingExpenseData.dailyParticipants;
      } else {
        expenseData = {
          amount: totalAmount,
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
          end_date: endDate || date,
          expense_date: date,
          ...(isEditMode && initialExpense?.trip_id ? { trip_id: initialExpense.trip_id } : {}),
        };
        participantIds = selectedParticipantIds;
        if (settlementType === "custom") {
          customAmountsMap = {};
          selectedParticipantIds.forEach((pid) => {
            const amountValue = customAmounts[pid];
            if (amountValue) {
              customAmountsMap![pid] = parseMoneyInput(amountValue);
            }
          });
        }
        dailyParticipantsData = isMultiDayCategory && endDate ? dailyParticipants : undefined;
      }

      // 여행 기간 확장이 필요하면 확장
      if (extendTripDates && trip && onTripUpdate) {
        const validation = getDateRangeValidation();
        if (!validation.isValid) {
          const newStartDate = validation.newStartDate || trip.start_date;
          const newEndDate = validation.newEndDate || trip.end_date;
          await onTripUpdate(trip.id, newStartDate, newEndDate);
        }
      }

      await onSubmit(expenseData, participantIds, customAmountsMap, dailyParticipantsData);
      
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
        setDate(new Date().toISOString().split("T")[0]);
        setEndDate("");
      }
      
      // 모달 및 임시 데이터 초기화
      setShowDateWarningModal(false);
      setPendingExpenseData(null);
      setDateWarningMessage("");
    } catch (error) {
      console.error("Error submitting expense:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setAmount(numericValue);
    setFormError("");
  };

  const handleCustomAmountChange = (participantId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, "");
    setCustomAmounts((prev) => ({
      ...prev,
      [participantId]: numericValue,
    }));
    setFormError("");
  };

  const perPersonAmount =
    settlementType === "equal" && selectedParticipantIds.length > 0
      ? Math.floor(totalAmount / selectedParticipantIds.length)
      : 0;
  const remainder =
    settlementType === "equal" && selectedParticipantIds.length > 0
      ? totalAmount % selectedParticipantIds.length
      : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-1">
      {/* 금액 입력 */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
          금액
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8b95a1]" />
          <input
            type="text"
            value={amount ? formatNumber(parseInt(amount.replace(/,/g, ""))) : ""}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="min-h-[60px] w-full rounded-lg border border-[#d1d6db] bg-white px-12 text-center text-2xl font-extrabold text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
            required
          />
        </div>
        {amount && totalAmount <= 0 && (
          <p className="mt-2 text-sm font-medium text-[#f04452]">
            금액은 1원 이상 입력해주세요.
          </p>
        )}
        <div className="mt-2 grid grid-cols-2 gap-2">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="min-h-[48px] min-w-0 rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
          >
            <option value="KRW">KRW</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="JPY">JPY</option>
          </select>
          <select
            value={paymentType}
            onChange={(e) => setPaymentType(e.target.value as "cash" | "card")}
            className="min-h-[48px] min-w-0 rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
          >
            <option value="cash">현금</option>
            <option value="card">카드</option>
          </select>
        </div>
      </div>

      {/* 카테고리 선택 */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
          카테고리
        </label>
        <div className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-2">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => {
                setCategoryId(category.id);
                setFormError("");
              }}
              className={cn(
                "flex min-h-[76px] min-w-[76px] snap-start flex-col items-center justify-center gap-1 rounded-lg border px-3 py-3 transition-all",
                categoryId === category.id
                  ? "border-[#3182f6] bg-[#e8f3ff] text-[#1b64da]"
                  : "border-[#e5e8eb] bg-white text-[#4e5968] hover:border-[#d1d6db]"
              )}
            >
              <span className="text-2xl">{category.icon}</span>
              <span className="text-xs font-bold">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 지출 내용 */}
      <Input
        label="지출 내용"
        value={itemName}
        onChange={(e) => {
          setItemName(e.target.value);
          setFormError("");
        }}
        placeholder="예: 점심 식사"
        required
      />

      {/* 날짜 */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
              {isMultiDayCategory ? "시작일" : "날짜"}
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setFormError("");
              }}
              className={cn(
                "min-h-[48px] w-full rounded-lg border px-3.5 text-base focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15",
                trip && !isDateWithinTripRange(date) && !isMultiDayCategory
                  ? "border-[#f59f00] bg-[#fff8e8]"
                  : "border-[#d1d6db] bg-white"
              )}
              required
            />
          </div>
          {isMultiDayCategory && (
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
                종료일
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setFormError("");
                }}
                min={date}
                className={cn(
                  "min-h-[48px] w-full rounded-lg border px-3.5 text-base focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15",
                  trip && endDate && !isDateWithinTripRange(endDate)
                    ? "border-[#f59f00] bg-[#fff8e8]"
                    : "border-[#d1d6db] bg-white"
                )}
              />
            </div>
          )}
        </div>
        {trip && !getDateRangeValidation().isValid && (
          <div className="rounded-lg border border-[#ffe1ad] bg-[#fff8e8] p-3">
            <p className="text-sm leading-6 text-[#9a6700]">
              이 날짜는 여행 기간({new Date(trip.start_date).toLocaleDateString("ko-KR")} ~ {new Date(trip.end_date).toLocaleDateString("ko-KR")}) 외부입니다. 추가 시 여행 기간이 자동으로 확장됩니다.
            </p>
          </div>
        )}
      </div>

      {/* 결제자 선택 */}
      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
          결제자
        </label>
        <select
          value={payerId}
          onChange={(e) => {
            setPayerId(e.target.value);
            setFormError("");
          }}
          className="min-h-[48px] w-full rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
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
        <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
          정산 방법
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              setSettlementType("equal");
              setFormError("");
            }}
            className={cn(
              "min-h-[48px] rounded-lg border px-2 font-bold transition-all",
              settlementType === "equal"
                ? "border-[#3182f6] bg-[#e8f3ff] text-[#1b64da]"
                : "border-[#e5e8eb] bg-white text-[#4e5968]"
            )}
          >
            동일 분할
          </button>
          <button
            type="button"
            onClick={() => {
              setSettlementType("custom");
              setFormError("");
            }}
            className={cn(
              "min-h-[48px] rounded-lg border px-2 font-bold transition-all",
              settlementType === "custom"
                ? "border-[#3182f6] bg-[#e8f3ff] text-[#1b64da]"
                : "border-[#e5e8eb] bg-white text-[#4e5968]"
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
            setFormError("");
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
            <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
              전체 참여자 (날짜별 기본값)
            </label>
            <ParticipantSelector
              participants={participants}
              selectedIds={selectedParticipantIds}
              onToggle={(id) => {
                setFormError("");
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
          <div className="space-y-4 rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-3 sm:p-4">
            <h3 className="text-sm font-bold text-[#4e5968]">
              날짜별 참여자 선택
            </h3>
            {getDateRange(date, endDate).map((dateStr) => (
              <div key={dateStr} className="space-y-2">
                <label className="block text-xs font-bold text-[#6b7684]">
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
                          setFormError("");
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
                          "min-h-[40px] rounded-lg border px-3 py-1 text-sm font-bold transition-all",
                          isSelected
                            ? "border-[#3182f6] bg-[#e8f3ff] text-[#1b64da]"
                            : "border-[#e5e8eb] bg-white text-[#6b7684]"
                        )}
                      >
                        {participant.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {missingDailyParticipantDates.length > 0 && (
              <p className="text-sm font-medium text-[#f04452]">
                참여자가 없는 날짜:{" "}
                {missingDailyParticipantDates
                  .map((dateStr) =>
                    new Date(dateStr).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })
                  )
                  .join(", ")}
              </p>
            )}
          </div>
        </>
      )}

      {/* 직접 정산 금액 입력 */}
      {settlementType === "custom" && selectedParticipantIds.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-bold text-[#4e5968]">
            개별 금액 입력
          </label>
          {selectedParticipantIds.map((pid) => {
            const participant = participants.find((p) => p.id === pid);
            return (
              <div key={pid} className="grid grid-cols-1 gap-2 sm:grid-cols-[5rem_1fr] sm:items-center">
                <span className="text-sm font-bold text-[#4e5968] sm:w-20">
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
                  className="min-h-[48px] min-w-0 rounded-lg border border-[#d1d6db] px-3.5 text-base focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
                />
              </div>
            );
          })}
          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              hasMissingCustomAmount || hasCustomAmountMismatch
                ? "border-[#ffd0d5] bg-[#fff0f1] text-[#d93d4a]"
                : "border-[#b7ebd0] bg-[#ebfff6] text-[#087443]"
            )}
          >
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span>직접 정산 합계</span>
              <strong>
                {formatCurrency(customAmountTotal, currency)} /{" "}
                {formatCurrency(totalAmount, currency)}
              </strong>
            </div>
            {hasCustomAmountMismatch && (
              <p className="mt-1">
                {customAmountDiff > 0
                  ? `${formatCurrency(customAmountDiff, currency)} 부족합니다.`
                  : `${formatCurrency(Math.abs(customAmountDiff), currency)} 초과했습니다.`}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 계산 미리보기 */}
      {settlementType === "equal" &&
        totalAmount > 0 &&
        selectedParticipantIds.length > 0 && (
          <div className="rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-4">
            <p className="mb-1 text-sm font-bold text-[#4e5968]">정산 미리보기</p>
            <p className="break-words text-base font-extrabold text-[#1b64da] sm:text-lg">
              인당 {formatCurrency(perPersonAmount, currency)}
              {remainder > 0 && ` (+${formatCurrency(remainder, currency)} 첫 번째 참여자)`}
            </p>
          </div>
        )}

      {/* 선택 필드 */}
      <Input
        label="장소 (선택)"
        value={location}
        onChange={(e) => {
          setLocation(e.target.value);
          setFormError("");
        }}
        placeholder="예: 강남역"
      />

      <div>
        <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
          메모 (선택)
        </label>
        <textarea
          value={memo}
          onChange={(e) => {
            setMemo(e.target.value);
            setFormError("");
          }}
          placeholder="추가 메모를 입력하세요"
          className="min-h-24 w-full rounded-lg border border-[#d1d6db] px-3.5 py-2.5 text-base focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
        />
      </div>

      {visibleValidationMessage && (
        <div className="rounded-lg border border-[#ffd0d5] bg-[#fff0f1] p-3 text-sm font-bold text-[#d93d4a]">
          {visibleValidationMessage}
        </div>
      )}

      {/* 버튼 */}
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col-reverse gap-2 border-t border-[#e5e8eb] bg-white/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:flex-row sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
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
          disabled={isSubmitDisabled}
        >
          {isEditMode ? "수정하기" : "추가하기"}
        </Button>
      </div>

      {/* 날짜 경고 모달 */}
      <Modal
        isOpen={showDateWarningModal}
        onClose={() => {
          setShowDateWarningModal(false);
          setPendingExpenseData(null);
        }}
        title="여행 기간 외 날짜"
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-[#ffe1ad] bg-[#fff8e8] p-4">
            <p className="mb-2 text-sm font-bold text-[#9a6700]">
              선택한 날짜가 여행 기간에 포함되지 않습니다.
            </p>
            <p className="text-sm text-[#9a6700]">
              {trip && (
                <>
                  설정된 여행 기간: {new Date(trip.start_date).toLocaleDateString("ko-KR")} ~ {new Date(trip.end_date).toLocaleDateString("ko-KR")}
                  <br />
                </>
              )}
              {dateWarningMessage && (
                <>
                  선택한 날짜: {dateWarningMessage}
                </>
              )}
            </p>
          </div>
          <p className="text-sm leading-6 text-[#6b7684]">
            지출을 추가하면 여행 기간이 자동으로 확장되어 이 날짜를 포함하도록 업데이트됩니다.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowDateWarningModal(false);
                setPendingExpenseData(null);
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => submitExpense(true)}
              isLoading={isLoading}
              className="flex-1"
            >
              여행 기간 확장 후 추가
            </Button>
          </div>
        </div>
      </Modal>
    </form>
  );
};
