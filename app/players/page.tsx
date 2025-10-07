"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Trophy, TrendingUp, TrendingDown } from "lucide-react"

interface Deck {
  id: number;
  name: string;
  ownerId: number;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
  owner: {
    id: number;
    name: string;
  };
}

interface Player {
  id: number;
  name: string;
  decks: Deck[];
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sortedDecks, setSortedDecks] = useState<Deck[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const decksResponse = await fetch('/api/decks');
        
        if (!decksResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const decksData = await decksResponse.json();
        setSortedDecks(decksData);

        // Group decks by owner to create players array
        const playersMap = new Map<number, Player>();
        decksData.forEach((deck: Deck) => {
          if (!playersMap.has(deck.owner.id)) {
            playersMap.set(deck.owner.id, {
              id: deck.owner.id,
              name: deck.owner.name,
              decks: []
            });
          }
          playersMap.get(deck.owner.id)!.decks.push(deck);
        });

        setPlayers(Array.from(playersMap.values()));
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleAddPlayer = async () => {
    if (newPlayerName.trim()) {
      try {
        const response = await fetch('/api/players', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: newPlayerName.trim() }),
        });

        if (!response.ok) {
          throw new Error('Failed to add player');
        }

        const newPlayer = await response.json();
        setPlayers([...players, newPlayer]);
        setNewPlayerName("");
        setIsDialogOpen(false);
      } catch (error) {
        console.error('Error adding player:', error);
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Players & Decks</h1>
            <p className="text-slate-600">Manage your EDH group members and their decks</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Player
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Player</DialogTitle>
                <DialogDescription>
                  Add a new player to your EDH group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="playerName">Player Name</Label>
                  <Input
                    id="playerName"
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Enter player name"
                    onKeyDown={(e) => e.key === "Enter" && handleAddPlayer()}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddPlayer}>Add Player</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Deck Rankings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <span>Current Deck Rankings</span>
            </CardTitle>
            <CardDescription>Decks ranked by ELO rating</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Rank</TableHead>
                  <TableHead>Deck</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>ELO</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Wins</TableHead>
                  <TableHead>Losses</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Trend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDecks.map((deck, index) => {
                  const owner = players.find(p => p.id === deck.ownerId)
                  return (
                    <TableRow key={deck.id}>
                      <TableCell className="font-medium">
                        {index === 0 && <Trophy className="h-4 w-4 text-amber-500 inline mr-1" />}#{index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{deck.name}</TableCell>
                      <TableCell>{owner?.name}</TableCell>
                      <TableCell>
                        <Badge variant={deck.elo >= 1600 ? "default" : "secondary"}>{deck.elo}</Badge>
                      </TableCell>
                      <TableCell>{deck.gamesPlayed}</TableCell>
                      <TableCell className="text-green-600">{deck.wins}</TableCell>
                      <TableCell className="text-red-600">{deck.losses}</TableCell>
                      <TableCell>
                        <span className={deck.winRate >= 50 ? "text-green-600" : "text-red-600"}>
                          {deck.winRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {deck.winRate >= 50 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Player Stats Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {players.map((player) => (
            <Card key={player.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{player.name}</CardTitle>
                  <Badge variant="secondary">{player.decks.length} Decks</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {player.decks.map((deck) => (
                    <div key={deck.id} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{deck.name}</span>
                        <Badge variant={deck.elo >= 1600 ? "default" : "secondary"}>{deck.elo} ELO</Badge>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Games:</span>
                        <span className="font-medium">{deck.gamesPlayed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Win Rate:</span>
                        <span className={`font-medium ${deck.winRate >= 50 ? "text-green-600" : "text-red-600"}`}>
                          {deck.winRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
