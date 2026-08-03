"use client";

import React from "react";
import { Participant } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ParticipantAvatar } from "./ParticipantAvatar";

interface ParticipantSelectorProps {
  participants: Participant[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  multiSelect?: boolean;
  label?: string;
}

export const ParticipantSelector: React.FC<ParticipantSelectorProps> = ({
  participants,
  selectedIds,
  onToggle,
  multiSelect = true,
  label = "참여자 선택",
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
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
                "flex min-h-[44px] max-w-full items-center gap-2 rounded-lg border-2 px-3 py-2 transition-all sm:px-4",
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              <ParticipantAvatar participant={participant} size="sm" />
              <span className="max-w-[11rem] truncate font-medium">{participant.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
