"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Calendar, Camera, Check, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { supabase } from "@/lib/supabase";
import { Trip } from "@/lib/types";
import { setTripAccessSession } from "@/lib/trip-access";
import { generateAvatarColor } from "@/lib/utils";

const AVATAR_BUCKET = "participant-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function createUploadPath(inviteKey: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${inviteKey}/${uniqueId}.${extension}`;
}

export default function JoinTripPage() {
  const router = useRouter();
  const params = useParams<{ inviteKey: string }>();
  const inviteKey = params.inviteKey;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [nickname, setNickname] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [joinedParticipantId, setJoinedParticipantId] = useState("");

  const avatarPreviewUrl = useMemo(() => {
    if (!avatarFile) return "";
    return URL.createObjectURL(avatarFile);
  }, [avatarFile]);

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        setLoading(true);
        setFormError("");

        const { data, error } = await supabase
          .from("trips")
          .select("*")
          .eq("invite_key", inviteKey)
          .single();

        if (error) {
          const message = error.message || "";
          if (error.code === "42703" || message.includes("invite_key")) {
            throw new Error("초대 기능 스키마가 아직 적용되지 않았습니다.");
          }
          throw error;
        }

        setTrip(data as Trip);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "초대 정보를 불러오지 못했습니다.";
        setFormError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchTrip();
  }, [inviteKey]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFormError("");

    if (!file) {
      setAvatarFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("프로필 사진은 이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setFormError("프로필 사진은 5MB 이하로 업로드해주세요.");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
  };

  const handleJoinTrip = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!trip) {
      setFormError("참여할 여행 정보를 찾을 수 없습니다.");
      return;
    }

    if (!nickname.trim()) {
      setFormError("닉네임을 입력해주세요.");
      return;
    }

    let uploadedAvatarPath = "";

    try {
      setSubmitting(true);
      const avatarColor = generateAvatarColor(nickname.trim());
      let avatarUrl: string | undefined;

      if (avatarFile) {
        uploadedAvatarPath = createUploadPath(inviteKey, avatarFile);
        const { error: uploadError } = await supabase.storage
          .from(AVATAR_BUCKET)
          .upload(uploadedAvatarPath, avatarFile, {
            cacheControl: "31536000",
            contentType: avatarFile.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error("프로필 사진 업로드에 실패했습니다. Supabase Storage 버킷을 확인해주세요.");
        }

        const { data: publicUrlData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(uploadedAvatarPath);
        avatarUrl = publicUrlData.publicUrl;
      }

      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .insert([
          {
            name: nickname.trim(),
            avatar_color: avatarColor,
            avatar_url: avatarUrl,
          },
        ] as any)
        .select()
        .single();

      if (participantError) {
        throw participantError;
      }

      const { error: joinError } = await supabase
        .from("trip_participants")
        .insert({
          trip_id: trip.id,
          participant_id: (participant as { id: string }).id,
          role: "participant",
        } as any);

      if (joinError) {
        await supabase
          .from("participants")
          .delete()
          .eq("id", (participant as { id: string }).id);
        throw joinError;
      }

      try {
        localStorage.setItem(
          `jungchongmu-participant:${trip.id}`,
          (participant as { id: string }).id
        );
        setTripAccessSession({
          tripId: trip.id,
          mode: "participant",
          participantId: (participant as { id: string }).id,
          participantName: nickname.trim(),
          joinedAt: new Date().toISOString(),
        });
      } catch {
        // localStorage가 막혀도 참가 자체는 완료됩니다.
      }

      setJoinedParticipantId((participant as { id: string }).id);
    } catch (error) {
      if (uploadedAvatarPath) {
        await supabase.storage.from(AVATAR_BUCKET).remove([uploadedAvatarPath]);
      }

      const message =
        error instanceof Error ? error.message : "여행 참여에 실패했습니다.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="app-screen safe-area">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 text-[var(--muted)]">
          초대 정보를 불러오는 중...
        </div>
      </main>
    );
  }

  if (joinedParticipantId && trip) {
    return (
      <main className="app-screen safe-area">
        <div className="page-container flex min-h-screen max-w-md flex-col justify-center">
          <div className="rounded-lg border border-[var(--line-success)] bg-[var(--surface)] p-6 text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[var(--surface-success)] text-[var(--success)]">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-[var(--foreground)]">참여 완료</h1>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              {trip.name} 참가자로 등록되었습니다.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-6 w-full gap-2"
              onClick={() => router.push(`/dashboard?trip=${trip.id}&mode=participant`)}
            >
              정산 현황 보기
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-screen safe-area">
      <div className="page-container flex min-h-screen max-w-md flex-col justify-center">
        <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
          <div className="mb-6">
            <div className="page-kicker mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              여행 참가 초대
            </div>
            <h1 className="text-2xl font-extrabold leading-tight text-[var(--foreground)]">
              {trip ? trip.name : "초대 링크를 확인해주세요"}
            </h1>
            {trip && (
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                닉네임과 프로필 사진을 설정하면 이 여행의 정산 참여자로 등록됩니다.
              </p>
            )}
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-[var(--surface-danger)] bg-[var(--surface-danger)] p-3 text-sm font-bold leading-6 text-[var(--danger-ink)]">
              {formError}
            </div>
          )}

          {trip && (
            <form className="space-y-5" onSubmit={handleJoinTrip}>
              <div className="flex flex-col items-center gap-3">
                <ParticipantAvatar
                  participant={{
                    name: nickname || "참가자",
                    avatar_color: generateAvatarColor(nickname || "참가자"),
                    avatar_url: avatarPreviewUrl,
                  }}
                  size="xl"
                />
                <label className="inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] px-4 text-sm font-bold text-[var(--muted-strong)] hover:bg-[var(--surface-muted)]">
                  <Camera className="h-4 w-4" />
                  프로필 사진 선택
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarChange}
                  />
                </label>
                {avatarFile && (
                  <p className="max-w-full truncate text-xs text-[var(--muted-2)]">
                    {avatarFile.name}
                  </p>
                )}
              </div>

              <Input
                label="닉네임"
                value={nickname}
                onChange={(event) => {
                  setNickname(event.target.value);
                  setFormError("");
                }}
                placeholder="예: 민수"
                maxLength={24}
                required
              />

              <Button
                type="submit"
                variant="primary"
                className="w-full gap-2"
                disabled={!nickname.trim()}
                isLoading={submitting}
              >
                <UploadCloud className="h-4 w-4" />
                여행 참여하기
              </Button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
