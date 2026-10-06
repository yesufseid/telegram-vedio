"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, Loader2, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { api, VerificationItem } from "@/lib/api";
import { useMiniAppSession } from "@/lib/useMiniAppSession";
import { useMiniAppSocket } from "@/lib/useMiniAppSocket";
import {
  clearVerificationToken,
  isOnWaitlist,
  saveVerificationToken,
} from "@/lib/storage";

type Phase =
  | { kind: "idle" }
  | { kind: "preparing"; verificationId: string }
  | { kind: "failed"; verificationId: string }
  | { kind: "retry_requested"; verificationId: string };

export default function ReferralDashboardPage() {
  const router = useRouter();
  const session = useMiniAppSession();
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOnWaitlist()) router.replace("/waitlist");
  }, [router]);

  const load = useCallback(async (token: string) => {
    try {
      const res = await api.listVerifications(token);
      setItems(res.verifications);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    if (session.status === "ready") load(session.token);
  }, [session, load]);

  // Section 8: a referred user opened the Mini App -> show Verify User.
  useMiniAppSocket(session.status === "ready" ? session.token : null, (event) => {
    if (event.type === "USER_READY_FOR_VERIFICATION" && session.status === "ready") {
      load(session.token);
    }
    if (event.type === "VERIFICATION_AVAILABLE" && event.data?.verificationId) {
      setPhase({ kind: "idle" });
      if (session.status === "ready") load(session.token);
    }
    if (event.type === "VERIFICATION_SYSTEM_ERROR" && event.data?.verificationId) {
      setPhase({ kind: "failed", verificationId: event.data.verificationId });
    }
  });

  const handleVerify = async (item: VerificationItem) => {
    if (session.status !== "ready") return;

    setLoading(true);
    setPhase({ kind: "preparing", verificationId: item.id });

    try {
      const res = await api.startVerification(session.token, item.id);

      if (res.status === "RETRY_REQUESTED") {
        setPhase({ kind: "retry_requested", verificationId: item.id });
        return;
      }

      if (res.verificationToken) {
        clearVerificationToken();
        saveVerificationToken(res.verificationToken);
        router.push(`/verify?id=${encodeURIComponent(item.id)}`);
      }
    } catch (err) {
      // Section 12: exactly this message after the one minute availability window.
      console.error("availability failed", err);
      setPhase({ kind: "failed", verificationId: item.id });
    } finally {
      setLoading(false);
    }
  };

  if (session.status === "loading") {
    return <Shell><Loader2 className="w-8 h-8 animate-spin text-blue-400" /></Shell>;
  }

  if (session.status !== "ready") {
    return <Shell><p className="text-slate-400">Open this page from the Telegram Mini App.</p></Shell>;
  }

  const preparing =
    phase.kind === "preparing"
      ? items.find((item) => item.id === phase.verificationId) || items[0]
      : undefined;

  return (
    <Shell>
      <h1 className="text-2xl font-semibold mb-1">Your referred users</h1>
      <p className="text-sm text-slate-400 mb-6">
        Referred by @{session.user.username || session.user.id}
      </p>

      {preparing && (
        <Card className="w-full max-w-md mb-6 bg-slate-800/70 border-slate-700 text-white p-6 space-y-3">
          <div className="flex items-center gap-2 text-blue-300">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Preparing verification...</span>
          </div>
          <p className="text-sm text-slate-400">Please wait.</p>
          {preparing.referredUser && (
            <p className="text-sm text-slate-300">Verifying {preparing.referredUser.displayName}</p>
          )}
        </Card>
      )}

      {phase.kind === "failed" && (
        <Card className="w-full max-w-md mb-6 bg-red-950/50 border-red-800 text-red-100 p-6 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <span>There is a system problem. Please try later.</span>
          </div>
        </Card>
      )}

      {phase.kind === "retry_requested" && (
        <Card className="w-full max-w-md mb-6 bg-emerald-950/50 border-emerald-800 text-emerald-100 p-6 space-y-2">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            <span>We told the referred user to open the Mini App again.</span>
          </div>
        </Card>
      )}

      {items.length === 0 && !preparing && (
        <Card className="w-full max-w-md bg-slate-800/60 border-slate-700 text-white p-6 text-center text-slate-400">
          Nobody is waiting for verification yet.
        </Card>
      )}

      <div className="w-full max-w-md space-y-3">
        {items.map((item) => (
          <Card key={item.id} className="bg-slate-800/60 border-slate-700 text-white p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium truncate">{item.referredUser.displayName}</p>
                <p className="text-xs text-slate-400">
                  {item.status === "PENDING" && "Ready for verification"}
                  {item.status === "PREPARING" && "Preparing..."}
                  {item.status === "AVAILABLE" && "Verification available"}
                  {item.status === "FAILED" && "Last attempt failed"}
                </p>
              </div>

              <Button
                onClick={() => handleVerify(item)}
                disabled={loading || phase.kind === "preparing"}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {phase.kind === "preparing" && phase.verificationId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
                <span className="ml-2">Verify User</span>
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button asChild variant="ghost" className="mt-6 text-slate-400 hover:text-slate-200">
        <a href="/">Back to Mini App</a>
      </Button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-start p-6 pt-16">
      <div className="flex items-center gap-2 mb-6 text-slate-300">
        <ShieldCheck className="w-5 h-5 text-blue-400" />
        <span className="text-sm">Referral dashboard</span>
      </div>
      {children}
    </div>
  );
}