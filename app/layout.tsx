import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import Link from "next/link"
import { Trophy } from "lucide-react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "EDH ELO Tracker",
  description: "Track your Commander games and ELO ratings",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-amber-600" />
                <span className="text-2xl font-bold text-slate-900">EDH ELO Tracker</span>
              </Link>
              <div className="flex items-center space-x-6">
                <Link href="/players" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Players
                </Link>
                <Link href="/decks" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Decks
                </Link>
                <Link href="/games" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Games
                </Link>
                <Link href="/stats" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Statistics
                </Link>
                <Link href="/debug" className="text-slate-600 hover:text-slate-900 transition-colors">
                  Debug
                </Link>
              </div>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
