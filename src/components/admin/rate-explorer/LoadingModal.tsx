"use client";

import { AdminLoadingModal } from "@/components/shared/AdminLoadingModal";

const RATE_EXPLORER_MESSAGES = [
  "Fetching data...",
  "Calculating rates...",
  "Scoring offers...",
  "Aggregating providers...",
  "Almost there...",
];

interface LoadingModalProps {
  isLoading: boolean;
}

export function LoadingModal({ isLoading }: LoadingModalProps) {
  return (
    <AdminLoadingModal
      isLoading={isLoading}
      messages={RATE_EXPLORER_MESSAGES}
    />
  );
}
