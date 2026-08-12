"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Expense, Category } from "@/lib/types";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";

interface ExpenseChartProps {
  expenses: Expense[];
  categories: Category[];
  type?: "category" | "daily";
}

function useChartWidth() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const updateWidth = () => {
      setWidth(Math.max(240, Math.floor(element.getBoundingClientRect().width)));
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenses,
  categories,
  type = "category",
}) => {
  const { ref: chartRef, width: chartWidth } = useChartWidth();

  const categoryData = useMemo(() => {
    const categoryMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const categoryName = expense.category || "기타";
      const current = categoryMap.get(categoryName) || 0;
      categoryMap.set(categoryName, current + expense.amount);
    });

    // 카테고리별 색상 매핑 (기본 색상들)
    const defaultColors = [
      "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
      "#FFEAA7", "#DDA0DD", "#FF8C42", "#98D8C8"
    ];
    
    return Array.from(categoryMap.entries())
      .map(([name, amount], index) => {
        const category = categories.find((c) => c.name === name);
        // 카테고리가 있으면 카테고리 색상 사용, 없으면 기본 색상 순환
        const color = category?.color || defaultColors[index % defaultColors.length];
        return {
          name,
          amount,
          color: color,
          icon: category?.icon || "💊",
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [expenses, categories]);

  const dailyData = useMemo(() => {
    const dailyMap = new Map<string, number>();

    expenses.forEach((expense) => {
      const date = expense.date;
      const current = dailyMap.get(date) || 0;
      dailyMap.set(date, current + expense.amount);
    });

    return Array.from(dailyMap.entries())
      .map(([date, amount]) => ({
        date: new Date(date).toLocaleDateString("ko-KR", {
          month: "short",
          day: "numeric",
        }),
        amount,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
  }, [expenses]);

  const COLORS = categoryData.map((d) => d.color);

  if (type === "category") {
    return (
      <Card className="min-w-0 overflow-hidden">
        <CardHeader>
          <CardTitle>카테고리별 지출</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            ref={chartRef}
            className="h-80 min-h-[320px] min-w-0 w-full overflow-hidden"
          >
            {chartWidth > 0 && (
              <PieChart width={chartWidth} height={320}>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatCurrency(value, "KRW")}
                />
              </PieChart>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-[var(--surface-muted)] rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xl">{item.icon}</span>
                  <span className="font-medium">{item.name}</span>
                </div>
                <span className="font-semibold">
                  {formatCurrency(item.amount, "KRW")}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
      <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle>일별 지출 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          ref={chartRef}
          className="h-80 min-h-[320px] min-w-0 w-full overflow-hidden"
        >
          {chartWidth > 0 && (
            <BarChart
              data={dailyData}
              height={320}
              margin={{ top: 8, right: 8, bottom: 8, left: -8 }}
              width={chartWidth}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis
                tickFormatter={(value) =>
                  formatCurrency(value, "KRW").replace(/[₩]/g, "")
                }
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value, "KRW")}
              />
              <Legend />
              <Bar dataKey="amount" fill="var(--primary)" name="지출액" />
            </BarChart>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
