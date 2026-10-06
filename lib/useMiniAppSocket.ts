"use client";

import { useEffect, useRef } from "react";
import { wsUrl } from "@/lib/api";

export type SocketEvent = {
  type: string;
  data?: {
    message?: string;
    verificationId?: string;
    referredUser?: { id: string; username: string | null; displayName: string };
  };
};

type Handler = (event: SocketEvent) => void;

/**
 * Authenticated Mini App socket. Identifies with the backend session token and
 * reconnects automatically. Never throws when the server is unavailable.
 */
export function useMiniAppSocket(token: string | null, onEvent: Handler) {
  const socketRef = useRef<WebSocket | null>(null);
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!token) return;

    let closed = false;
    let retry: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;

      const socket = new WebSocket(`${wsUrl()}/?token=${encodeURIComponent(token)}`);
      socketRef.current = socket;

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "IDENTIFY", token }));
      };

      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data) as SocketEvent);
        } catch {
          console.warn("[miniapp] invalid socket payload", event.data);
        }
      };

      socket.onerror = () => console.warn("[miniapp] socket error");

      socket.onclose = () => {
        if (closed) return;
        retry = setTimeout(connect, 2000);
      };
    };

    connect();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [token]);
}