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
    <div
      className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-6 p-6 text-center bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: "url(/3.jpg)" }}
    >
      <div className="absolute inset-0 bg-slate-950/75" aria-hidden="true" />

      <div className="relative space-y-6">
        <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto" />

        <div className="space-y-2">
          <h1 className="text-3xl font-semibold">You are now on the waitlist.</h1>
          <p className="text-slate-300 max-w-sm">Our team will get back to you soon.</p>
        </div>
      </div>
    </div>
  );
}