"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { isOnWaitlist } from "@/lib/storage";

export default function WaitlistPage() {
  const router = useRouter();

  // Section 18: this page is only reachable once verification succeeded.
  useEffect(() => {
    if (!isOnWaitlist()) router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6 p-6 text-center">
      <CheckCircle2 className="w-16 h-16 text-emerald-400" />

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">You are now on the waitlist.</h1>
        <p className="text-slate-400 max-w-sm">Our team will get back to you soon.</p>
      </div>
    </div>
  );
}