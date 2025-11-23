"use client";

import React from "react";
import { format, getDay, eachDayOfInterval, isSameDay } from "date-fns";
import { ko } from "date-fns/locale";
import { cn, formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TripDateSelectorProps {
  startDate: string;
  endDate: string;
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  expensesByDate?: Record<string, number>;
}

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export const TripDateSelector: React.FC<TripDateSelectorProps> = ({
  startDate,
  endDate,
  selectedDate,
  onDateSelect,
  expensesByDate = {},
}) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const dates = eachDayOfInterval({ start, end });

  // 현재 보이는 날짜 범위 계산
  const [visibleStartIndex, setVisibleStartIndex] = React.useState(0);
  const visibleDates = dates.slice(visibleStartIndex, visibleStartIndex + 7);

  const hasExpenses = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return !!expensesByDate[dateStr] && expensesByDate[dateStr] > 0;
  };

  const canGoPrev = visibleStartIndex > 0;
  const canGoNext = visibleStartIndex + 7 < dates.length;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      {/* 요일 표시 */}
      <div className="flex gap-1 mb-2">
        {visibleDates.map((date, index) => {
          const dayOfWeek = getDay(date);
          return (
            <div
              key={date.toISOString()}
              className="flex-1 text-center text-xs text-gray-500 font-medium"
            >
              {weekDays[dayOfWeek]}
            </div>
          );
        })}
      </div>

      {/* 날짜 선택기 */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setVisibleStartIndex(Math.max(0, visibleStartIndex - 7))}
          disabled={!canGoPrev}
          className={cn(
            "p-1 rounded-lg transition-colors",
            canGoPrev
              ? "hover:bg-gray-100 text-gray-600"
              : "text-gray-300 cursor-not-allowed"
          )}
          aria-label="이전"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex-1 flex gap-1">
          {visibleDates.map((date) => {
            const isSelected = selectedDate && isSameDay(date, selectedDate);
            const hasExpense = hasExpenses(date);
            const dateStr = format(date, "yyyy-MM-dd");
            const expenseAmount = expensesByDate[dateStr] || 0;

            return (
              <button
                key={date.toISOString()}
                onClick={() => onDateSelect(date)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-2 rounded-lg transition-all relative",
                  "min-h-[60px]",
                  isSelected
                    ? "bg-green-500 text-white"
                    : hasExpense
                    ? "bg-green-50 border-2 border-green-200 text-gray-700"
                    : "bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className="text-sm font-semibold">
                  {format(date, "d")}
                </span>
                {hasExpense && !isSelected && (
                  <span className="text-xs mt-0.5 text-green-600 font-medium">
                    {expenseAmount > 0 && formatCurrency(expenseAmount, "KRW").replace("₩", "").trim()}
                  </span>
                )}
                {hasExpense && (
                  <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-green-500 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={() =>
            setVisibleStartIndex(
              Math.min(dates.length - 7, visibleStartIndex + 7)
            )
          }
          disabled={!canGoNext}
          className={cn(
            "p-1 rounded-lg transition-colors",
            canGoNext
              ? "hover:bg-gray-100 text-gray-600"
              : "text-gray-300 cursor-not-allowed"
          )}
          aria-label="다음"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

