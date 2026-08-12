"use client";

import React, { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}) => {
  const sizes = {
    sm: "sm:max-w-md",
    md: "sm:max-w-lg",
    lg: "sm:max-w-2xl",
    xl: "sm:max-w-4xl",
    full: "sm:max-w-full",
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-[var(--foreground)]/35 backdrop-blur-[2px]" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-end justify-center p-0 text-center sm:items-center sm:p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel
                className={cn(
                  "w-full transform overflow-hidden rounded-t-2xl bg-[var(--surface)] text-left align-middle shadow-xl transition-all sm:rounded-2xl",
                  "border border-[var(--line)] max-h-[92dvh] sm:max-h-[88dvh] sm:rounded-lg",
                  sizes[size]
                )}
              >
                {(title || showCloseButton) && (
                  <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface)] px-4 py-3 sm:px-6 sm:py-4">
                    {title && (
                      <Dialog.Title
                        as="h3"
                        className="min-w-0 pr-3 text-base font-bold leading-6 text-[var(--foreground)] sm:text-lg"
                      >
                        {title}
                      </Dialog.Title>
                    )}
                    {showCloseButton && (
                      <button
                        onClick={onClose}
                        className="min-h-[44px] min-w-[44px] rounded-lg p-2 text-[var(--muted-strong)] transition-colors hover:bg-[var(--line)]"
                        aria-label="닫기"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="max-h-[calc(92dvh-68px)] overflow-y-auto px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:max-h-[calc(88dvh-76px)] sm:px-6 sm:py-5">
                  {children}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
