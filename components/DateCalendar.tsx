"use client";

import React, { useState } from "react";
import { Expense } from "@/lib/types";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateCalendarProps {
  expenses: Expense[];
  onDateClick?: (date: Date) => void;
  selectedDate?: Date;
}

export const DateCalendar: React.FC<DateCalendarProps> = ({
  expenses,
  onDateClick,
  selectedDate,
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get expenses by date
  const expensesByDate = expenses.reduce((acc, expense) => {
    const date = expense.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(expense);
    return acc;
  }, {} as Record<string, Expense[]>);

  const getTotalForDate = (date: Date): number => {
    const dateStr = format(date, "yyyy-MM-dd");
    const dayExpenses = expensesByDate[dateStr] || [];
    return dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  };

  const hasExpenses = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    return !!expensesByDate[dateStr] && expensesByDate[dateStr].length > 0;
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  // Get first day of week offset
  const firstDayOfWeek = getDay(monthStart);

  return (
    <div className="bg-[var(--surface)] rounded-xl p-4 shadow-sm">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={previousMonth}
          className="p-2 hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
          aria-label="이전 달"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, "yyyy년 M월", { locale: ko })}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-[var(--surface-muted)] rounded-lg transition-colors"
          aria-label="다음 달"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-[var(--muted-2)] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for days before month start */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square" />
        ))}

        {/* Days in month */}
        {daysInMonth.map((date) => {
          const total = getTotalForDate(date);
          const hasExpense = hasExpenses(date);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const isToday = isSameDay(date, new Date());

          return (
            <button
              key={date.toISOString()}
              onClick={() => onDateClick?.(date)}
              className={cn(
                "aspect-square p-1 rounded-lg transition-all relative",
                "hover:bg-[var(--surface-muted)]",
                isSelected && "border-2 border-[var(--primary)] bg-[var(--primary-soft)]",
                isToday && !isSelected && "bg-[var(--primary-soft)] border border-[var(--line-info)]",
                !isToday && !isSelected && "border border-transparent"
              )}
            >
              <div className="text-sm font-medium mb-1">
                {format(date, "d")}
              </div>
              {hasExpense && (
                <div className="text-xs text-[var(--primary-pressed)] font-semibold">
                  {formatCurrency(total, "KRW").replace(/[₩]/g, "")}
                </div>
              )}
              {hasExpense && (
                <div className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--success)]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
