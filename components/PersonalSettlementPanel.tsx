"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Expense, Participant, SettlementTransfer, UserTotal } from "@/lib/types";
import { formatCurrency, cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { ParticipantAvatar } from "./ParticipantAvatar";

interface PersonalSettlementPanelProps {
  participants: Participant[];
  expenses: Expense[];
  userTotals: UserTotal[];
  transfers: SettlementTransfer[];
  preferredParticipantId?: string;
}

function getParticipantShare(expense: Expense, participantId: string) {
  if (expense.daily_participants && expense.daily_participants.length > 0) {
    const byDate: Record<string, string[]> = {};
    expense.daily_participants.forEach((dailyParticipant) => {
      if (!byDate[dailyParticipant.date]) {
        byDate[dailyParticipant.date] = [];
      }
      byDate[dailyParticipant.date].push(dailyParticipant.participant_id);
    });

    return Object.entries(byDate).reduce((sum, [, participantIds], dateIndex, dates) => {
      if (!participantIds.includes(participantId)) {
        return sum;
      }

      const dailyAmount = Math.floor(expense.amount / dates.length);
      const dailyRemainder = expense.amount % dates.length;
      const dateAmount = dailyAmount + (dateIndex === 0 ? dailyRemainder : 0);
      const perPerson = Math.floor(dateAmount / participantIds.length);
      const remainder = dateAmount % participantIds.length;
      const participantIndex = participantIds.indexOf(participantId);

      return sum + perPerson + (participantIndex === 0 ? remainder : 0);
    }, 0);
  }

  const expenseParticipants = expense.expense_participants || [];
  const participantIndex = expenseParticipants.findIndex(
    (participant) => participant.participant_id === participantId
  );

  if (participantIndex < 0) {
    return 0;
  }

  if (expense.settlement_type === "custom") {
    return expenseParticipants[participantIndex].custom_amount || 0;
  }

  const perPerson = Math.floor(expense.amount / expenseParticipants.length);
  const remainder = expense.amount % expenseParticipants.length;
  return perPerson + (participantIndex === 0 ? remainder : 0);
}

export function PersonalSettlementPanel({
  participants,
  expenses,
  userTotals,
  transfers,
  preferredParticipantId,
}: PersonalSettlementPanelProps) {
  const [selectedParticipantId, setSelectedParticipantId] = useState(
    preferredParticipantId || participants[0]?.id || ""
  );

  useEffect(() => {
    if (
      preferredParticipantId &&
      participants.some((participant) => participant.id === preferredParticipantId)
    ) {
      setSelectedParticipantId(preferredParticipantId);
    }
  }, [participants, preferredParticipantId]);

  useEffect(() => {
    if (
      participants.length > 0 &&
      !participants.some((participant) => participant.id === selectedParticipantId)
    ) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants, selectedParticipantId]);
  const selectedParticipant =
    participants.find((participant) => participant.id === selectedParticipantId) ||
    participants[0];
  const selectedTotal = userTotals.find(
    (total) => total.id === selectedParticipant?.id
  );

  const personalExpenses = useMemo(() => {
    if (!selectedParticipant) {
      return [];
    }

    return expenses
      .map((expense) => ({
        expense,
        shareAmount: getParticipantShare(expense, selectedParticipant.id),
        isPayer: expense.payer_id === selectedParticipant.id,
      }))
      .filter((item) => item.shareAmount > 0 || item.isPayer);
  }, [expenses, selectedParticipant]);

  const personalTransfers = transfers.filter(
    (transfer) =>
      transfer.from.id === selectedParticipant?.id ||
      transfer.to.id === selectedParticipant?.id
  );

  if (participants.length === 0) {
    return (
      <Card>
        <div className="py-10 text-center text-[var(--muted-2)]">
          개인별 정산을 보려면 참가자를 먼저 추가해주세요.
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {participants.map((participant) => {
          const isSelected = selectedParticipant?.id === participant.id;
          return (
            <button
              key={participant.id}
              type="button"
              onClick={() => setSelectedParticipantId(participant.id)}
              className={cn(
                "flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border-2 px-3 py-2 text-sm font-medium",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-pressed)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)]"
              )}
            >
              <ParticipantAvatar participant={participant} size="sm" />
              {participant.name}
            </button>
          );
        })}
      </div>

      {selectedParticipant && (
        <Card>
          <div className="flex items-center gap-3">
            <ParticipantAvatar participant={selectedParticipant} size="lg" />
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-bold text-[var(--foreground)]">
                {selectedParticipant.name}
              </h2>
              <p className="text-sm text-[var(--muted-2)]">
                개인별 지출과 최종 송금 안내
              </p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--muted-2)]">낸 돈</div>
              <div className="mt-1 break-all font-bold text-[var(--foreground)]">
                {formatCurrency(selectedTotal?.totalPaid || 0)}
              </div>
            </div>
            <div className="rounded-lg bg-[var(--surface-muted)] p-3">
              <div className="text-xs text-[var(--muted-2)]">부담액</div>
              <div className="mt-1 break-all font-bold text-[var(--foreground)]">
                {formatCurrency(selectedTotal?.totalOwed || 0)}
              </div>
            </div>
            <div className="rounded-lg bg-[var(--surface-success)] p-3">
              <div className="text-xs text-[var(--success-ink)]">받을 돈</div>
              <div className="mt-1 break-all font-bold text-[var(--success-ink)]">
                {formatCurrency(Math.max(selectedTotal?.netBalance || 0, 0))}
              </div>
            </div>
            <div className="rounded-lg bg-[var(--surface-danger)] p-3">
              <div className="text-xs text-[var(--danger-ink)]">낼 돈</div>
              <div className="mt-1 break-all font-bold text-[var(--danger-ink)]">
                {formatCurrency(Math.max(-(selectedTotal?.netBalance || 0), 0))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>송금 안내</CardTitle>
        </CardHeader>
        <CardContent>
          {personalTransfers.length > 0 ? (
            <div className="space-y-2">
              {personalTransfers.map((transfer, index) => (
                <div
                  key={`${transfer.from.id}-${transfer.to.id}-${index}`}
                  className="flex flex-col gap-1 rounded-lg border border-[var(--surface-muted)] bg-[var(--surface-muted)] p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="font-medium text-[var(--foreground)]">
                    {transfer.from.name} → {transfer.to.name}
                  </span>
                  <span className="font-bold text-[var(--primary-pressed)]">
                    {formatCurrency(transfer.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-[var(--muted-2)]">
              이 참가자와 관련된 송금 내역이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>참여한 지출</CardTitle>
        </CardHeader>
        <CardContent>
          {personalExpenses.length > 0 ? (
            <div className="space-y-2">
              {personalExpenses.map(({ expense, shareAmount, isPayer }) => (
                <div
                  key={expense.id}
                  className="rounded-lg border border-[var(--surface-muted)] bg-[var(--surface)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-[var(--foreground)]">
                        {expense.item_name}
                      </div>
                      <div className="mt-1 text-xs text-[var(--muted-2)]">
                        {expense.date}
                        {isPayer ? " · 결제자" : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-[var(--muted-2)]">내 부담</div>
                      <div className="font-bold text-[var(--foreground)]">
                        {formatCurrency(shareAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-[var(--muted-2)]">
              참여한 지출이 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
