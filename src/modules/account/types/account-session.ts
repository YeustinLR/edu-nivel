export type AccountSession = {
  id: string;
  token: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
};

export type AccountSessionAccess =
  | { status: "ready"; sessions: AccountSession[] }
  | { status: "reauth-required"; sessions: [] };
