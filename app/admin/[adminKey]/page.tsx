"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { Trip } from "@/lib/types";
import { setTripAccessSession } from "@/lib/trip-access";

export default function AdminAccessPage() {
  const router = useRouter();
  const params = useParams<{ adminKey: string }>();
  const adminKey = params.adminKey;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        setErrorMessage("");

        const { data, error } = await supabase
          .from("trips")
          .select("*")
          .eq("admin_key", adminKey)
          .single();

        if (error) {
          const message = error.message || "";
          if (error.code === "42703" || message.includes("admin_key")) {
            throw new Error("관리자 링크 스키마가 아직 적용되지 않았습니다.");
          }
          throw error;
        }

        const foundTrip = data as Trip;
        setTrip(foundTrip);
        setTripAccessSession({
          tripId: foundTrip.id,
          mode: "admin",
          adminKey,
          joinedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "관리자 링크를 확인하지 못했습니다.";
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [adminKey]);

  if (loading) {
    return (
      <main className="app-screen safe-area">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 text-[#6b7684]">
          관리자 링크를 확인하는 중...
        </div>
      </main>
    );
  }

  return (
    <main className="app-screen safe-area">
      <div className="page-container flex min-h-screen max-w-md flex-col justify-center">
        <Card className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#e8f3ff] text-[#3182f6]">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <div className="page-kicker mb-2">관리자 모드</div>
          <h1 className="text-2xl font-extrabold text-[#171719]">
            {trip ? `${trip.name} 관리자로 연결됨` : "관리자 링크를 확인해주세요"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[#6b7684]">
            관리자 모드에서는 지출 추가, 참가자 관리, 제보 승인/반려, 공유 설정을 사용할 수 있습니다.
          </p>

          {errorMessage && (
            <div className="mt-5 rounded-lg border border-[#ffd0d5] bg-[#fff0f1] p-3 text-sm font-bold leading-6 text-[#d93d4a]">
              {errorMessage}
            </div>
          )}

          {trip && (
            <Button
              type="button"
              variant="primary"
              className="mt-6 w-full gap-2"
              onClick={() => router.push(`/dashboard?trip=${trip.id}&mode=admin`)}
            >
              관리자 대시보드 열기
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </Card>
      </div>
    </main>
  );
}
