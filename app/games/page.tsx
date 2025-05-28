"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trophy, Calendar } from "lucide-react"

interface Game {
  id: number
  date: string
  deckIds: number[]
  winningDeckIds: number[]
  numberOfTurns: number
  firstPlayerOutTurn: number
  winType: {
    id: number
    name: string
  }
  format: {
    id: number
    name: string
  }
  description: string
  scores: {
    id: number
    date: string
    score: number
    deck: {
      id: number
      name: string
      owner: {
        id: number
        name: string
      }
    }
  }[]
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/games')
        if (!response.ok) {
          throw new Error('Failed to fetch games')
        }
        const data = await response.json()
        setGames(data)
      } catch (error) {
        console.error('Error fetching games:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchGames()
  }, [])

  const filteredGames = games.filter((game) => {
    const gameDecks = game.scores.map(score => score.deck)
    const gamePlayers = game.scores.map(score => score.deck.owner)
    const winningDecks = game.scores.filter(score => game.winningDeckIds.includes(score.deck.id))

    return (
      winningDecks.some(score => score.deck.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      winningDecks.some(score => score.deck.owner.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      gameDecks.some(deck => deck.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      gamePlayers.some(player => player.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      game.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading games...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Game History</h1>
            <p className="text-slate-600">View and manage all recorded EDH games</p>
          </div>

          <Link href="/games/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record New Game
            </Button>
          </Link>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                <Input
                  placeholder="Search games by deck, player, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Games Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <span>Recent Games</span>
            </CardTitle>
            <CardDescription>Complete history of all recorded games</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Game #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Winner</TableHead>
                  <TableHead>Decks</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Win Type</TableHead>
                  <TableHead>Turns</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => {
                  const winningScores = game.scores.filter(score => game.winningDeckIds.includes(score.deck.id))
                  return (
                    <TableRow key={game.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">#{game.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span>{new Date(game.date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {winningScores.map(score => (
                            <Badge key={score.id} variant="default" className="bg-amber-100 text-amber-800 border-amber-200">
                              <Trophy className="h-3 w-3 mr-1" />
                              {score.deck.name} ({score.deck.owner.name})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {game.scores.map(score => (
                            <Badge
                              key={score.id}
                              variant={game.winningDeckIds.includes(score.deck.id) ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {score.deck.name} ({score.deck.owner.name})
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{game.format.name}</TableCell>
                      <TableCell>{game.winType.name}</TableCell>
                      <TableCell>{game.numberOfTurns}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">{game.description || "No notes"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No games found</h3>
            <p className="text-slate-600 mb-4">
              {searchTerm ? "Try adjusting your search terms" : "Start by recording your first game"}
            </p>
            <Link href="/games/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record New Game
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
