"use client";

export const dynamic = "force-dynamic";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check, ReceiptText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ParticipantSelector } from "@/components/ParticipantSelector";
import { Card } from "@/components/ui/Card";
import { supabase } from "@/lib/supabase";
import { Category, Participant, Trip } from "@/lib/types";
import { getParticipantIdForTrip, getTripAccessSession } from "@/lib/trip-access";
import { formatCurrency } from "@/lib/utils";
import { useExpenseReports } from "@/hooks/useExpenseReports";

declare global {
  interface Window {
    TextDetector?: new () => {
      detect: (
        image:
          | ImageBitmap
          | HTMLImageElement
          | HTMLVideoElement
          | HTMLCanvasElement
      ) => Promise<Array<{ rawValue?: string }>>;
    };
  }
}

const RECEIPT_BUCKET = "expense-receipts";
const MAX_RECEIPT_SIZE = 8 * 1024 * 1024;

function createReceiptPath(inviteKey: string, file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const uniqueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${inviteKey}/${uniqueId}.${extension}`;
}

function parseReceiptText(text: string) {
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const amountCandidates = text
    .match(/\d[\d,]{2,}/g)
    ?.map((value) => Number(value.replace(/,/g, "")))
    .filter((value) => Number.isFinite(value) && value > 0) || [];

  const amount = amountCandidates.length > 0 ? Math.max(...amountCandidates) : 0;
  const itemName =
    lines.find((line) => !/\d[\d,]{2,}/.test(line) && line.length <= 30) ||
    lines[0] ||
    "";

  return {
    amount,
    itemName,
  };
}

export default function ReportExpensePage() {
  const router = useRouter();
  const params = useParams<{ inviteKey: string }>();
  const inviteKey = params.inviteKey;
  const [trip, setTrip] = useState<Trip | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [reporterId, setReporterId] = useState("");
  const [lockedReporterId, setLockedReporterId] = useState("");
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [ocrText, setOcrText] = useState("");
  const [itemName, setItemName] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentType, setPaymentType] = useState<"cash" | "card">("card");
  const [loading, setLoading] = useState(true);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { addReport } = useExpenseReports(trip?.id, false);

  const totalAmount = Number(amount.replace(/,/g, "") || "0");
  const perPersonAmount =
    selectedParticipantIds.length > 0
      ? Math.floor(totalAmount / selectedParticipantIds.length)
      : 0;
  const receiptPreviewUrl = useMemo(() => {
    if (!receiptFile) return "";
    return URL.createObjectURL(receiptFile);
  }, [receiptFile]);

  useEffect(() => {
    return () => {
      if (receiptPreviewUrl) {
        URL.revokeObjectURL(receiptPreviewUrl);
      }
    };
  }, [receiptPreviewUrl]);

  useEffect(() => {
    const fetchInviteContext = async () => {
      try {
        setLoading(true);
        setFormError("");

        const { data: tripData, error: tripError } = await supabase
          .from("trips")
          .select("*")
          .eq("invite_key", inviteKey)
          .single();

        if (tripError) throw tripError;
        const currentTrip = tripData as Trip;
        setTrip(currentTrip);

        const [{ data: tripParticipants }, { data: categoryData }] =
          await Promise.all([
            supabase
              .from("trip_participants")
              .select("participant_id")
              .eq("trip_id", currentTrip.id),
            supabase
              .from("categories")
              .select("*")
              .order("is_default", { ascending: false })
              .order("name", { ascending: true }),
          ]);

        const participantIds =
          tripParticipants?.map((item: any) => item.participant_id) || [];

        if (participantIds.length > 0) {
          const { data: participantData, error: participantError } =
            await supabase
              .from("participants")
              .select("*")
              .in("id", participantIds)
              .order("created_at", { ascending: true });

          if (participantError) throw participantError;
          const tripParticipantData = (participantData || []) as Participant[];
          setParticipants(tripParticipantData);
          setSelectedParticipantIds(tripParticipantData.map((participant) => participant.id));

          try {
            const accessSession = getTripAccessSession(currentTrip.id);
            const storedParticipantId = getParticipantIdForTrip(currentTrip.id);
            if (
              storedParticipantId &&
              tripParticipantData.some((participant) => participant.id === storedParticipantId)
            ) {
              setReporterId(storedParticipantId);
              if (accessSession?.mode === "participant") {
                setLockedReporterId(storedParticipantId);
              }
            }
          } catch {
            // localStorage를 사용할 수 없으면 제보자 선택 UI로 대체합니다.
          }
        }

        const loadedCategories = (categoryData || []) as Category[];
        setCategories(loadedCategories);
        setCategoryId(
          loadedCategories.find((category) => category.name === "기타")?.id ||
            loadedCategories[0]?.id ||
            ""
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "초대 정보를 불러오지 못했습니다.";
        setFormError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchInviteContext();
  }, [inviteKey]);

  const runTextDetection = async (file: File) => {
    if (!window.TextDetector || !window.createImageBitmap) {
      return "";
    }

    const image = await createImageBitmap(file);
    try {
      const detector = new window.TextDetector();
      const detectedTexts = await detector.detect(image);
      return detectedTexts
        .map((detectedText) => detectedText.rawValue || "")
        .filter(Boolean)
        .join("\n");
    } finally {
      image.close();
    }
  };

  const handleReceiptChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    setFormError("");

    if (!file) {
      setReceiptFile(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("영수증은 이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE) {
      setFormError("영수증 이미지는 8MB 이하로 업로드해주세요.");
      event.target.value = "";
      return;
    }

    setReceiptFile(file);
    setOcrLoading(true);
    try {
      const detectedText = await runTextDetection(file);
      if (detectedText) {
        setOcrText(detectedText);
        const parsed = parseReceiptText(detectedText);
        if (parsed.itemName && !itemName) {
          setItemName(parsed.itemName);
        }
        if (parsed.amount > 0 && !amount) {
          setAmount(String(parsed.amount));
        }
      } else {
        setOcrText("");
      }
    } catch (error) {
      console.warn("Receipt text detection failed:", error);
      setOcrText("");
    } finally {
      setOcrLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError("");

    if (!trip) {
      setFormError("여행 정보를 찾을 수 없습니다.");
      return;
    }
    if (!reporterId) {
      setFormError("제보자를 선택해주세요.");
      return;
    }
    if (lockedReporterId && reporterId !== lockedReporterId) {
      setFormError("참가자 모드에서는 본인 이름으로만 지출을 제보할 수 있습니다.");
      return;
    }
    if (!itemName.trim()) {
      setFormError("품목을 입력해주세요.");
      return;
    }
    if (totalAmount <= 0) {
      setFormError("전체 비용을 1원 이상 입력해주세요.");
      return;
    }
    if (selectedParticipantIds.length === 0) {
      setFormError("정산 참여자를 한 명 이상 선택해주세요.");
      return;
    }

    let receiptPath = "";
    try {
      setSubmitting(true);
      let receiptImageUrl: string | undefined;

      if (receiptFile) {
        receiptPath = createReceiptPath(inviteKey, receiptFile);
        const { error: uploadError } = await supabase.storage
          .from(RECEIPT_BUCKET)
          .upload(receiptPath, receiptFile, {
            cacheControl: "31536000",
            contentType: receiptFile.type,
            upsert: false,
          });

        if (uploadError) {
          throw new Error("영수증 업로드에 실패했습니다. Supabase Storage 설정을 확인해주세요.");
        }

        const { data: publicUrlData } = supabase.storage
          .from(RECEIPT_BUCKET)
          .getPublicUrl(receiptPath);
        receiptImageUrl = publicUrlData.publicUrl;
      }

      await addReport({
        trip_id: trip.id,
        reporter_id: reporterId,
        payer_id: reporterId,
        item_name: itemName.trim(),
        amount: totalAmount,
        category_id: categoryId || undefined,
        payment_type: paymentType,
        currency: "KRW",
        date,
        receipt_image_url: receiptImageUrl,
        ocr_text: ocrText || undefined,
        participant_ids: selectedParticipantIds,
      });

      setIsSubmitted(true);
    } catch (error) {
      if (receiptPath) {
        await supabase.storage.from(RECEIPT_BUCKET).remove([receiptPath]);
      }

      const message =
        error instanceof Error ? error.message : "지출 제보 등록에 실패했습니다.";
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="app-screen safe-area">
        <div className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4 text-[#6b7684]">
          지출 제보 화면을 준비하는 중...
        </div>
      </main>
    );
  }

  if (isSubmitted && trip) {
    return (
      <main className="app-screen safe-area">
        <div className="page-container flex min-h-screen max-w-md flex-col justify-center">
          <Card className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-[#ebfff6] text-[#00a86b]">
              <Check className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-extrabold text-[#171719]">제보 완료</h1>
            <p className="mt-2 text-sm leading-6 text-[#6b7684]">
              총무가 확인 후 정산에 반영합니다.
            </p>
            <Button
              type="button"
              variant="primary"
              className="mt-6 w-full"
              onClick={() =>
                router.push(
                  `/dashboard?trip=${trip.id}${lockedReporterId ? "&mode=participant" : ""}`
                )
              }
            >
              대시보드로 이동
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  if (!trip) {
    return (
      <main className="app-screen safe-area">
        <div className="page-container flex min-h-screen max-w-md flex-col justify-center">
          <Card>
            <div className="mb-5">
              <div className="page-kicker mb-2 flex items-center gap-2 text-[#3182f6]">
                <ReceiptText className="h-4 w-4" />
                지출 제보
              </div>
              <h1 className="text-2xl font-extrabold leading-tight text-[#171719]">
                초대 링크를 확인해주세요
              </h1>
              <p className="mt-2 text-sm leading-6 text-[#6b7684]">
                여행 정보를 불러온 뒤 지출을 제보할 수 있습니다.
              </p>
            </div>
            <div className="rounded-lg border border-[#ffd0d5] bg-[#fff0f1] p-3 text-sm font-bold leading-6 text-[#d93d4a]">
              {formError || "초대 정보를 불러오지 못했습니다."}
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-4 w-full gap-1.5"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4" />
              뒤로
            </Button>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="app-screen safe-area">
      <div className="page-container max-w-md">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          뒤로
        </Button>

        <Card>
          <div className="mb-5">
            <div className="page-kicker mb-2 flex items-center gap-2 text-[#3182f6]">
              <ReceiptText className="h-4 w-4" />
              지출 제보
            </div>
            <h1 className="text-2xl font-extrabold leading-tight text-[#171719]">
              {trip?.name || "여행"} 지출 올리기
            </h1>
            <p className="mt-2 text-sm leading-6 text-[#6b7684]">
              영수증을 올리고 금액과 참여자를 확인하면 총무에게 제보됩니다.
            </p>
          </div>

          {formError && (
            <div className="mb-4 rounded-lg border border-[#ffd0d5] bg-[#fff0f1] p-3 text-sm font-bold leading-6 text-[#d93d4a]">
              {formError}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#b0b8c1] bg-[#f6f8fb] p-4 text-center hover:bg-[#eef2f6]">
              {receiptPreviewUrl ? (
                <img
                  src={receiptPreviewUrl}
                  alt="영수증 미리보기"
                  className="max-h-56 max-w-full rounded-lg object-contain"
                />
              ) : (
                <>
                  <Camera className="mb-3 h-8 w-8 text-[#8b95a1]" />
                  <span className="text-sm font-bold text-[#4e5968]">
                    영수증 촬영 또는 이미지 선택
                  </span>
                  <span className="mt-1 text-xs text-[#8b95a1]">
                    JPG, PNG, WEBP, GIF · 최대 8MB
                  </span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleReceiptChange}
              />
            </label>

            {ocrLoading && (
              <div className="flex items-center gap-2 rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-3 text-sm font-bold text-[#1b64da]">
                <Sparkles className="h-4 w-4" />
                영수증 텍스트를 확인하는 중...
              </div>
            )}

            {!ocrLoading && receiptFile && !ocrText && (
              <div className="rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-3 text-sm leading-6 text-[#6b7684]">
                이 브라우저에서는 자동 텍스트 인식이 제한될 수 있습니다. 아래 내용을 직접 확인해 입력해주세요.
              </div>
            )}

            {participants.length > 0 && lockedReporterId ? (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
                  제보자
                </label>
                <div className="min-h-[48px] rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] px-3.5 py-3 text-base font-bold text-[#171719]">
                  {participants.find((participant) => participant.id === lockedReporterId)?.name ||
                    "내 프로필"}
                </div>
              </div>
            ) : participants.length > 0 ? (
              <div>
                <label className="mb-1.5 block text-sm font-bold text-[#4e5968]">
                  제보자
                </label>
                <select
                  value={reporterId}
                  onChange={(event) => setReporterId(event.target.value)}
                  className="min-h-[48px] w-full rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
                  required
                >
                  <option value="">선택하세요</option>
                  {participants.map((participant) => (
                    <option key={participant.id} value={participant.id}>
                      {participant.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <Input
              label="품목"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
              placeholder="예: 점심 식사"
              required
            />

            <Input
              label="전체 비용"
              value={amount}
              onChange={(event) =>
                setAmount(event.target.value.replace(/[^0-9]/g, ""))
              }
              placeholder="0"
              inputMode="numeric"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <select
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className="min-h-[48px] min-w-0 rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
              <select
                value={paymentType}
                onChange={(event) =>
                  setPaymentType(event.target.value as "cash" | "card")
                }
                className="min-h-[48px] min-w-0 rounded-lg border border-[#d1d6db] bg-white px-3.5 text-base text-[#171719] focus:border-[#3182f6] focus:outline-none focus:ring-3 focus:ring-[#3182f6]/15"
              >
                <option value="card">카드</option>
                <option value="cash">현금</option>
              </select>
            </div>

            <Input
              label="날짜"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
            />

            <ParticipantSelector
              participants={participants}
              selectedIds={selectedParticipantIds}
              onToggle={(participantId) => {
                setSelectedParticipantIds((prev) =>
                  prev.includes(participantId)
                    ? prev.filter((id) => id !== participantId)
                    : [...prev, participantId]
                );
              }}
              label="n분의 1 정산 참여자"
            />

            {totalAmount > 0 && selectedParticipantIds.length > 0 && (
              <div className="rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-3">
                <div className="text-sm font-bold text-[#1b64da]">예상 1인 부담액</div>
                <div className="mt-1 text-xl font-extrabold text-[#1b64da]">
                  {formatCurrency(perPersonAmount)} / {selectedParticipantIds.length}명
                </div>
              </div>
            )}

            {ocrText && (
              <details className="rounded-lg border border-[#e5e8eb] bg-[#f6f8fb] p-3 text-sm text-[#6b7684]">
                <summary className="cursor-pointer font-bold text-[#4e5968]">
                  인식된 텍스트 보기
                </summary>
                <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-5">
                  {ocrText}
                </pre>
              </details>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={submitting}
              disabled={!reporterId || !itemName.trim() || totalAmount <= 0}
            >
              총무에게 제보하기
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
