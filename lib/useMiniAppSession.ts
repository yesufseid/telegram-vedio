"use client";

import { useEffect, useState } from "react";
import { api, BACKEND_URL, MiniAppUser } from "@/lib/api";
import { getInitData, loadTelegramSdk, prepareWebApp } from "@/lib/telegram";
import { getSession, saveSession, clearSession } from "@/lib/storage";

type State =
  | { status: "loading" }
  | { status: "ready"; token: string; user: MiniAppUser }
  | { status: "outside_telegram" }
  | { status: "not_registered" }
  | { status: "error"; message: string };

async function loadMe(token: string): Promise<MiniAppUser> {
  const res = await fetch(`${BACKEND_URL}/api/miniapp/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  const body = await res.json();
  return body.user as MiniAppUser;
}

/**
 * Identifies the visitor from the signed Telegram Mini App init data and keeps a
 * backend session token. Identity is never taken from client supplied ids.
 */
export function useMiniAppSession() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      prepareWebApp();
      await loadTelegramSdk();
      if (cancelled) return;

      const initData = getInitData();
      if (!initData) {
        setState({ status: "outside_telegram" });
        return;
      }

      try {
        const cached = getSession();
        if (cached) {
          const user = await loadMe(cached);
          if (!cancelled) setState({ status: "ready", token: cached, user });
          return;
        }

        const session = await api.auth(initData);
        saveSession(session.sessionToken);
        if (!cancelled) setState({ status: "ready", token: session.sessionToken, user: session.user });
      } catch (err) {
        const error = err as Error & { code?: string };
        clearSession();
        if (cancelled) return;

        if (error.code === "NOT_REGISTERED") {
          setState({ status: "not_registered" });
          return;
        }
        setState({ status: "error", message: error.message });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}