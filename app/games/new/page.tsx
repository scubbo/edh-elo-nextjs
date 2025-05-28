"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, Clock, FileText } from "lucide-react"

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

export default function NewGamePage() {
  const router = useRouter()
  const [selectedDecks, setSelectedDecks] = useState<{ deckId: string; playerId: string }[]>([])
  const [winningDeckId, setWinningDeckId] = useState("")
  const [duration, setDuration] = useState("")
  const [notes, setNotes] = useState("")

  const handleDeckToggle = (deckId: string, playerId: string) => {
    setSelectedDecks((prev) => {
      const isSelected = prev.some(d => d.deckId === deckId)
      if (isSelected) {
        // Clear winner if they're no longer selected
        if (winningDeckId === deckId) {
          setWinningDeckId("")
        }
        return prev.filter(d => d.deckId !== deckId)
      } else {
        return [...prev, { deckId, playerId }]
      }
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedDecks.length < 2) {
      alert("Please select at least 2 decks")
      return
    }

    if (!winningDeckId) {
      alert("Please select a winning deck")
      return
    }

    // Here you would typically save the game data
    console.log({
      decks: selectedDecks,
      winningDeckId,
      duration,
      notes,
      date: new Date().toISOString(),
    })

    // Redirect to games page
    router.push("/games")
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Record New Game</h1>
            <p className="text-slate-600">Add the results of your latest EDH game</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Deck Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <span>Select Decks</span>
                </CardTitle>
                <CardDescription>Choose which decks participated in this game (minimum 2 decks)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {players.map((player) => (
                    <div key={player.id} className="space-y-2">
                      <h3 className="font-medium text-slate-900">{player.name}'s Decks</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {decks
                          .filter((deck) => deck.ownerId === player.id)
                          .map((deck) => (
                            <div
                              key={deck.id}
                              className={`p-2 rounded-md border cursor-pointer transition-colors ${
                                selectedDecks.some((d) => d.deckId === deck.id)
                                  ? "border-blue-500 bg-blue-50"
                                  : "border-slate-200 hover:border-slate-300"
                              }`}
                              onClick={() => handleDeckToggle(deck.id, player.id)}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm">{deck.name}</span>
                                {selectedDecks.some((d) => d.deckId === deck.id) && (
                                  <Badge variant="secondary">Selected</Badge>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                {selectedDecks.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-slate-600 mb-2">Selected decks:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedDecks.map(({ deckId, playerId }) => {
                        const deck = decks.find((d) => d.id === deckId)
                        const player = players.find((p) => p.id === playerId)
                        return (
                          <Badge key={deckId} variant="secondary">
                            {deck?.name} ({player?.name})
                          </Badge>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Winner Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Trophy className="h-5 w-5 text-amber-600" />
                  <span>Select Winner</span>
                </CardTitle>
                <CardDescription>Which deck won this game?</CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={winningDeckId} onValueChange={setWinningDeckId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the winning deck" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedDecks.map(({ deckId, playerId }) => {
                      const deck = decks.find((d) => d.id === deckId)
                      const player = players.find((p) => p.id === playerId)
                      return (
                        <SelectItem key={deckId} value={deckId}>
                          <div className="flex items-center space-x-2">
                            <Trophy className="h-4 w-4 text-amber-500" />
                            <span>
                              {deck?.name} ({player?.name})
                            </span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Game Duration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  <span>Game Duration</span>
                </CardTitle>
                <CardDescription>How long did the game last? (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="e.g., 2h 30m, 90 minutes, etc."
                />
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  <span>Game Notes</span>
                </CardTitle>
                <CardDescription>Any additional details about the game (optional)</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe key moments, strategies used, memorable plays, etc."
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={selectedDecks.length < 2 || !winningDeckId}>
                Record Game
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
