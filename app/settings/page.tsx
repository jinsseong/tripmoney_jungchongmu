"use client";

export const dynamic = "force-dynamic";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTrips } from "@/hooks/useTrips";
import { useCategories } from "@/hooks/useCategories";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CategoryManagement } from "@/components/CategoryManagement";
import { TripAccessDenied } from "@/components/TripAccessDenied";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTripAccessSession, TripAccessSession } from "@/lib/trip-access";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const [accessSession, setAccessSession] = useState<TripAccessSession | null>(null);
  const [accessResolved, setAccessResolved] = useState(false);
  const authorizedTripId =
    accessResolved &&
    accessSession?.tripId === tripId &&
    accessSession.mode === "admin"
      ? tripId
      : null;
  const { trips, loading: tripsLoading } = useTrips({
    enabled: Boolean(authorizedTripId),
    ids: authorizedTripId ? [authorizedTripId] : [],
  });
  const {
    categories,
    loading: categoriesLoading,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useCategories({ enabled: Boolean(authorizedTripId) });

  useEffect(() => {
    setAccessSession(getTripAccessSession(tripId));
    setAccessResolved(true);
  }, [tripId]);

  const selectedTrip = tripId
    ? trips.find((t) => t.id === tripId)
    : null;

  if (!accessResolved) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">접근 권한 확인 중...</div>
      </div>
    );
  }

  if (!authorizedTripId) {
    return <TripAccessDenied adminOnly />;
  }

  if (tripsLoading || categoriesLoading) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">총무 설정 불러오는 중...</div>
      </div>
    );
  }

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
        <div className="mb-6">
          {categoriesLoading ? (
            <Card>
              <div className="py-8 text-center text-[var(--muted)]">로딩 중...</div>
            </Card>
          ) : (
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
          )}
        </div>

        {/* 빠른 링크 */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {selectedTrip && (
            <Link href={`/dashboard?trip=${selectedTrip.id}`}>
              <Card className="tap-card cursor-pointer">
                <CardContent>
                  <h3 className="mb-1 text-lg font-bold text-[var(--foreground)]">대시보드로 돌아가기</h3>
                  <p className="text-sm text-[var(--muted)]">{selectedTrip.name}</p>
                </CardContent>
              </Card>
            </Link>
          )}
          <Link href={`/participants?trip=${selectedTrip?.id || authorizedTripId}`}>
            <Card className="tap-card cursor-pointer">
              <CardContent>
                <h3 className="mb-1 text-lg font-bold text-[var(--foreground)]">참가자 관리</h3>
                <p className="text-sm text-[var(--muted)]">참가자를 추가하고 관리하세요</p>
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
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
