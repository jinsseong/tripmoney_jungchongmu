"use client";

import React, { useState } from "react";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Expense, ExpenseReport, Participant } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface ExpenseReportInboxProps {
  reports: ExpenseReport[];
  participants: Participant[];
  loading?: boolean;
  error?: string | null;
  canManage?: boolean;
  onApprove: (report: ExpenseReport) => Promise<Expense | void>;
  onReject: (report: ExpenseReport) => Promise<void>;
}

export function ExpenseReportInbox({
  reports,
  participants,
  loading = false,
  error,
  canManage = true,
  onApprove,
  onReject,
}: ExpenseReportInboxProps) {
  const [processingId, setProcessingId] = useState("");
  const pendingReports = reports.filter((report) => report.status === "pending");
  const reviewedReports = reports.filter((report) => report.status !== "pending");

  const getParticipantName = (participantId?: string) =>
    participants.find((participant) => participant.id === participantId)?.name ||
    "알 수 없음";

  const handleApprove = async (report: ExpenseReport) => {
    try {
      setProcessingId(report.id);
      await onApprove(report);
    } finally {
      setProcessingId("");
    }
  };

  const handleReject = async (report: ExpenseReport) => {
    if (!confirm("이 지출 제보를 반려하시겠습니까?")) {
      return;
    }

    try {
      setProcessingId(report.id);
      await onReject(report);
    } finally {
      setProcessingId("");
    }
  };

  const renderReport = (report: ExpenseReport) => {
    const participantNames = report.participant_ids
      .map(getParticipantName)
      .join(", ");
    const perPersonAmount =
      report.participant_ids.length > 0
        ? Math.floor(report.amount / report.participant_ids.length)
        : 0;

    return (
      <div
        key={report.id}
        className="rounded-lg border border-[#e5e8eb] bg-white p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-base font-bold text-[#171719]">
                {report.item_name}
              </h3>
              <span className="rounded-full bg-[#eef2f6] px-2 py-1 text-xs font-bold text-[#6b7684]">
                {report.status === "pending"
                  ? "검토 대기"
                  : report.status === "approved"
                  ? "승인됨"
                  : "반려됨"}
              </span>
            </div>
            <div className="mt-1 text-sm text-[#6b7684]">
              {report.date} · 제보자 {getParticipantName(report.reporter_id)}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-3">
                <div className="text-xs font-bold text-[#6b7684]">전체 비용</div>
                <div className="font-extrabold text-[#171719]">
                  {formatCurrency(report.amount, report.currency)}
                </div>
              </div>
              <div className="rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-3">
                <div className="text-xs font-bold text-[#1b64da]">n분의 1 예상</div>
                <div className="font-extrabold text-[#1b64da]">
                  {formatCurrency(perPersonAmount, report.currency)}
                  <span className="ml-1 text-xs font-bold">
                    / {report.participant_ids.length}명
                  </span>
                </div>
              </div>
            </div>
            {participantNames && (
              <div className="mt-3 text-sm leading-6 text-[#6b7684]">
                참여자: {participantNames}
              </div>
            )}
            {report.ocr_text && (
              <details className="mt-3 rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-3 text-sm text-[#6b7684]">
                <summary className="cursor-pointer font-bold text-[#4e5968]">
                  인식된 텍스트
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5">
                  {report.ocr_text}
                </pre>
              </details>
            )}
          </div>

          {report.receipt_image_url && (
            <a
              href={report.receipt_image_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#d1d6db] bg-white px-3 text-sm font-bold text-[#4e5968] hover:bg-[#f6f8fb]"
            >
              영수증
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {canManage && report.status === "pending" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleReject(report)}
              isLoading={processingId === report.id}
              className="gap-2 text-[#f04452] hover:bg-[#fff0f1] hover:text-[#d93d4a]"
            >
              <X className="h-4 w-4" />
              반려
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => handleApprove(report)}
              isLoading={processingId === report.id}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              승인 반영
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>지출 제보함</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-10 text-center text-[#6b7684]">
            제보를 불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-[#ffe1ad] bg-[#fff8e8] p-3 text-sm leading-6 text-[#9a6700]">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center text-[#6b7684]">
            아직 등록된 지출 제보가 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {pendingReports.length > 0 ? (
                pendingReports.map(renderReport)
              ) : (
                <div className="rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-4 text-center text-sm text-[#6b7684]">
                  검토 대기 중인 제보가 없습니다.
                </div>
              )}
            </div>

            {reviewedReports.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-[#4e5968]">
                  처리된 제보
                </h3>
                {reviewedReports.map(renderReport)}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
