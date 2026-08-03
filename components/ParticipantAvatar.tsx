"use client";

import React from "react";
import { Participant } from "@/lib/types";
import { cn, getInitials } from "@/lib/utils";

interface ParticipantAvatarProps {
  participant: Pick<Participant, "name" | "avatar_color" | "avatar_url">;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function ParticipantAvatar({
  participant,
  size = "md",
  className,
}: ParticipantAvatarProps) {
  return (
    <div
      aria-label={`${participant.name} 프로필`}
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cover bg-center font-semibold text-white",
        sizeClasses[size],
        className
      )}
      role="img"
      style={{
        backgroundColor: participant.avatar_color,
        backgroundImage: participant.avatar_url
          ? `url("${participant.avatar_url}")`
          : undefined,
      }}
    >
      {!participant.avatar_url && getInitials(participant.name)}
    </div>
  );
}
