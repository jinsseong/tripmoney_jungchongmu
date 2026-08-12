"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useState } from "react";
import { useTrips } from "@/hooks/useTrips";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Plus, Calendar, ArrowRight, Trash2, WalletCards, Link2, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  extractInviteKeyFromInput,
  hasParticipantAccess,
  rememberAdminTrip,
} from "@/lib/trip-access";

type HomeMode = "admin" | "participant";

export default function HomePage() {
  const router = useRouter();
  const { trips, loading, addTrip, deleteTrip } = useTrips();
  const [activeMode, setActiveMode] = useState<HomeMode>("admin");
  const [showAddModal, setShowAddModal] = useState(false);
  const [inviteInput, setInviteInput] = useState("");
  const [participantTripIds, setParticipantTripIds] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    description: "",
  });

  useEffect(() => {
    setParticipantTripIds(
      trips
        .filter((trip) => hasParticipantAccess(trip.id))
        .map((trip) => trip.id)
    );
  }, [trips]);

  const participantTrips = trips.filter((trip) =>
    participantTripIds.includes(trip.id)
  );

  const handleAddTrip = async () => {
    if (!formData.name.trim() || !formData.startDate || !formData.endDate) {
      return;
    }

    try {
      const newTrip = await addTrip(
        formData.name.trim(),
        formData.startDate,
        formData.endDate,
        formData.description || undefined
      );
      setFormData({
        name: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        description: "",
      });
      setShowAddModal(false);
      // 여행 추가 후 대시보드로 이동
      if (newTrip && newTrip.id) {
        rememberAdminTrip(newTrip);
        router.push(`/dashboard?trip=${newTrip.id}&mode=admin`);
      }
    } catch (error) {
      console.error("Failed to add trip:", error);
      alert("여행 추가에 실패했습니다.");
    }
  };

  const handleSelectTrip = (tripId: string) => {
    router.push(`/dashboard?trip=${tripId}&mode=admin`);
  };

  const handleSelectParticipantTrip = (tripId: string) => {
    router.push(`/dashboard?trip=${tripId}&mode=participant`);
  };

  const handleOpenInvite = () => {
    const inviteKey = extractInviteKeyFromInput(inviteInput);
    if (!inviteKey) {
      alert("초대 링크 또는 초대 코드를 입력해주세요.");
      return;
    }
    router.push(`/join/${inviteKey}`);
  };

  const handleDeleteTrip = async (e: React.MouseEvent, tripId: string, tripName: string) => {
    e.stopPropagation();
    if (!confirm(`${tripName} 여행을 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 모든 지출 내역과 정산 데이터가 삭제됩니다.`)) {
      return;
    }

    try {
      await deleteTrip(tripId);
    } catch (error) {
      console.error("Failed to delete trip:", error);
      alert("여행 삭제에 실패했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="app-screen flex items-center justify-center">
        <div className="text-[var(--muted)]">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="app-screen safe-area">
      <div className="page-container">
        <div className="mb-6 flex flex-col gap-5 sm:mb-8">
          <div className="top-bar">
            <div className="flex min-w-0 items-center gap-3">
              <div className="brand-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-white">
                <WalletCards className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="page-kicker">여행 정산</div>
                <h1 className="truncate text-xl font-extrabold text-[var(--foreground)] sm:text-2xl">
                  정총무
                </h1>
              </div>
            </div>
            {activeMode === "admin" && trips.length > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowAddModal(true)}
                className="shrink-0 gap-1.5"
              >
                <Plus className="h-4 w-4" />
                새 여행
              </Button>
            )}
          </div>
          <div className="home-intro">
            <h2 className="page-title mb-2">
              여행별 정산을<br className="sm:hidden" /> 바로 시작하세요
            </h2>
            <p className="page-subtitle">
              지출별 참석 인원을 다르게 골라도 정산 금액을 자동으로 맞춰줍니다.
            </p>
          </div>
        </div>

        <div className="segment-control mb-5" data-count={2}>
          <button
            type="button"
            onClick={() => setActiveMode("admin")}
            className="segment-item"
            data-active={activeMode === "admin"}
          >
            <ShieldCheck className="h-4 w-4" />
            관리자
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("participant")}
            className="segment-item"
            data-active={activeMode === "participant"}
          >
            <UserRound className="h-4 w-4" />
            참가자
          </button>
        </div>

        {/* 여행 목록 */}
        {activeMode === "participant" ? (
          <>
            <Card className="mb-5">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-[var(--primary)]" />
                  <CardTitle>초대 링크로 참여</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={inviteInput}
                    onChange={(event) => setInviteInput(event.target.value)}
                    placeholder="초대 링크 또는 초대 코드"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        handleOpenInvite();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleOpenInvite}
                    className="shrink-0 gap-1.5"
                  >
                    참여하기
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {participantTrips.length === 0 ? (
              <Card className="border-dashed">
                <div className="py-12 text-center sm:py-16">
                  <UserRound className="mx-auto mb-4 h-14 w-14 text-[var(--muted-2)]" />
                  <p className="text-[var(--muted)]">
                    아직 이 기기에서 참여한 여행이 없습니다.
                  </p>
                </div>
              </Card>
            ) : (
              <div className="mb-6 space-y-3">
                {participantTrips.map((trip) => (
                  <Card
                    key={trip.id}
                    className="tap-card cursor-pointer p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                    onClick={() => handleSelectParticipantTrip(trip.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleSelectParticipantTrip(trip.id);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${trip.name} 참가자 대시보드 열기`}
                  >
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            <span className="status-pill">참가 중</span>
                          </div>
                          <h3 className="mb-2 break-words text-xl font-extrabold text-[var(--foreground)]">
                            {trip.name}
                          </h3>
                          <div className="flex items-start gap-2 text-sm text-[var(--muted)]">
                            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                            <span className="break-words">
                              {format(new Date(trip.start_date), "yyyy년 M월 d일", {
                                locale: ko,
                              })}{" "}
                              ~{" "}
                              {format(new Date(trip.end_date), "yyyy년 M월 d일", {
                                locale: ko,
                              })}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-[var(--muted-2)] sm:mt-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        ) : trips.length === 0 ? (
          <Card className="border-dashed">
            <div className="py-12 text-center sm:py-16">
              <Calendar className="mx-auto mb-4 h-14 w-14 text-[var(--muted-2)]" />
              <p className="mb-5 text-[var(--muted)]">등록된 여행이 없습니다.</p>
              <Button variant="primary" onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                첫 여행 추가하기
              </Button>
            </div>
          </Card>
        ) : (
          <div className="mb-6 space-y-3">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="tap-card group cursor-pointer p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
                onClick={() => handleSelectTrip(trip.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleSelectTrip(trip.id);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`${trip.name} 대시보드 열기`}
              >
                <CardContent className="p-4 sm:p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <h3 className="mb-2 break-words text-xl font-extrabold text-[var(--foreground)]">
                            {trip.name}
                          </h3>
                      <div className="space-y-1 text-sm text-[var(--muted)]">
                        <div className="flex items-start gap-2">
                          <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted-2)]" />
                          <span className="break-words">
                            {format(new Date(trip.start_date), "yyyy년 M월 d일", {
                              locale: ko,
                            })}{" "}
                            ~{" "}
                            {format(new Date(trip.end_date), "yyyy년 M월 d일", {
                              locale: ko,
                            })}
                          </span>
                        </div>
                        {trip.description && (
                          <p className="line-clamp-2 text-[var(--muted-2)]">{trip.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${trip.name} 삭제`}
                        onClick={(e) => handleDeleteTrip(e, trip.id, trip.name)}
                        className="hidden h-9 w-9 p-0 text-[var(--danger)] opacity-0 transition-opacity hover:bg-[var(--surface-danger)] sm:inline-flex sm:group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <ArrowRight className="mt-2 h-5 w-5 shrink-0 text-[var(--muted-2)] sm:mt-1" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* 여행 추가 모달 */}
        <Modal
          isOpen={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            setFormData({
              name: "",
              startDate: new Date().toISOString().split("T")[0],
              endDate: new Date().toISOString().split("T")[0],
              description: "",
            });
          }}
          title="여행 추가"
        >
          <div className="space-y-4">
            <Input
              label="여행 이름"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="예: 제주도 여행"
              required
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[var(--muted-strong)]">
                  시작일
                </label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="min-h-[48px] w-full rounded-lg border border-[var(--line-strong)] px-3.5 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/15"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[var(--muted-strong)]">
                  종료일
                </label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  min={formData.startDate}
                  className="min-h-[48px] w-full rounded-lg border border-[var(--line-strong)] px-3.5 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/15"
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold text-[var(--muted-strong)]">
                설명 (선택)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="여행에 대한 간단한 설명을 입력하세요"
                className="min-h-24 w-full rounded-lg border border-[var(--line-strong)] px-3.5 py-2.5 text-base focus:border-[var(--primary)] focus:outline-none focus:ring-3 focus:ring-[var(--primary)]/15"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({
                    name: "",
                    startDate: new Date().toISOString().split("T")[0],
                    endDate: new Date().toISOString().split("T")[0],
                    description: "",
                  });
                }}
                className="flex-1"
              >
                취소
              </Button>
              <Button
                variant="primary"
                onClick={handleAddTrip}
                className="flex-1"
                disabled={
                  !formData.name.trim() ||
                  !formData.startDate ||
                  !formData.endDate
                }
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
