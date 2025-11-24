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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-1" />
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

