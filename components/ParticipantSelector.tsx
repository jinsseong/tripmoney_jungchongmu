"use client";

import React from "react";
import { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "./ParticipantAvatar";
import { CheckCheck, X } from "lucide-react";

interface ParticipantSelectorProps {
  participants: Participant[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectionChange?: (ids: string[]) => void;
  multiSelect?: boolean;
  label?: string;
}

export const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
  participants,
  selectedIds,
  onToggle,
  onSelectionChange,
  multiSelect = true,
  label = "참여자 선택",
}) => {
  const allSelected =
    participants.length > 0 && selectedIds.length === participants.length;

  return (
    <div className="space-y-2">
      {(label || (multiSelect && onSelectionChange)) && (
        <div className="flex min-h-8 items-center justify-between gap-3">
          {label ? (
            <label className="block text-sm font-bold text-[var(--muted-strong)]">
              {label}
            </label>
          ) : (
            <span />
          )}
          {multiSelect && onSelectionChange && participants.length > 0 && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => onSelectionChange(participants.map((participant) => participant.id))}
                disabled={allSelected}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-bold text-[var(--primary-pressed)] disabled:opacity-40"
                aria-label="참여자 전원 선택"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                전원
              </button>
              <button
                type="button"
                onClick={() => onSelectionChange([])}
                disabled={selectedIds.length === 0}
                className="inline-flex min-h-8 items-center gap-1 rounded-md px-2 text-xs font-bold text-[var(--muted)] disabled:opacity-40"
                aria-label="참여자 선택 해제"
              >
                <X className="h-3.5 w-3.5" />
                해제
              </button>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {participants.map((participant) => {
          const isSelected = selectedIds.includes(participant.id);
          return (
            <button
              key={participant.id}
              type="button"
              onClick={() => onToggle(participant.id)}
              className={cn(
                "flex min-h-[44px] max-w-full items-center gap-2 rounded-lg border px-3 py-2 transition-all sm:px-4",
                isSelected
                  ? "border-[var(--primary)] bg-[var(--primary-soft)] text-[var(--primary-pressed)]"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--line-strong)] hover:bg-[var(--surface-muted)]"
              )}
            >
              <ParticipantAvatar participant={participant} size="sm" />
              <span className="max-w-[11rem] truncate font-bold">{participant.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
