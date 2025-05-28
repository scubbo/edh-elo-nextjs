"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Plus, Search, Trophy, Calendar } from "lucide-react"

interface Game {
  id: string
  date: string
  winningDeckId: string
  decks: {
    deckId: string
    playerId: string
  }[]
  duration: string
  notes?: string
}

export default function GamesPage() {
  const [games] = useState<Game[]>([
    {
      id: "47",
      date: "2024-01-15",
      winningDeckId: "1-1", // Meren of Clan Nel Toth
      decks: [
        { deckId: "1-1", playerId: "1" }, // Alice's Meren
        { deckId: "2-1", playerId: "2" }, // Bob's Atraxa
        { deckId: "3-1", playerId: "3" }, // Charlie's Muldrotha
        { deckId: "4-1", playerId: "4" }, // Dave's Ur-Dragon
      ],
      duration: "2h 15m",
      notes: "Epic game with multiple board wipes",
    },
    {
      id: "46",
      date: "2024-01-12",
      winningDeckId: "2-1", // Atraxa, Praetors' Voice
      decks: [
        { deckId: "1-2", playerId: "1" }, // Alice's Krenko
        { deckId: "2-1", playerId: "2" }, // Bob's Atraxa
        { deckId: "3-1", playerId: "3" }, // Charlie's Muldrotha
        { deckId: "4-1", playerId: "4" }, // Dave's Ur-Dragon
      ],
      duration: "1h 45m",
      notes: "Bob's combo deck dominated",
    },
    {
      id: "45",
      date: "2024-01-10",
      winningDeckId: "1-2", // Krenko, Mob Boss
      decks: [
        { deckId: "1-2", playerId: "1" }, // Alice's Krenko
        { deckId: "2-2", playerId: "2" }, // Bob's Edgar
        { deckId: "3-1", playerId: "3" }, // Charlie's Muldrotha
        { deckId: "4-1", playerId: "4" }, // Dave's Ur-Dragon
      ],
      duration: "3h 20m",
      notes: "Longest game of the month",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")

  // Mock data for players and decks (in a real app, this would come from your state management)
  const players = [
    { id: "1", name: "Alice" },
    { id: "2", name: "Bob" },
    { id: "3", name: "Charlie" },
    { id: "4", name: "Dave" },
  ]

  const decks = [
    { id: "1-1", name: "Meren of Clan Nel Toth", ownerId: "1" },
    { id: "1-2", name: "Krenko, Mob Boss", ownerId: "1" },
    { id: "2-1", name: "Atraxa, Praetors' Voice", ownerId: "2" },
    { id: "2-2", name: "Edgar Markov", ownerId: "2" },
    { id: "3-1", name: "Muldrotha, the Gravetide", ownerId: "3" },
    { id: "4-1", name: "The Ur-Dragon", ownerId: "4" },
  ]

  const filteredGames = games.filter(
    (game) => {
      const gameDecks = game.decks.map(d => decks.find(deck => deck.id === d.deckId))
      const gamePlayers = game.decks.map(d => players.find(p => p.id === d.playerId))
      const winningDeck = decks.find(d => d.id === game.winningDeckId)
      const winningPlayer = players.find(p => p.id === winningDeck?.ownerId)

      return (
        winningDeck?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        winningPlayer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        gameDecks.some(deck => deck?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        gamePlayers.some(player => player?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        game.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  )

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
                  <TableHead>Duration</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGames.map((game) => {
                  const winningDeck = decks.find(d => d.id === game.winningDeckId)
                  const winningPlayer = players.find(p => p.id === winningDeck?.ownerId)
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
                        <Badge variant="default" className="bg-amber-100 text-amber-800 border-amber-200">
                          <Trophy className="h-3 w-3 mr-1" />
                          {winningDeck?.name} ({winningPlayer?.name})
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {game.decks.map(({ deckId, playerId }) => {
                            const deck = decks.find(d => d.id === deckId)
                            const player = players.find(p => p.id === playerId)
                            return (
                              <Badge
                                key={deckId}
                                variant={deckId === game.winningDeckId ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {deck?.name} ({player?.name})
                              </Badge>
                            )
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{game.duration}</TableCell>
                      <TableCell className="text-slate-600 max-w-xs truncate">{game.notes || "No notes"}</TableCell>
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
