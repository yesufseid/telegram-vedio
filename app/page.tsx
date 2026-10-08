"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useMiniAppSession } from "@/lib/useMiniAppSession";
import { api } from "@/lib/api";
import { isOnWaitlist, saveVerificationToken } from "@/lib/storage";

const POLL_INTERVAL_MS = 4000;
const SYSTEM_PROBLEM = "There is a system problem. Please try later.";

export default function MiniAppPage() {
  const router = useRouter();
  const session = useMiniAppSession();
  const [notified, setNotified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  // The verification this client armed. Status for any other id is stale and ignored,
  // otherwise an old EXPIRED can latch the client and stop polling mid-retry.
  const [armedId, setArmedId] = useState<string | null>(null);

  // Section 18: localStorage waitlist state wins over every other flow.
  useEffect(() => {
    if (isOnWaitlist()) router.replace("/waitlist");
  }, [router]);

  // Section 8: opening the Mini App notifies the referral over Telegram.
  useEffect(() => {
    if (session.status !== "ready" || notified) return;

    api
      .ready(session.token)
      .then((res) => {
        setArmedId(res.verificationId);
        setNotified(true);
      })
      .catch(() => setNotified(true));
  }, [session, notified]);

  // Polls until the referral confirms from the bot, then moves on to /verify.
  // Deliberately independent of `notified`: the ready() call resolves on its own and
  // re-running this effect would tear the chain down before it ever sees a change.
  useEffect(() => {
    if (session.status !== "ready" || expired) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const res = await api.verificationStatus(session.token);
        if (cancelled) return;

        // Until ready() reports which verification we armed, no status can be
        // trusted: the endpoint may still be describing the previous window. Waiting
        // a cycle is cheap, while latching a stale EXPIRED would end polling for good.
        if (!armedId) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        // A response for any other verification is stale; ignore it and keep waiting.
        if (res.verificationId !== armedId) {
          timer = setTimeout(poll, POLL_INTERVAL_MS);
          return;
        }

        // SUBMITTED and REJECTED mean the user is already on /verify judging a code, so
        // going back there is correct; only PENDING/EXPIRED are handled below.
        const onVerifyPage =
          res.status === "AVAILABLE" || res.status === "SUBMITTED" || res.status === "REJECTED";

        if (onVerifyPage && res.verificationId) {
          if (res.verificationToken) saveVerificationToken(res.verificationToken);
          router.replace(`/verify?id=${encodeURIComponent(res.verificationId)}`);
          return;
        }

        // The one minute elapsed without the referral confirming.
        if (res.status === "EXPIRED" || res.status === "FAILED") {
          setExpired(true);
          setNotice(SYSTEM_PROBLEM);
          return;
        }

        // PENDING or NONE: the verification is not armed or not confirmed yet.
        timer = setTimeout(poll, POLL_INTERVAL_MS);
      } catch {
        // A transient failure must not kill polling; the Mini App may be waking up.
        if (!cancelled) timer = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [session, expired, armedId, router]);

  if (session.status === "loading") {
    return <Centered title="Loading" description="Checking your Telegram session..." spinner />;
  }

  if (session.status === "outside_telegram") {
    return (
      <Centered
        title="Open this page inside Telegram"
        description="Use the Open Mini App button from the Telegram bot."
      />
    );
  }

  if (session.status === "not_registered") {
    return (
      <Centered
        title="You are not registered yet"
        description="Open the Telegram bot and press /start to register."
      />
    );
  }

  if (session.status === "forbidden") {
    return (
      <Centered
        title="Not available for your account"
        description="This Mini App is only available to regular users."
      />
    );
  }

  if (session.status === "error") {
    return <Centered title="Something went wrong" description={session.message} />;
  }

  const { user } = session;

  return (
    <div
      className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6 p-6 bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url(/2.jpg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />
      <Card className="relative w-full max-w-md bg-slate-800/60 border-slate-700 text-white p-8 space-y-6 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-semibold">
            {user.username ? `@${user.username}` : "Welcome"}
          </h1>
          <p className="text-sm text-slate-400">
            {notice || "waiting for server."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className={`w-4 h-4 ${expired ? "" : "animate-spin"}`} />
          {expired && "Reopen the Mini App to try again."}
        </div>
      </Card>
    </div>
  );
}

function Centered({
  title,
  description,
  spinner,
}: {
  title: string;
  description: string;
  spinner?: boolean;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4 p-6 text-center">
      {spinner && <Loader2 className="w-8 h-8 animate-spin text-blue-400" />}
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-slate-400 max-w-sm">{description}</p>
    </div>
  );
}