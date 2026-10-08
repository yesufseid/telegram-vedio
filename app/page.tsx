"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Loader2, ShieldCheck } from "lucide-react";
import { useMiniAppSession } from "@/lib/useMiniAppSession";
import { useMiniAppSocket } from "@/lib/useMiniAppSocket";
import { api } from "@/lib/api";
import { isOnWaitlist } from "@/lib/storage";

export default function MiniAppPage() {
  const router = useRouter();
  const session = useMiniAppSession();
  const [notified, setNotified] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Section 18: localStorage waitlist state wins over every other flow.
  useEffect(() => {
    if (isOnWaitlist()) router.replace("/waitlist");
  }, [router]);

  // Section 8: opening the Mini App notifies the referral over WSS.
  useEffect(() => {
    if (session.status !== "ready" || notified) return;

    api
      .ready(session.token)
      .then((res) => {
        setNotified(true);
        if (!res.referralOnline) setNotice("Your referral is offline right now.");
      })
      .catch(() => setNotified(true));
  }, [session, notified]);

  useMiniAppSocket(
    session.status === "ready" ? session.token : null,
    (event) => {
      if (event.type === "VERIFICATION_RETRY_AVAILABLE") {
        setNotice(event.data?.message || "The system is now working. Please try again.");
      }
      if (event.type === "VERIFICATION_COMPLETED") {
        router.replace("/waitlist");
      }
    }
  );

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
            {notice || "Your referral has been notified that you are ready for verification."}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for your referral to verify you.
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