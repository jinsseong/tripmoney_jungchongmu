"use client";

import React, { useState } from "react";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Share2, Copy, Check } from "lucide-react";

interface CreateSharedDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (
    password?: string
  ) => Promise<{ shareUrl: string; shareKey: string }>;
  tripName?: string;
}

export const CreateSharedDashboardModal: React.FC<
  CreateSharedDashboardModalProps
> = ({ isOpen, onClose, onCreate, tripName }) => {
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    setIsLoading(true);
    try {
      const result = await onCreate(password || undefined);
      setShareUrl(result.shareUrl);
    } catch (error) {
      console.error("Error creating dashboard:", error);
      alert("정산 대시보드 생성에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setPassword("");
    setShareUrl(null);
    setCopied(false);
    onClose();
  };

  if (shareUrl) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="정산 대시보드 링크 생성 완료">
        <div className="space-y-4">
          <div className="rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-4">
            <p className="mb-2 text-sm font-bold text-[#1b64da]">정산 대시보드 링크</p>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="min-h-[48px] flex-1 rounded-lg border border-[#d1d6db] bg-white px-3.5 py-2 text-sm text-[#4e5968]"
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleCopy}
                className="gap-2 sm:w-auto"
                aria-label="복사"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
                {copied ? "복사됨" : "복사"}
              </Button>
            </div>
          </div>
          <p className="text-sm leading-6 text-[#6b7684]">
            이 링크를 공유하면 다른 사람들이 정산 결과를 확인할 수 있습니다.
          </p>
          <Button variant="primary" onClick={handleClose} className="w-full">
            완료
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="정산 대시보드 만들기"
      size="md"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-[#c9e2ff] bg-[#e8f3ff] p-4">
          <p className="text-sm leading-6 text-[#4e5968]">
            현재 여행의 모든 지출 내역과 정산 정보가 대시보드에 포함됩니다.
          </p>
          {tripName && (
            <p className="mt-2 text-sm font-bold text-[#1b64da]">
              {tripName}
            </p>
          )}
        </div>
        <Input
          label="비밀번호 (선택)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="공유받을 사람에게 알려줄 비밀번호"
          helperText="비밀번호를 설정하면 링크와 비밀번호가 모두 필요합니다"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isLoading}
          >
            취소
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            className="flex-1 gap-1.5"
            isLoading={isLoading}
          >
            <Share2 className="h-4 w-4" />
            생성하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};
