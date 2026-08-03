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
  onApprove: (report: ExpenseReport) => Promise<Expense | void>;
  onReject: (report: ExpenseReport) => Promise<void>;
}

export function ExpenseReportInbox({
  reports,
  participants,
  loading = false,
  error,
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
        className="rounded-lg border border-gray-200 bg-white p-4"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="break-words text-base font-bold text-gray-900">
                {report.item_name}
              </h3>
              <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                {report.status === "pending"
                  ? "검토 대기"
                  : report.status === "approved"
                  ? "승인됨"
                  : "반려됨"}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {report.date} · 제보자 {getParticipantName(report.reporter_id)}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="text-xs text-gray-500">전체 비용</div>
                <div className="font-bold text-gray-900">
                  {formatCurrency(report.amount, report.currency)}
                </div>
              </div>
              <div className="rounded-lg bg-blue-50 p-3">
                <div className="text-xs text-blue-700">n분의 1 예상</div>
                <div className="font-bold text-blue-700">
                  {formatCurrency(perPersonAmount, report.currency)}
                  <span className="ml-1 text-xs font-medium">
                    / {report.participant_ids.length}명
                  </span>
                </div>
              </div>
            </div>
            {participantNames && (
              <div className="mt-3 text-sm leading-6 text-gray-600">
                참여자: {participantNames}
              </div>
            )}
            {report.ocr_text && (
              <details className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                <summary className="cursor-pointer font-medium text-gray-800">
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
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border-2 border-gray-300 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              영수증
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>

        {report.status === "pending" && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleReject(report)}
              isLoading={processingId === report.id}
              className="gap-2 text-red-600 hover:text-red-700"
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
          <div className="py-10 text-center text-gray-500">
            제보를 불러오는 중...
          </div>
        ) : error ? (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-orange-800">
            {error}
          </div>
        ) : reports.length === 0 ? (
          <div className="py-10 text-center text-gray-500">
            아직 등록된 지출 제보가 없습니다.
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-3">
              {pendingReports.length > 0 ? (
                pendingReports.map(renderReport)
              ) : (
                <div className="rounded-lg bg-gray-50 p-4 text-center text-sm text-gray-500">
                  검토 대기 중인 제보가 없습니다.
                </div>
              )}
            </div>

            {reviewedReports.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
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
