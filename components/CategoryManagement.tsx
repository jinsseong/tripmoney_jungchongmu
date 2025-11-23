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
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">카테고리 관리</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowAddModal(true);
            setFormData({ name: "", icon: "💊", color: "#98D8C8" });
          }}
        >
          <Plus className="h-4 w-4 mr-1" />
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {defaultCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex flex-col items-center p-4 bg-gray-50 rounded-lg"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="font-semibold text-sm text-center">
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
            <div className="text-center py-8 text-gray-500">
              사용자 정의 카테고리가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userCategories.map((category) => (
                <div
                  key={category.id}
                  className="relative flex flex-col items-center p-4 bg-gray-50 rounded-lg group"
                >
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-2xl mb-2"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  <div className="font-semibold text-sm text-center mb-2">
                    {category.name}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(category)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      aria-label="수정"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이콘 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                    formData.icon === emoji
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              색상 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? "border-gray-800 scale-110"
                      : "border-gray-200 hover:border-gray-300"
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
              className="mt-2 w-full h-12 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아이콘 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setFormData({ ...formData, icon: emoji })}
                  className={`w-12 h-12 text-2xl rounded-lg border-2 transition-all ${
                    formData.icon === emoji
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              색상 선택
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData({ ...formData, color })}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color
                      ? "border-gray-800 scale-110"
                      : "border-gray-200 hover:border-gray-300"
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
              className="mt-2 w-full h-12 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex gap-2">
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

