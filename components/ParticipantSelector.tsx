"use client";

import React from "react";
import { Participant } from "@/lib/types";
import { getInitials } from "@/lib/utils";
import { cn } from "@/lib/utils";

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
                "flex items-center gap-2 px-4 py-2 rounded-lg border-2 transition-all min-h-[44px]",
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              )}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                style={{ backgroundColor: participant.avatar_color }}
              >
                {getInitials(participant.name)}
              </div>
              <span className="font-medium">{participant.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

