"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useMiniAppSession } from "@/lib/useMiniAppSession";
import { isOnWaitlist } from "@/lib/storage";

/**
 * Referring is a bot-side ADMIN/SUPERADMIN flow (see /share), so this screen has
 * no dashboard to render any more and only holds the loading state.
 */
export default function ReferralDashboardPage() {
  const router = useRouter();
  const session = useMiniAppSession();

  useEffect(() => {
    if (isOnWaitlist()) router.replace("/waitlist");
  }, [router]);

  useEffect(() => {
    if (session.status === "forbidden") router.replace("/");
  }, [session, router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );
}
