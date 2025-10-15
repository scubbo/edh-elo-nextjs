"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const decksResponse = await fetch('/api/decks');
        
        if (!decksResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const decksData = await decksResponse.json();

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

        </div>


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
                <div className="space-y-3">
                  {player.decks.map((deck) => {
                    // Calculate gradient color for ELO (1000-1200 range)
                    const eloPercent = Math.min(Math.max((deck.elo - 900) / 300, 0), 1)
                    const eloColor = eloPercent > 0.6 ? 'from-green-50 to-green-100 text-green-800 border-green-200' :
                                     eloPercent > 0.3 ? 'from-blue-50 to-blue-100 text-blue-800 border-blue-200' :
                                     'from-slate-50 to-slate-100 text-slate-800 border-slate-200'

                    // Calculate gradient color for win rate
                    const winRateColor = deck.winRate >= 50 ? 'from-green-50 to-green-100 text-green-800 border-green-200' :
                                        deck.winRate >= 25 ? 'from-amber-50 to-amber-100 text-amber-800 border-amber-200' :
                                        'from-red-50 to-red-100 text-red-800 border-red-200'

                    return (
                      <div key={deck.id} className="pb-3 border-b border-slate-200 last:border-0 last:pb-0">
                        <div className="font-bold text-slate-900 mb-2">{deck.name}</div>
                        <div className="flex gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`bg-gradient-to-br ${eloColor} border font-semibold`}
                          >
                            {deck.elo} ELO
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`bg-gradient-to-br ${winRateColor} border font-semibold`}
                          >
                            {deck.winRate.toFixed(1)}% WR
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 border-slate-200 font-semibold"
                          >
                            {deck.gamesPlayed}G
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
