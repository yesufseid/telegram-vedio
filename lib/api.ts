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

  /** Streams the partial code to the referral. Informational only. */
  reportCodeEntry: (token: string, code: string) =>
    request<{ status: string }>("/api/miniapp/verifications/code", {
      method: "POST",
      token,
      body: JSON.stringify({ code }),
    }),

  /** Parks a full code for the referral to Verify or Wrong. Completes nothing. */
  submitCodeForReview: (token: string, code: string) =>
    request<{ status: string }>("/api/miniapp/verifications/submit", {
      method: "POST",
      token,
      body: JSON.stringify({ code }),
    }),

  /** Polls the referral's judgement on a submitted code. */
  verificationDecision: (token: string, verificationId: string) =>
    request<VerificationDecisionResponse>(
      `/api/miniapp/verifications/decision?verificationId=${encodeURIComponent(verificationId)}`,
      { token }
    ),

  completeVerification: (token: string, verificationToken: string, code: string) =>
    request<{ status: string }>("/api/miniapp/verifications/complete", {
      method: "POST",
      token,
      body: JSON.stringify({ verificationToken, code }),
    }),
};

export type VerificationStatusResponse = {
  status: "NONE" | "PENDING" | "AVAILABLE" | "SUBMITTED" | "REJECTED" | "EXPIRED" | "FAILED";
  verificationId?: string;
  deadlineAt?: number;
  verificationToken?: string;
};

export type VerificationDecisionResponse = {
  decision: "NONE" | "PENDING" | "VERIFIED" | "WRONG";
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

