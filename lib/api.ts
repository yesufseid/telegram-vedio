export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

export function wsUrl() {
  const base = BACKEND_URL.replace(/^http/, "ws");
  return `${base.replace(/\/$/, "")}`;
}

async function request<T>(path: string, options: RequestInit & { token?: string } = {}): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${BACKEND_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body?.message || `Request failed with ${res.status}`);
    (error as Error & { code?: string }).code = body?.error;
    throw error;
  }

  return body as T;
}

export const api = {
  auth: (initData: string) =>
    request<SessionResponse>("/api/miniapp/auth", {
      method: "POST",
      body: JSON.stringify({ initData }),
    }),

  ready: (token: string) =>
    request<{ verificationId: string; referralOnline: boolean }>("/api/miniapp/ready", {
      method: "POST",
      token,
    }),

  listVerifications: (token: string) =>
    request<{ verifications: VerificationItem[] }>("/api/miniapp/verifications", { token }),

  startVerification: (token: string, id: string) =>
    request<StartVerificationResponse>(`/api/miniapp/verifications/${id}/start`, {
      method: "POST",
      token,
    }),

  completeVerification: (token: string, verificationToken: string, code: string) =>
    request<{ status: string; referredUserNotified: boolean }>(
      "/api/miniapp/verifications/complete",
      {
        method: "POST",
        token,
        body: JSON.stringify({ verificationToken, code }),
      }
    ),
};

export type MiniAppUser = {
  id: string;
  username: string | null;
  role: string;
  referral: string;
  awaitingVerification: boolean;
};

export type SessionResponse = {
  sessionToken: string;
  user: MiniAppUser;
};

export type VerificationItem = {
  id: string;
  status: "PENDING" | "PREPARING" | "AVAILABLE" | "FAILED" | "COMPLETED";
  createdAt: string;
  updatedAt: string;
  referredUser: { id: string; username: string | null; displayName: string };
};

export type StartVerificationResponse = {
  status: "AVAILABLE" | "RETRY_REQUESTED";
  verificationId: string;
  referredUser?: { id: string; username: string | null; displayName: string };
  verificationToken?: string;
};