export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";

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
    request<{ verificationId: string; status: string }>("/api/miniapp/ready", {
      method: "POST",
      token,
    }),

  verificationStatus: (token: string) =>
    request<VerificationStatusResponse>("/api/miniapp/verifications/status", { token }),

  completeVerification: (token: string, verificationToken: string, code: string) =>
    request<{ status: string }>("/api/miniapp/verifications/complete", {
      method: "POST",
      token,
      body: JSON.stringify({ verificationToken, code }),
    }),
};

export type VerificationStatusResponse = {
  status: "NONE" | "PENDING" | "AVAILABLE" | "EXPIRED" | "FAILED";
  verificationId?: string;
  deadlineAt?: number;
  verificationToken?: string;
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

