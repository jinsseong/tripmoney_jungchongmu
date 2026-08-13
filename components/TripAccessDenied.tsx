"use client";

import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

interface TripAccessDeniedProps {
  adminOnly?: boolean;
}

export function TripAccessDenied({ adminOnly = false }: TripAccessDeniedProps) {
  return (
    <main className="app-screen safe-area">
      <div className="page-container flex min-h-screen max-w-md items-center">
        <Card className="w-full text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface-warning)] text-[var(--warning-ink)]">
            <LockKeyhole className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-extrabold text-[var(--foreground)]">
            {adminOnly ? "관리자 링크가 필요합니다" : "접근할 수 없는 여행입니다"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            {adminOnly
              ? "이 기능은 해당 여행의 관리자 링크로 접속한 기기에서만 사용할 수 있습니다."
              : "받은 초대 링크 또는 관리자 링크를 다시 열어 이 여행에 접속해주세요."}
          </p>
          <Link href="/" className="mt-6 block">
            <Button variant="primary" className="w-full">
              내 여행으로 돌아가기
            </Button>
          </Link>
        </Card>
      </div>
    </main>
  );
}
