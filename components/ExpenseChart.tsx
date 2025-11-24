"use client";

import React, { useMemo } from "react";
import { Expense, Category, SharedExpense } from "@/lib/types";
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
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, getDateRange } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";

interface ExpenseChartProps {
  expenses: Expense[];
  categories: Category[];
  type?: "category" | "daily";
}

export const ExpenseChart: React.FC<ExpenseChartProps> = ({
  expenses,
  categories,
  type = "category",
}) => {
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
      <Card>
        <CardHeader>
          <CardTitle>카테고리별 지출</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 min-h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%" minHeight={320}>
              <PieChart>
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
            </ResponsiveContainer>
          </div>
          <div className="mt-4 space-y-2">
            {categoryData.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
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
    <Card>
      <CardHeader>
        <CardTitle>일별 지출 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 min-h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%" minHeight={320}>
            <BarChart data={dailyData}>
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
              <Bar dataKey="amount" fill="#3b82f6" name="지출액" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

