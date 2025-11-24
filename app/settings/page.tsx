"use client";

export const dynamic = "force-dynamic";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTrips } from "@/hooks/useTrips";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, Settings, Tag, Plus, Trash2 } from "lucide-react";
import Link from "next/link";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const { trips, loading: tripsLoading } = useTrips();
  const { categories, loading: categoriesLoading, addCategory, deleteCategory } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💊");
  const [newCategoryColor, setNewCategoryColor] = useState("#6B7280");

  const selectedTrip = tripId
    ? trips.find((t) => t.id === tripId)
    : trips[0] || null;

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      await addCategory(
        newCategoryName.trim(),
        newCategoryIcon,
        newCategoryColor
      );
      setNewCategoryName("");
      setNewCategoryIcon("💊");
      setNewCategoryColor("#6B7280");
    } catch (error) {
      console.error("Failed to add category:", error);
      alert("카테고리 추가에 실패했습니다.");
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`${name} 카테고리를 삭제하시겠습니까?`)) return;

    try {
      await deleteCategory(id);
    } catch (error) {
      console.error("Failed to delete category:", error);
      alert("카테고리 삭제에 실패했습니다.");
    }
  };

  const categoryIcons = ["🍽️", "☕", "🚗", "🏨", "🎯", "🛍️", "🍻", "💊", "🎬", "🎮", "🏖️", "✈️"];
  const categoryColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
    "#FF8C42", "#98D8C8", "#F39C12", "#9B59B6", "#1ABC9C", "#E74C3C"
  ];

  return (
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (selectedTrip) {
                router.push(`/dashboard?trip=${selectedTrip.id}`);
              } else {
                router.push("/");
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">총무 관리</h1>
        </div>

        {/* 카테고리 관리 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-500" />
                <CardTitle>지출 카테고리</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <div className="font-medium text-sm">{category.name}</div>
                          <div
                            className="w-4 h-4 rounded-full mt-1"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                      </div>
                      {!category.is_default && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* 카테고리 추가 */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="font-semibold mb-3">새 카테고리 추가</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="카테고리 이름"
                      className="w-full h-11 rounded-lg border border-gray-300 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          아이콘
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categoryIcons.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => setNewCategoryIcon(icon)}
                              className={`text-2xl p-2 rounded ${
                                newCategoryIcon === icon
                                  ? "bg-blue-100 ring-2 ring-blue-500"
                                  : "bg-gray-100 hover:bg-gray-200"
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          색상
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categoryColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewCategoryColor(color)}
                              className={`w-8 h-8 rounded-full ${
                                newCategoryColor === color
                                  ? "ring-2 ring-gray-400 ring-offset-2"
                                  : ""
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="primary"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName.trim()}
                      className="w-full"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      카테고리 추가
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 빠른 링크 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedTrip && (
            <Link href={`/dashboard?trip=${selectedTrip.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent className="p-6 text-center">
                  <h3 className="text-lg font-semibold mb-2">대시보드로 돌아가기</h3>
                  <p className="text-gray-600 text-sm">{selectedTrip.name}</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Link href="/participants">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <h3 className="text-lg font-semibold mb-2">참가자 관리</h3>
                <p className="text-gray-600 text-sm">참가자를 추가하고 관리하세요</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

