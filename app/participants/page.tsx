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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<any>(null);
  const [origin, setOrigin] = useState("");
  const [copiedInviteLink, setCopiedInviteLink] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const inviteUrl =
    currentTrip?.invite_key && origin
      ? `${origin}/join/${currentTrip.invite_key}`
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
    <div className="min-h-screen bg-gray-50 safe-area">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(tripId ? `/dashboard?trip=${tripId}` : "/")}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            뒤로
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {currentTrip ? `${currentTrip.name} - 참가자 관리` : "참가자 관리"}
          </h1>
        </div>

        {tripId && currentTrip && (
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-blue-500" />
                <CardTitle>초대 링크</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {inviteUrl ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                    <p className="text-sm font-medium text-blue-900">
                      참가자는 이 링크에서 닉네임과 프로필 사진을 직접 설정할 수 있습니다.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="min-h-[44px] flex-1 break-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
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
                </div>
              ) : (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm leading-6 text-orange-800">
                  초대 링크를 사용하려면 Supabase 스키마에 trips.invite_key 컬럼을 먼저 적용해야 합니다.
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle>참가자 목록</CardTitle>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                추가
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : participants.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                참여자가 없습니다. 참여자를 추가해주세요.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-lg relative group"
                  >
                    <ParticipantAvatar participant={participant} size="lg" className="mb-2" />
                    <div className="font-semibold text-center mb-1">
                      {participant.name}
                    </div>
                    {participant.phone && (
                      <div className="text-xs text-gray-500 mb-2">
                        {participant.phone}
                      </div>
                    )}
                    {tripId && (
                      <div className="flex gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleRemoveParticipant(participant.id, participant.name)
                          }
                          className="h-8 px-2 text-red-600 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
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
        {tripId && availableParticipants.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>기존 참가자 추가</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {availableParticipants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex flex-col items-center p-4 bg-gray-50 rounded-lg relative group"
                  >
                    <ParticipantAvatar participant={participant} size="lg" className="mb-2" />
                    <div className="font-semibold text-center mb-1">
                      {participant.name}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddExistingParticipant(participant.id)}
                      className="mt-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <ParticipantsContent />
    </Suspense>
  );
}
