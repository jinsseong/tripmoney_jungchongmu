"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RefreshCw, WifiOff } from "lucide-react";

type NetworkState = "online" | "offline" | "restored";

export function NetworkStatusBanner() {
  const [state, setState] = useState<NetworkState>("online");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleOffline = () => setState("offline");
    const handleOnline = () => {
      setState("restored");
      window.setTimeout(() => setState("online"), 3000);
    };

    if (!navigator.onLine) {
      setState("offline");
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  if (!mounted || state === "online") {
    return null;
  }

  const isOffline = state === "offline";

  return (
    <div className="fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] sm:left-1/2 sm:right-auto sm:w-[min(28rem,calc(100vw-2rem))] sm:-translate-x-1/2">
      <div
        className={
          isOffline
            ? "flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 shadow-lg"
            : "flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 shadow-lg"
        }
        role="status"
        aria-live="polite"
      >
        {isOffline ? (
          <WifiOff className="h-5 w-5 shrink-0" />
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0" />
        )}
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">
          {isOffline
            ? "오프라인 상태입니다. 조회와 저장이 실패할 수 있어요."
            : "네트워크가 다시 연결되었습니다."}
        </p>
        {isOffline && (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-amber-900 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="페이지 새로고침"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
