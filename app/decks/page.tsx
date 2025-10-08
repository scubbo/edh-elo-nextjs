"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trophy, TrendingUp, TrendingDown } from "lucide-react"

interface Deck {
  id: number;
  name: string;
  ownerId: number;
  elo: number;
  previousElo: number | null;
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

export default function DecksPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [sortedDecks, setSortedDecks] = useState<Deck[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const decksResponse = await fetch('/api/decks');
        
        if (!decksResponse.ok) {
          const errorData = await decksResponse.json();
          console.error('API Error:', errorData);
          throw new Error(`Failed to fetch data: ${errorData.error || 'Unknown error'}`);
        }

        const decksData = await decksResponse.json();
        console.log('Decks data received:', decksData);
        
        if (!Array.isArray(decksData)) {
          throw new Error('Invalid data format received from API');
        }

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
        // Set empty arrays to show the page instead of loading forever
        setSortedDecks([]);
        setPlayers([]);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  if (sortedDecks.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Deck Rankings</h1>
            <p className="text-slate-600">All decks ranked by ELO rating</p>
          </div>
          
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No Decks Found</h3>
                <p className="text-slate-600 mb-4">
                  It looks like there are no decks in the database yet.
                </p>
                <p className="text-sm text-slate-500">
                  Visit the <a href="/admin" className="text-blue-600 hover:underline">Admin page</a> to seed the database with data.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Deck Rankings</h1>
          <p className="text-slate-600">All decks ranked by ELO rating</p>
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
                        <span className={deck.winRate >= 25 ? "text-green-600" : "text-red-600"}>
                          {deck.winRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        {deck.previousElo !== null ? (
                          deck.elo > deck.previousElo ? (
                            <span title={`Previous ELO: ${deck.previousElo}`}>
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            </span>
                          ) : deck.elo < deck.previousElo ? (
                            <span title={`Previous ELO: ${deck.previousElo}`}>
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            </span>
                          ) : (
                            <span className="text-slate-400" title={`Previous ELO: ${deck.previousElo}`}>−</span>
                          )
                        ) : (
                          <span className="text-slate-400" title="No previous games">−</span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
