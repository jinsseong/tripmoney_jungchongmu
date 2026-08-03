"use client";

export const dynamic = "force-dynamic";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTrips } from "@/hooks/useTrips";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Settings, Tag, Plus, Trash2, Edit2 } from "lucide-react";
import Link from "next/link";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const { trips, loading: tripsLoading } = useTrips();
  const { categories, loading: categoriesLoading, addCategory, updateCategory, deleteCategory } = useCategories();
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💊");
  const [newCategoryColor, setNewCategoryColor] = useState("#6B7280");
  const [editingCategory, setEditingCategory] = useState<{ id: string; name: string; icon: string; color: string } | null>(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("💊");
  const [editCategoryColor, setEditCategoryColor] = useState("#6B7280");

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

  const handleEditCategory = (category: { id: string; name: string; icon: string; color: string }) => {
    setEditingCategory(category);
    setEditCategoryName(category.name);
    setEditCategoryIcon(category.icon);
    setEditCategoryColor(category.color);
  };

  const handleUpdateCategory = async () => {
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      await updateCategory(editingCategory.id, {
        name: editCategoryName.trim(),
        icon: editCategoryIcon,
        color: editCategoryColor,
      });
      setEditingCategory(null);
      setEditCategoryName("");
      setEditCategoryIcon("💊");
      setEditCategoryColor("#6B7280");
    } catch (error) {
      console.error("Failed to update category:", error);
      alert("카테고리 수정에 실패했습니다.");
    }
  };

  const categoryIcons = ["🍽️", "☕", "🚗", "🏨", "🎯", "🛍️", "🍻", "💊", "🎬", "🎮", "🏖️", "✈️"];
  const categoryColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD",
    "#FF8C42", "#98D8C8", "#F39C12", "#9B59B6", "#1ABC9C", "#E74C3C"
  ];

  return (
    <div className="app-screen safe-area">
      <div className="page-container">
        <div className="mb-6 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedTrip) {
                router.push(`/dashboard?trip=${selectedTrip.id}`);
              } else {
                router.push("/");
              }
            }}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div>
            <div className="page-kicker mb-1">관리</div>
            <h1 className="page-title">총무 관리</h1>
            <p className="page-subtitle mt-2">
              여행 중 자주 쓰는 지출 카테고리를 정리하세요.
            </p>
          </div>
        </div>

        {/* 카테고리 관리 */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-[#3182f6]" />
                <CardTitle>지출 카테고리</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {categoriesLoading ? (
              <div className="py-8 text-center text-[#6b7684]">로딩 중...</div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="group flex items-center justify-between gap-3 rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white text-2xl shadow-sm">
                          {category.icon}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-[#171719]">
                            {category.name}
                          </div>
                          <div
                            className="mt-1 h-4 w-4 rounded-full border border-black/5"
                            style={{ backgroundColor: category.color }}
                          />
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCategory({
                              id: category.id,
                              name: category.name,
                              icon: category.icon,
                              color: category.color,
                            });
                          }}
                          className="h-10 w-10 p-0 text-[#3182f6] hover:bg-[#e8f3ff]"
                          aria-label={`${category.name} 수정`}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        {!category.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(category.id, category.name);
                            }}
                            className="h-10 w-10 p-0 text-[#f04452] hover:bg-[#fff0f1]"
                            aria-label={`${category.name} 삭제`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 카테고리 추가 */}
                <div className="mt-4 border-t border-[#e5e8eb] pt-4">
                  <h3 className="mb-3 font-bold text-[#171719]">새 카테고리 추가</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="카테고리 이름"
                      className="min-h-[48px] w-full rounded-lg border border-[#d1d6db] px-3.5 text-base focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
                    />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-bold text-[#4e5968]">
                          아이콘
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categoryIcons.map((icon) => (
                            <button
                              key={icon}
                              type="button"
                              onClick={() => setNewCategoryIcon(icon)}
                              className={`min-h-[44px] min-w-[44px] rounded-lg border text-2xl transition-all ${
                                newCategoryIcon === icon
                                  ? "border-[#3182f6] bg-[#e8f3ff]"
                                  : "border-[#e5e8eb] bg-white hover:bg-[#f6f8fb]"
                              }`}
                            >
                              {icon}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-bold text-[#4e5968]">
                          색상
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {categoryColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewCategoryColor(color)}
                              className={`h-9 w-9 rounded-lg border border-black/5 ${
                                newCategoryColor === color
                                  ? "ring-2 ring-[#3182f6] ring-offset-2"
                                  : ""
                              }`}
                              style={{ backgroundColor: color }}
                              aria-label={`색상 ${color}`}
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
                      <Plus className="h-4 w-4" />
                      카테고리 추가
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 카테고리 수정 모달 */}
        <Modal
          isOpen={editingCategory !== null}
          onClose={() => {
            setEditingCategory(null);
            setEditCategoryName("");
            setEditCategoryIcon("💊");
            setEditCategoryColor("#6B7280");
          }}
          title="카테고리 수정"
        >
          <div className="space-y-4">
            <Input
              label="카테고리 이름"
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
              placeholder="카테고리 이름"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#4e5968]">
                  아이콘
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryIcons.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditCategoryIcon(icon)}
                      className={`min-h-[44px] min-w-[44px] rounded-lg border text-2xl transition-all ${
                        editCategoryIcon === icon
                          ? "border-[#3182f6] bg-[#e8f3ff]"
                          : "border-[#e5e8eb] bg-white hover:bg-[#f6f8fb]"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold text-[#4e5968]">
                  색상
                </label>
                <div className="flex flex-wrap gap-2">
                  {categoryColors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditCategoryColor(color)}
                      className={`h-9 w-9 rounded-lg border border-black/5 ${
                        editCategoryColor === color
                          ? "ring-2 ring-[#3182f6] ring-offset-2"
                          : ""
                      }`}
                      style={{ backgroundColor: color }}
                      aria-label={`색상 ${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingCategory(null);
                  setEditCategoryName("");
                  setEditCategoryIcon("💊");
                  setEditCategoryColor("#6B7280");
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateCategory}
                className="flex-1"
                disabled={!editCategoryName.trim()}
              >
                수정하기
              </Button>
            </div>
          </div>
        </Modal>

        {/* 빠른 링크 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectedTrip && (
            <Link href={`/dashboard?trip=${selectedTrip.id}`}>
              <Card className="tap-card cursor-pointer">
                <CardContent>
                  <h3 className="mb-1 text-lg font-bold text-[#171719]">대시보드로 돌아가기</h3>
                  <p className="text-sm text-[#6b7684]">{selectedTrip.name}</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Link href="/participants">
            <Card className="tap-card cursor-pointer">
              <CardContent>
                <h3 className="mb-1 text-lg font-bold text-[#171719]">참가자 관리</h3>
                <p className="text-sm text-[#6b7684]">참가자를 추가하고 관리하세요</p>
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
      <div className="app-screen flex items-center justify-center">
        <div className="text-[#6b7684]">로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
