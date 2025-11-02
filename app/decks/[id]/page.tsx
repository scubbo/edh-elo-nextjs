"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link"
import { Trophy, User, TrendingUp, Target, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { MetadataEditor } from "@/components/MetadataEditor"

interface DeckDetails {
  id: number
  name: string
  owner: {
    id: number
    name: string
  }
  metadata?: Record<string, any> | null
  stats: {
    gamesPlayed: number
    wins: number
    losses: number
    winRate: number
    currentElo: number
  }
  eloHistory: {
    date: string
    elo: number
    gameId: number
  }[]
  gameHistory: {
    id: number
    date: string
    isWin: boolean
    eloAfter: number
    format: string
    winType: string
    numberOfTurns: number
    opponents: {
      deckName: string
      playerName: string
    }[]
  }[]
}

export default function DeckDetailPage() {
  const params = useParams()
  const deckId = params.id as string
  const [deckDetails, setDeckDetails] = useState<DeckDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDeckDetails() {
      try {
        const response = await fetch(`/api/decks/${deckId}`)
        if (!response.ok) {
          if (response.status === 404) {
            setError('Deck not found')
          } else {
            setError('Failed to load deck details')
          }
          return
        }
        const data = await response.json()
        setDeckDetails(data)
      } catch (err) {
        console.error('Error loading deck details:', err)
        setError('Failed to load deck details')
      } finally {
        setIsLoading(false)
      }
    }

    loadDeckDetails()
  }, [deckId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading deck details...</p>
        </div>
      </div>
    )
  }

  if (error || !deckDetails) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{error || 'Deck not found'}</h3>
                <p className="text-slate-600 mb-4">
                  The deck you&apos;re looking for doesn&apos;t exist or there was an error loading it.
                </p>
                <Link href="/decks" className="text-blue-600 hover:underline">
                  Return to deck list
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Format chart data - consolidate same-day games, keeping the last game's ELO
  const consolidatedData = new Map<string, { date: Date, elo: number, gameId: number }>()

  deckDetails.eloHistory.forEach((point) => {
    const dateKey = new Date(point.date).toLocaleDateString()
    const existing = consolidatedData.get(dateKey)

    // Keep the entry with the higher game ID (later game)
    if (!existing || point.gameId > existing.gameId) {
      consolidatedData.set(dateKey, {
        date: new Date(point.date),
        elo: point.elo,
        gameId: point.gameId
      })
    }
  })

  // Convert to array and sort by date
  const chartData = Array.from(consolidatedData.values())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map(point => ({
      timestamp: point.date.getTime(),
      date: point.date.toLocaleDateString(),
      elo: point.elo,
      gameId: point.gameId
    }))

  // Calculate y-axis domain with padding
  const eloValues = chartData.map(point => point.elo)
  const minElo = Math.min(...eloValues)
  const maxElo = Math.max(...eloValues)
  const range = maxElo - minElo
  const padding = Math.max(range * 0.1, 20) // 10% padding or at least 20 points
  const yAxisMin = Math.floor(minElo - padding)
  const yAxisMax = Math.ceil(maxElo + padding)

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{deckDetails.name}</h1>
              <div className="flex items-center gap-2 text-slate-600">
                <User className="h-4 w-4" />
                <span>Owned by <span className="font-medium">{deckDetails.owner.name}</span></span>
              </div>
            </div>
            <MetadataEditor
              entityType="deck"
              entityId={deckDetails.id}
              currentMetadata={deckDetails.metadata || null}
              onUpdate={() => {
                // Reload deck details
                fetch(`/api/decks/${deckId}`)
                  .then(res => res.json())
                  .then(data => setDeckDetails(data))
                  .catch(err => console.error('Error reloading deck:', err))
              }}
            />
          </div>
          {/* Metadata Display */}
          {(deckDetails.metadata && Object.keys(deckDetails.metadata).length > 0) && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-lg">Metadata</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {deckDetails.metadata.colours && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">Colours:</span>
                      <Badge variant="outline" className="font-mono">
                        {deckDetails.metadata.colours}
                      </Badge>
                    </div>
                  )}
                  {deckDetails.metadata.decklistUrl && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-600">Decklist:</span>
                      <Link
                        href={deckDetails.metadata.decklistUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Decklist
                      </Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Top-level stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Current ELO</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold text-slate-900">{deckDetails.stats.currentElo}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Games Played</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-slate-600" />
                <span className="text-2xl font-bold text-slate-900">{deckDetails.stats.gamesPlayed}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold text-slate-900">
                  {deckDetails.stats.winRate.toFixed(1)}%
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Record</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                <span className="text-green-600">{deckDetails.stats.wins}</span>
                {" - "}
                <span className="text-red-600">{deckDetails.stats.losses}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ELO Chart */}
        {chartData.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>ELO History</CardTitle>
              <CardDescription>Track of this deck&apos;s ELO rating over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" verticalPoints={chartData.map(d => d.timestamp)} />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(timestamp) => new Date(timestamp).toLocaleDateString()}
                    ticks={chartData.map(d => d.timestamp)}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis domain={[yAxisMin, yAxisMax]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-3 border border-slate-200 rounded shadow-lg">
                            <p className="text-sm font-medium text-slate-900">
                              Game #{payload[0].payload.gameId}
                            </p>
                            <p className="text-sm text-slate-600">
                              {payload[0].payload.date}
                            </p>
                            <p className="text-sm font-semibold text-blue-600">
                              ELO: {payload[0].value}
                            </p>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="elo"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ fill: '#2563eb', r: 4 }}
                    activeDot={{ r: 6 }}
                    name="ELO Rating"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Game History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-slate-600" />
              <span>Game History</span>
            </CardTitle>
            <CardDescription>All games played with this deck</CardDescription>
          </CardHeader>
          <CardContent>
            {deckDetails.gameHistory.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-600">No games played yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Game #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead>ELO After</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Turns</TableHead>
                    <TableHead>Opponents</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deckDetails.gameHistory.map((game) => (
                    <TableRow key={game.id}>
                      <TableCell className="font-medium">#{game.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{new Date(game.date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {game.isWin ? (
                          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                            <Trophy className="h-3 w-3 mr-1" />
                            Win
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-red-100 text-red-800 border-red-200">
                            Loss
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{game.eloAfter}</Badge>
                      </TableCell>
                      <TableCell>{game.format}</TableCell>
                      <TableCell>{game.numberOfTurns}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {game.opponents.map((opponent, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {opponent.deckName} ({opponent.playerName})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
