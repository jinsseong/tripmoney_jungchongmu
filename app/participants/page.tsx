"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState, Suspense } from "react";
import { useParticipants } from "@/hooks/useParticipants";
import { useTripParticipants } from "@/hooks/useTripParticipants";
import { useTrips } from "@/hooks/useTrips";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ParticipantAvatar } from "@/components/ParticipantAvatar";
import { Plus, Users, ArrowLeft, X, Link2, Copy, Share2, Check } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { getTripAccessSession } from "@/lib/trip-access";

function ParticipantsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tripId = searchParams.get("trip");
  const { trips } = useTrips();
  const currentTrip = tripId ? trips.find((t) => t.id === tripId) : null;
  const { participants: allParticipants, addParticipant } = useParticipants();
  const {
    participants,
    loading,
    addParticipantToTrip,
    removeParticipantFromTrip,
  } = useTripParticipants(tripId);
  const [showAddModal, setShowAddModal] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [copiedAdminLink, setCopiedAdminLink] = useState(false);
  const [isParticipantMode, setIsParticipantMode] = useState(
    searchParams.get("mode") === "participant"
  );
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const accessSession = getTripAccessSession(tripId);
    setIsParticipantMode(
      searchParams.get("mode") === "participant" ||
        accessSession?.mode === "participant"
    );
  }, [tripId, searchParams]);

  const inviteUrl =
    currentTrip?.invite_key && origin
      ? `${origin}/join/${currentTrip.invite_key}`
      : "";
  const adminUrl =
    currentTrip?.admin_key && origin
      ? `${origin}/admin/${currentTrip.admin_key}`
      : "";

  const handleCopyInviteLink = async () => {
    if (!inviteUrl) return;

    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedInviteLink(true);
      window.setTimeout(() => setCopiedInviteLink(false), 2000);
    } catch (error) {
      console.error("Failed to copy invite link:", error);
      alert("초대 링크 복사에 실패했습니다.");
    }
  };

  const handleShareInviteLink = async () => {
    if (!inviteUrl) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `${currentTrip?.name || "여행"} 참가 초대`,
          text: "닉네임과 프로필 사진을 설정하고 여행 정산에 참여해주세요.",
          url: inviteUrl,
        });
        return;
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") {
          console.error("Failed to share invite link:", error);
        }
      }
    }

    await handleCopyInviteLink();
  };

  const handleCopyAdminLink = async () => {
    if (!adminUrl) return;

    try {
      await navigator.clipboard.writeText(adminUrl);
      setCopiedAdminLink(true);
      window.setTimeout(() => setCopiedAdminLink(false), 2000);
    } catch (error) {
      console.error("Failed to copy admin link:", error);
      alert("관리자 링크 복사에 실패했습니다.");
    }
  };

  const handleAddParticipant = async () => {
    if (!formData.name.trim()) return;

    try {
      // 먼저 참가자를 생성
      const newParticipant = await addParticipant(
        formData.name.trim(),
        formData.phone || undefined
      );
      
      // 여행이 선택되어 있으면 여행에 추가
      if (tripId && newParticipant && newParticipant.id) {
        await addParticipantToTrip(newParticipant.id);
      }
      
      setFormData({ name: "", phone: "" });
      setShowAddModal(false);
    } catch (error) {
      console.error("Failed to add participant:", error);
      alert("참가자 추가에 실패했습니다.");
    }
  };

  const handleAddExistingParticipant = async (participantId: string) => {
    if (!tripId) return;

    try {
      await addParticipantToTrip(participantId);
    } catch (error) {
      console.error("Failed to add participant to trip:", error);
      alert("참가자 추가에 실패했습니다.");
    }
  };

  const handleRemoveParticipant = async (participantId: string, name: string) => {
    if (!tripId) return;
    if (!confirm(`${name} 참가자를 이 여행에서 제거하시겠습니까?`)) return;

    try {
      await removeParticipantFromTrip(participantId);
    } catch (error) {
      console.error("Failed to remove participant from trip:", error);
      alert("참가자 제거에 실패했습니다.");
    }
  };

  // 여행에 포함되지 않은 참가자 목록
  const availableParticipants = allParticipants.filter(
    (p) => !participants.some((tp) => tp.id === p.id)
  );

  return (
    <div className="app-screen safe-area">
      <div className="page-container">
        <div className="mb-6 space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              router.push(
                tripId
                  ? `/dashboard?trip=${tripId}${isParticipantMode ? "&mode=participant" : "&mode=admin"}`
                  : "/"
              )
            }
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            뒤로
          </Button>
          <div>
            <div className="page-kicker mb-1">참가자</div>
            <h1 className="page-title break-words">
              {currentTrip ? currentTrip.name : "참가자 관리"}
            </h1>
            <p className="page-subtitle mt-2">
              {isParticipantMode
                ? "같은 여행에 참여한 사람을 확인할 수 있습니다."
                : "정산에 참여할 사람을 관리하고 초대 링크를 공유하세요."}
            </p>
          </div>
        </div>

        {tripId && currentTrip && !isParticipantMode && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>초대 링크</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {inviteUrl ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-[var(--surface-selected)] bg-[var(--primary-soft)] p-3">
                    <p className="text-sm font-bold leading-6 text-[var(--primary-pressed)]">
                      참가자는 이 링크에서 닉네임과 프로필 사진을 직접 설정할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-h-[48px] flex-1 break-all rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-3 text-sm leading-5 text-[var(--muted-strong)]">
                      {inviteUrl}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:flex">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyInviteLink}
                        className="gap-2"
                      >
                        {copiedInviteLink ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                        {copiedInviteLink ? "복사됨" : "복사"}
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={handleShareInviteLink}
                        className="gap-2"
                      >
                        <Share2 className="h-4 w-4" />
                        공유
                      </Button>
                    </div>
                  </div>
                  {adminUrl ? (
                    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
                      <div className="mb-2 text-sm font-extrabold text-[var(--foreground)]">
                        관리자 링크
                      </div>
                      <p className="mb-3 text-sm leading-6 text-[var(--muted)]">
                        이 링크는 지출 추가, 참가자 관리, 설정 변경 권한이 있는 사람에게만 공유하세요.
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <div className="min-h-[48px] flex-1 break-all rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] px-3.5 py-3 text-sm leading-5 text-[var(--muted-strong)]">
                          {adminUrl}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCopyAdminLink}
                          className="gap-2"
                        >
                          {copiedAdminLink ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                          {copiedAdminLink ? "복사됨" : "복사"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-[var(--surface-warning)] bg-[var(--surface-warning)] p-3 text-sm leading-6 text-[var(--warning-ink)]">
                      관리자 링크를 사용하려면 Supabase 스키마에 trips.admin_key 컬럼을 먼저 적용해야 합니다.
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-[var(--surface-warning)] bg-[var(--surface-warning)] p-3 text-sm leading-6 text-[var(--warning-ink)]">
                  초대 링크를 사용하려면 Supabase 스키마에 trips.invite_key 컬럼을 먼저 적용해야 합니다.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--primary)]" />
                <CardTitle>참가자 목록</CardTitle>
              </div>
              {!isParticipantMode && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddModal(true)}
                  className="shrink-0 gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  추가
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-8 text-center text-[var(--muted)]">로딩 중...</div>
            ) : participants.length === 0 ? (
              <div className="py-8 text-center text-[var(--muted)]">
                참여자가 없습니다. 참여자를 추가해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="group relative flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4"
                  >
                    <ParticipantAvatar participant={participant} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[var(--foreground)]">
                        {participant.name}
                      </div>
                      {participant.phone && (
                        <div className="truncate text-xs text-[var(--muted-2)]">
                          {participant.phone}
                        </div>
                      )}
                    </div>
                    {tripId && !isParticipantMode && (
                      <div className="shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRemoveParticipant(participant.id, participant.name)
                          }
                          className="h-10 w-10 p-0 text-[var(--danger)] hover:bg-[var(--surface-danger)] hover:text-[var(--danger-ink)]"
                          aria-label={`${participant.name} 제거`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 기존 참가자 추가 (여행이 선택된 경우) */}
        {tripId && !isParticipantMode && availableParticipants.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>기존 참가자 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {availableParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="relative flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--surface-muted)] p-4"
                  >
                    <ParticipantAvatar participant={participant} size="lg" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold text-[var(--foreground)]">
                        {participant.name}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddExistingParticipant(participant.id)}
                      className="shrink-0 gap-1.5"
                    >
                      <Plus className="h-3 w-3" />
                      추가
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 참가자 추가 모달 */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setFormData({ name: "", phone: "" });
          }}
          title="참가자 추가"
        >
          <div className="space-y-4">
            <Input
              label="이름"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="참여자 이름을 입력하세요"
              required
            />
            <Input
              label="전화번호 (선택)"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder="010-1234-5678"
              type="tel"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: "", phone: "" });
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleAddParticipant}
                className="flex-1"
                disabled={!formData.name.trim()}
              >
                추가하기
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

export default function ParticipantsPage() {
  return (
    <Suspense fallback={
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    }>
      <ParticipantsContent />
    </Suspense>
  );
}
