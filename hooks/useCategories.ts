"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/lib/types";

interface UseCategoriesOptions {
  enabled?: boolean;
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const { enabled = true } = options;
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!enabled) {
      setCategories([]);
      setError(null);
      setLoading(false);
      return [];
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("is_default", { ascending: false })
        .order("name", { ascending: true });

      if (error) throw error;
      setCategories(data || []);
      setError(null);
      return data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : "카테고리 조회 실패");
      console.error("Error fetching categories:", err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const addCategory = async (
    name: string,
    icon: string,
    color: string,
    isDefault: boolean = false
  ): Promise<Category | null> => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name, icon, color, is_default: isDefault }] as any)
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => [...prev, data as Category]);
      return data as Category;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "카테고리 추가 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const updateCategory = async (
    id: string,
    updates: { name?: string; icon?: string; color?: string }
  ): Promise<Category | null> => {
    try {
      const { data, error } = await (supabase
        .from("categories") as any)
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? (data as Category) : c))
      );
      return data as Category;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "카테고리 수정 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "카테고리 삭제 실패";
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  return {
    categories,
    loading,
    error,
    addCategory,
    updateCategory,
    deleteCategory,
    refetch: fetchCategories,
  };
}
