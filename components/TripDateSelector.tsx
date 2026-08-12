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
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-[var(--shadow-card)] sm:p-4">
      {/* 요일 표시 */}
      <div className="ml-9 mr-9 hidden gap-1 mb-2 sm:flex">
        {visibleDates.map((date, index) => {
          const dayOfWeek = getDay(date);
          return (
            <div
              key={date.toISOString()}
              className="flex-1 text-center text-xs font-bold text-[var(--muted-2)]"
            >
              {weekDays[dayOfWeek]}
            </div>
          );
        })}
      </div>

      {/* 날짜 선택기 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setVisibleStartIndex(Math.max(0, visibleStartIndex - 7))}
          disabled={!canGoPrev}
          className={cn(
            "min-h-[44px] min-w-[32px] rounded-lg transition-colors sm:min-w-[36px]",
            canGoPrev
              ? "text-[var(--muted-strong)] hover:bg-[var(--line)]"
              : "cursor-not-allowed text-[var(--line-strong)]"
          )}
          aria-label="이전"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="no-scrollbar -mx-1 flex flex-1 gap-1 overflow-x-auto px-1 sm:overflow-visible">
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
                  "relative flex min-h-[66px] min-w-[56px] flex-1 flex-col items-center justify-center rounded-lg p-2 transition-all sm:min-w-0",
                  isSelected
                    ? "bg-[var(--primary)] text-white shadow-[0_8px_18px_rgb(var(--color-primary)/20%)]"
                    : hasExpense
                    ? "border border-[var(--surface-selected)] bg-[var(--primary-soft)] text-[var(--foreground)]"
                    : "border border-transparent bg-[var(--surface-muted)] text-[var(--muted-strong)] hover:bg-[var(--line)]"
                )}
              >
                <span className="text-[11px] font-medium sm:hidden">
                  {weekDays[getDay(date)]}
                </span>
                <span className="text-sm font-semibold">
                  {format(date, "d")}
                </span>
                {hasExpense && !isSelected && (
                  <span className="mt-0.5 max-w-full truncate text-[10px] font-bold leading-tight text-[var(--primary-pressed)] sm:text-xs">
                    {expenseAmount > 0 && formatCurrency(expenseAmount, "KRW").replace("₩", "").trim()}
                  </span>
                )}
                {hasExpense && (
                  <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--success)]" />
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
            "min-h-[44px] min-w-[32px] rounded-lg transition-colors sm:min-w-[36px]",
            canGoNext
              ? "text-[var(--muted-strong)] hover:bg-[var(--line)]"
              : "cursor-not-allowed text-[var(--line-strong)]"
          )}
          aria-label="다음"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};
