"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Category } from "@/lib/types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = async () => {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "카테고리 조회 실패");
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const addCategory = async (
    name: string,
    icon: string,
    color: string,
    isDefault: boolean = false
  ) => {
    try {
      // @ts-expect-error - Supabase types may not be available during build
      const { data, error } = await supabase
        .from("categories")
        .insert([{ name, icon, color, is_default: isDefault }])
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) => [...prev, data]);
      return data;
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
  ) => {
    try {
      // @ts-expect-error - Supabase types may not be available during build
      const { data, error } = await supabase
        .from("categories")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      setCategories((prev) =>
        prev.map((c) => (c.id === id ? data : c))
      );
      return data;
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

