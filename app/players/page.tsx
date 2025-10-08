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
