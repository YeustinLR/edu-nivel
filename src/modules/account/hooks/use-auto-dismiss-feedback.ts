"use client";

import { useEffect, type Dispatch, type SetStateAction } from "react";

import type { AccountFeedbackState } from "@/modules/account/components/AccountFeedback";

export const ACCOUNT_FEEDBACK_DURATION_MS = 3_000;

export function useAutoDismissFeedback(
  feedback: AccountFeedbackState,
  setFeedback: Dispatch<SetStateAction<AccountFeedbackState>>,
) {
  useEffect(() => {
    if (feedback.status !== "success" && feedback.status !== "error") return;

    const timeout = window.setTimeout(() => {
      setFeedback({ status: "idle" });
    }, ACCOUNT_FEEDBACK_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, [feedback, setFeedback]);
}

