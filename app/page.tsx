"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function RomanticVideoPage() {
  const router = useRouter()
  const youtubeUrl = "https://www.youtube.com/watch?v=pZe3ZiyGpRw&list=RDpZe3ZiyGpRw&start_radio=1"

  useEffect(() => {
    // Check localStorage for a session key
    const hasSession = localStorage.getItem("sessionActive") === "true"

    if (!hasSession) {
      // no session → redirect after 2 sec
      const timer = setTimeout(() => {
        router.push("/phone")
      }, 2000)

      return () => clearTimeout(timer)
    }
    // if session exists → do nothing, stay on page
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 dark:from-rose-950 dark:via-pink-900 dark:to-rose-800" />

      {/* floating hearts here */}

      <div className="relative z-10 romantic-glow">
        <div className="bg-white/80 dark:bg-black/60 backdrop-blur-sm rounded-2xl p-6 shadow-2xl border border-pink-200/50 dark:border-rose-800/50">
          <div className="aspect-video w-[800px] max-w-[90vw] rounded-xl overflow-hidden shadow-lg">
            <iframe
              src={youtubeUrl}
              title="Romantic Video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </div>
  )
}
