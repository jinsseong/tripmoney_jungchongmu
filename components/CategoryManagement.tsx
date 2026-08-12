"use client";

import React, { useState } from "react";
import { Category } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Modal } from "./ui/Modal";
import { Trash2, Edit2, Plus } from "lucide-react";

interface CategoryManagementProps {
  categories: Category[];
  onAdd: (name: string, icon: string, color: string) => Promise<void>;
  onUpdate: (
    id: string,
    updates: { name?: string; icon?: string; color?: string }
  ) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const EMOJI_OPTIONS = [
  "🍽️",
  "☕",
  "🚗",
  "🏨",
  "🎯",
  "🛍️",
  "🍻",
  "💊",
  "🎬",
  "🎮",
  "🏋️",
  "✈️",
  "🚂",
  "🚢",
  "🎪",
  "🎨",
  "📚",
  "🎵",
  "🏖️",
  "⛰️",
];

const COLOR_OPTIONS = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEAA7",
  "#DDA0DD",
  "#FF8C42",
  "#98D8C8",
  "#F39C12",
  "#E74C3C",
  "#3498DB",
  "#9B59B6",
  "#1ABC9C",
  "#F1C40F",
  "#E67E22",
];

export const CategoryManagement: React.FC<CategoryManagementProps> = ({
  categories,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    icon: "💊",
    color: "#98D8C8",
  });

  const handleAdd = async () => {
    if (!formData.name.trim()) return;
    try {
      await onAdd(formData.name.trim(), formData.icon, formData.color);
      setFormData({ name: "", icon: "💊", color: "#98D8C8" });
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleUpdate = async () => {
    if (!editingCategory || !formData.name.trim()) return;
    try {
      await onUpdate(editingCategory.id, {
        name: formData.name.trim(),
        icon: formData.icon,
        color: formData.color,
      });
      setEditingCategory(null);
      setFormData({ name: "", icon: "💊", color: "#98D8C8" });
    } catch (error) {
      console.error("Error updating category:", error);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      color: category.color,
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("정말 삭제하시겠습니까?")) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error("Error deleting category:", error);
      }
    }
  };

  const userCategories = categories.filter((c) => !c.is_default);
  const defaultCategories = categories.filter((c) => c.is_default);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="page-kicker mb-1">관리</div>
          <h2 className="page-title">카테고리 관리</h2>
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowAddModal(true);
            setFormData({ name: "", icon: "💊", color: "#98D8C8" });
          }}
          className="gap-1.5 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          카테고리 추가
        </Button>
      </div>

      {/* 기본 카테고리 */}
      {defaultCategories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>기본 카테고리</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {defaultCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="min-w-0 truncate text-sm font-bold text-[var(--foreground)]">
                    {category.name}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 사용자 정의 카테고리 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 정의 카테고리</CardTitle>
        </CardHeader>
        <CardContent>
          {userCategories.length === 0 ? (
            <div className="py-8 text-center text-[var(--muted)]">
              사용자 정의 카테고리가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {userCategories.map((category) => (
                <div
                  key={category.id}
                  className="group relative flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4"
                >
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-[var(--foreground)]">
                      {category.name}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <button
                      onClick={() => handleEdit(category)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--primary)] hover:bg-[var(--primary-soft)]"
                      aria-label="수정"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[var(--surface-danger)]"
                      aria-label="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카테고리 추가 모달 */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setFormData({ name: "", icon: "💊", color: "#98D8C8" });
        }}
        title="카테고리 추가"
      >
        <div className="space-y-4">
          <Input
            label="카테고리 이름"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="예: 영화"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--muted-strong)]">
              아이콘 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`min-h-[44px] min-w-[44px] rounded-lg border text-2xl transition-all ${
                    formData.icon === emoji
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--muted-strong)]">
              색상 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border border-black/5 transition-all ${
                    formData.color === color
                      ? "scale-105 ring-2 ring-[var(--primary)] ring-offset-2"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`색상 ${color}`}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="mt-2 h-12 w-full cursor-pointer rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddModal(false);
                setFormData({ name: "", icon: "💊", color: "#98D8C8" });
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleAdd}
              className="flex-1"
              disabled={!formData.name.trim()}
            >
              추가하기
            </Button>
          </div>
        </div>
      </Modal>

      {/* 카테고리 수정 모달 */}
      <Modal
        isOpen={!!editingCategory}
        onClose={() => {
          setEditingCategory(null);
          setFormData({ name: "", icon: "💊", color: "#98D8C8" });
        }}
        title="카테고리 수정"
      >
        <div className="space-y-4">
          <Input
            label="카테고리 이름"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            placeholder="예: 영화"
            required
          />

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--muted-strong)]">
              아이콘 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`min-h-[44px] min-w-[44px] rounded-lg border text-2xl transition-all ${
                    formData.icon === emoji
                      ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                      : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-bold text-[var(--muted-strong)]">
              색상 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`h-10 w-10 rounded-lg border border-black/5 transition-all ${
                    formData.color === color
                      ? "scale-105 ring-2 ring-[var(--primary)] ring-offset-2"
                      : ""
                  }`}
                  style={{ backgroundColor: color }}
                  aria-label={`색상 ${color}`}
                />
              ))}
            </div>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="mt-2 h-12 w-full cursor-pointer rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setEditingCategory(null);
                setFormData({ name: "", icon: "💊", color: "#98D8C8" });
              }}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdate}
              className="flex-1"
              disabled={!formData.name.trim()}
            >
              수정하기
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
