import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";

export type OtpRateLimitRequestState = {
  isSignUp: boolean;
  initialOtpSent: boolean;
};

export const otpRateLimitRequestContext =
  new AsyncLocalStorage<OtpRateLimitRequestState>();
