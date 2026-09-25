import { describe, expect, it } from "vitest";

import { ACCOUNT_FEEDBACK_DURATION_MS } from "@/modules/account/hooks/use-auto-dismiss-feedback";

describe("useAutoDismissFeedback", () => {
  it("mantiene los avisos transitorios durante tres segundos", () => {
    expect(ACCOUNT_FEEDBACK_DURATION_MS).toBe(3_000);
  });
});

