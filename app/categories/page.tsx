"use client";

export const dynamic = "force-dynamic";

import React from "react";
import { useCategories } from "@/hooks/useCategories";
import { CategoryManagement } from "@/components/CategoryManagement";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function CategoriesPage() {
  const {
    categories,
    loading,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  if (loading) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="app-screen safe-area">
      <div className="page-container">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4 gap-1.5 sm:mb-6">
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
        </Link>

        <CategoryManagement
          categories={categories}
          onAdd={async (name, icon, color) => {
            await addCategory(name, icon, color, false);
          }}
          onUpdate={async (id, updates) => {
            await updateCategory(id, updates);
          }}
          onDelete={deleteCategory}
        />
      </div>
    </div>
  );
}
