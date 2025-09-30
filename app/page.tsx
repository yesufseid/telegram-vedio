"use client"

import { useEffect,useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { CheckCircle, Shield, Zap, Gift, Facebook, Twitter, Instagram } from "lucide-react"

export default function RomanticVideoPage() {
  const router = useRouter()

const [phoneNumber, setPhoneNumber] = useState("")

  const handleClaim = () => {
    if (phoneNumber) {
      // Handle claim logic here
      alert(`Claiming gift for: +251${phoneNumber}`)
    }
  }

  const features = [
    { icon: Zap, title: "Instant Recharge", description: "Get your card instantly" },
    { icon: Shield, title: "Secure & Verified", description: "100% safe and trusted" },
    { icon: Gift, title: "Limited Offers", description: "Exclusive deals for you" },
  ]

  const winners = [
    { name: "Abebe K.", phone: "09****1234", amount: "500 Birr" },
    { name: "Tigist M.", phone: "09****5678", amount: "300 Birr" },
    { name: "Dawit S.", phone: "09****9012", amount: "200 Birr" },
    { name: "Hanna T.", phone: "09****3456", amount: "500 Birr" },
  ]
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
     <div className="min-h-screen bg-gradient-to-br from-green-50 via-yellow-50 to-blue-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 via-yellow-500/10 to-blue-500/10" />

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full mb-6 font-medium">
              <Gift className="w-5 h-5" />
              Limited Time Offer
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-balance">
              Win Free <span className="text-green-600">Ethio Telecom</span>
              <br />
              <span className="bg-gradient-to-r from-green-600 via-yellow-500 to-blue-600 bg-clip-text text-transparent">
                Mobile Cards
              </span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto text-pretty">
              Enter your phone number now and claim your free recharge card. Instant delivery, no hidden fees!
            </p>
          </div>

          {/* Gift Card Mockup & Input Section */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Gift Card Image */}
            <div className="relative">
              <div className="relative bg-gradient-to-br from-green-500 via-green-600 to-green-700 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300">
                <div className="absolute top-4 right-4 bg-yellow-400 text-green-900 px-4 py-2 rounded-full font-bold text-sm">
                  FREE
                </div>

                <div className="text-white mb-6">
                  <h3 className="text-2xl font-bold mb-2">Ethio Telecom</h3>
                  <p className="text-green-100">Gift Card</p>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
                      <Gift className="w-6 h-6 text-green-700" />
                    </div>
                    <div>
                      <p className="text-sm text-green-100">Card Value</p>
                      <p className="text-3xl font-bold">500 Birr</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="h-8 bg-white/30 rounded" />
                    ))}
                  </div>
                </div>

                <p className="text-sm text-green-100 text-center">Scratch to reveal your code</p>
              </div>
            </div>

            {/* Input Form */}
            <Card className="p-8 shadow-xl border-2 border-green-200">
              <h2 className="text-3xl font-bold mb-6 text-center">Claim Your Gift</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Phone Number</label>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2 bg-muted px-4 py-3 rounded-lg border">
                      <span className="text-2xl">🇪🇹</span>
                      <span className="font-medium">+251</span>
                    </div>
                    <Input
                      type="tel"
                      placeholder="9 12 34 56 78"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="flex-1 text-lg py-6"
                      maxLength={9}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleClaim}
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-6 text-lg font-bold shadow-lg"
                  size="lg"
                >
                  <Gift className="w-5 h-5 mr-2" />
                  Claim Your Gift
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  By claiming, you agree to receive promotional messages
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Winners Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12">Recent Winners</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {winners.map((winner, index) => (
              <Card key={index} className="p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold">
                  {winner.name.charAt(0)}
                </div>
                <h3 className="font-bold mb-1">{winner.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{winner.phone}</p>
                <div className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Won {winner.amount}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-600 via-green-700 to-green-800 text-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">Ethio Telecom</h3>
              <p className="text-green-100">
                Ethiopia's leading telecommunications provider, connecting millions across the nation.
              </p>
            </div>

            <div>
              <h4 className="font-bold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-green-100">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms & Conditions
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact Support
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-4">Follow Us</h4>
              <div className="flex gap-4">
                <a
                  href="#"
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-green-500 pt-8 text-center text-green-100 text-sm">
            <p className="mb-2">
              <strong>Disclaimer:</strong> This is a promotional offer. Terms and conditions apply. Winners are selected
              randomly. Ethio Telecom reserves the right to modify or cancel this offer at any time.
            </p>
            <p>&copy; 2025 Ethio Telecom. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
