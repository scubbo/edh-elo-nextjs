"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Trophy, Target, TrendingUp } from "lucide-react"
import DeckSummary from "@/components/DeckSummary"

interface PlayerDetails {
  id: number;
  name: string;
  decks: Array<{
    id: number;
    name: string;
    elo: number;
    wins: number;
    losses: number;
    gamesPlayed: number;
    winRate: number;
  }>;
  stats: {
    totalGames: number;
    totalWins: number;
    totalLosses: number;
    overallWinRate: number;
    averageElo: number;
    totalDecks: number;
  };
}

export default function PlayerDetailPage() {
  const params = useParams()
  const playerId = params.id as string
  const [playerDetails, setPlayerDetails] = useState<PlayerDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPlayerDetails = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/players/${playerId}`)

        if (!response.ok) {
          throw new Error('Failed to fetch player details')
        }

        const data = await response.json()
        setPlayerDetails(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchPlayerDetails()
  }, [playerId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading player details...</div>
      </div>
    )
  }

  if (error || !playerDetails) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <Link href="/players" className="inline-flex items-center text-blue-600 hover:underline mb-4">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Players
          </Link>
          <div className="text-center mt-8">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Player Details</h2>
            <p className="text-slate-600">{error || 'Player not found'}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <Link href="/players" className="inline-flex items-center text-blue-600 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Players
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">{playerDetails.name}</h1>
          <p className="text-slate-600">Player statistics and deck performance</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{playerDetails.stats.totalWins}</p>
                  <p className="text-sm text-slate-600">Total Wins</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{playerDetails.stats.totalGames}</p>
                  <p className="text-sm text-slate-600">Games Played</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{playerDetails.stats.overallWinRate.toFixed(1)}%</p>
                  <p className="text-sm text-slate-600">Win Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 flex items-center justify-center text-purple-600 font-bold text-xl">
                  ELO
                </div>
                <div>
                  <p className="text-2xl font-bold">{playerDetails.stats.averageElo}</p>
                  <p className="text-sm text-slate-600">Avg ELO</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 flex items-center justify-center text-slate-600 font-bold text-xl">
                  #
                </div>
                <div>
                  <p className="text-2xl font-bold">{playerDetails.stats.totalDecks}</p>
                  <p className="text-sm text-slate-600">Decks</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Decks */}
        <Card>
          <CardHeader>
            <CardTitle>Decks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {playerDetails.decks.map((deck) => (
                <DeckSummary key={deck.id} deck={deck} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
