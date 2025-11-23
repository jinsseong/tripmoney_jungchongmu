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
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">정산 대시보드 링크:</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              />
              <button
                onClick={handleCopy}
                className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                aria-label="복사"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>
          <p className="text-sm text-gray-600">
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
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            현재 여행의 모든 지출 내역과 정산 정보가 대시보드에 포함됩니다.
          </p>
          {tripName && (
            <p className="text-sm font-semibold text-blue-800 mt-2">
              📍 {tripName}
            </p>
          )}
        </div>
        <Input
          label="비밀번호 (선택)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호를 설정하면 보호됩니다"
          helperText="비밀번호를 설정하지 않으면 누구나 링크로 접근할 수 있습니다"
        />
        <div className="flex gap-2">
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
            className="flex-1"
            isLoading={isLoading}
          >
            <Share2 className="h-4 w-4 mr-1" />
            생성하기
          </Button>
        </div>
      </div>
    </Modal>
  );
};

