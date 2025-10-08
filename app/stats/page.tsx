"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Trophy, TrendingUp, Users, Clock, Target, Loader2, Network } from "lucide-react"
import PlayerNetworkGraph from "@/components/PlayerNetworkGraph"

interface Statistics {
  overview: {
    totalGames: number;
    totalPlayers: number;
    averageTurns: number;
    mostActivePlayer: string;
    longestGame: number;
    shortestGame: number;
  };
  playerStats: Array<{
    name: string;
    elo: number;
    wins: number;
    winRate: number;
    gamesPlayed: number;
  }>;
  recentTrends: Array<{
    period: string;
    games: number;
    mostWins: string;
  }>;
  turnDistribution: {
    under8: number;
    between8and12: number;
    between12and16: number;
    over16: number;
  };
  playCountHistogram: {
    "1 game": number;
    "2 games": number;
    "3 games": number;
    "4 games": number;
    "5 games": number;
    "6-10 games": number;
    "11-20 games": number;
    "21-30 games": number;
    "31-50 games": number;
    "50+ games": number;
  };
  socialDynamics: {
    mostFrequentOpponents: Array<{
      pair: string;
      count: number;
    }>;
    neverPlayedPairings: string[];
    allOpponentPairs: Array<{
      pair: string;
      count: number;
    }>;
    allPlayers: string[];
  };
}

export default function StatsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch statistics');
        }
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading statistics...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error Loading Statistics</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-slate-600 mb-2">No Data Available</h2>
          <p className="text-slate-500">No statistics found in the database.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Statistics & Analytics</h1>
          <p className="text-slate-600">Comprehensive overview of your EDH group&apos;s performance</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Link href="/games">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center space-x-2">
                  <Trophy className="h-8 w-8 text-amber-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.overview.totalGames}</p>
                    <p className="text-sm text-slate-600">Total Games</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/players">
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-6 h-full flex items-center">
                <div className="flex items-center space-x-2">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{stats.overview.totalPlayers}</p>
                    <p className="text-sm text-slate-600">Active Players</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full">
            <CardContent className="p-6 h-full flex items-center">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.overview.averageTurns}</p>
                  <p className="text-sm text-slate-600">Avg Turns</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6 h-full flex items-center">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.overview.mostActivePlayer}</p>
                  <p className="text-sm text-slate-600">Most Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6 h-full flex items-center">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.overview.longestGame}</p>
                  <p className="text-sm text-slate-600">Longest Game (turns)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="h-full">
            <CardContent className="p-6 h-full flex items-center">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.overview.shortestGame}</p>
                  <p className="text-sm text-slate-600">Shortest Game (turns)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Player Performance */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                <span>Player Performance</span>
              </CardTitle>
              <CardDescription>Current standings and win rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats.playerStats.map((player, index) => (
                  <div key={player.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-lg">#{index + 1}</span>
                        <div>
                          <p className="font-medium">{player.name}</p>
                          <p className="text-sm text-slate-600">{player.wins} wins</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={player.elo >= 1600 ? "default" : "secondary"}>{player.elo} ELO</Badge>
                        <p className="text-sm text-slate-600 mt-1">{player.winRate.toFixed(1)}% win rate</p>
                      </div>
                    </div>
                    <Progress value={player.winRate} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Recent Trends and Turn Count Analysis */}
          <div className="space-y-6">
            {/* Recent Trends */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span>Recent Trends</span>
                </CardTitle>
                <CardDescription>Performance over different time periods</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.recentTrends.map((trend) => (
                    <div key={trend.period} className="border-l-4 border-blue-500 pl-3">
                      <h4 className="font-medium text-sm">{trend.period}</h4>
                      <p className="text-xs text-slate-600">{trend.games} games played</p>
                      <p className="text-xs">
                        Most wins: <span className="font-medium text-green-600">{trend.mostWins}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Turn Count Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Turn Count Analysis</CardTitle>
                <CardDescription>Distribution of game lengths by turn count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm w-24 text-right">Under 8 turns</span>
                    <div className="flex-1">
                      <Progress value={stats.overview.totalGames > 0 ? (stats.turnDistribution.under8 / stats.overview.totalGames) * 100 : 0} className="h-3" />
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-left">
                      {stats.overview.totalGames > 0 ? Math.round((stats.turnDistribution.under8 / stats.overview.totalGames) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm w-24 text-right">8-12 turns</span>
                    <div className="flex-1">
                      <Progress value={stats.overview.totalGames > 0 ? (stats.turnDistribution.between8and12 / stats.overview.totalGames) * 100 : 0} className="h-3" />
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-left">
                      {stats.overview.totalGames > 0 ? Math.round((stats.turnDistribution.between8and12 / stats.overview.totalGames) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm w-24 text-right">12-16 turns</span>
                    <div className="flex-1">
                      <Progress value={stats.overview.totalGames > 0 ? (stats.turnDistribution.between12and16 / stats.overview.totalGames) * 100 : 0} className="h-3" />
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-left">
                      {stats.overview.totalGames > 0 ? Math.round((stats.turnDistribution.between12and16 / stats.overview.totalGames) * 100) : 0}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm w-24 text-right">Over 16 turns</span>
                    <div className="flex-1">
                      <Progress value={stats.overview.totalGames > 0 ? (stats.turnDistribution.over16 / stats.overview.totalGames) * 100 : 0} className="h-3" />
                    </div>
                    <span className="text-xs text-slate-600 w-8 text-left">
                      {stats.overview.totalGames > 0 ? Math.round((stats.turnDistribution.over16 / stats.overview.totalGames) * 100) : 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deck Play Count Histogram */}
            <Card>
              <CardHeader>
                <CardTitle>Deck Play Count Distribution</CardTitle>
                <CardDescription>How many games each deck has been played</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.playCountHistogram)
                    .filter(([_, count]) => count > 0)
                    .map(([range, count]) => {
                      const totalDecks = Object.values(stats.playCountHistogram).reduce((sum, val) => sum + val, 0);
                      const percentage = totalDecks > 0 ? (count / totalDecks) * 100 : 0;
                      
                      return (
                        <div key={range} className="flex items-center space-x-4">
                          <span className="text-sm w-24 text-right">{range}</span>
                          <div className="flex-1">
                            <Progress value={percentage} className="h-3" />
                          </div>
                          <span className="text-xs text-slate-600 w-8 text-left">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
                <div className="mt-4 text-sm text-slate-500">
                  Total decks: {Object.values(stats.playCountHistogram).reduce((sum, val) => sum + val, 0)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Social Dynamics - Player Network Graph */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5 text-blue-600" />
                <span>Player Network</span>
              </CardTitle>
              <CardDescription>
                Player connections: <span className="text-green-600 font-medium">thick green lines</span> = frequent opponents. 
                Hover over nodes to see player names.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlayerNetworkGraph
                allOpponentPairs={stats.socialDynamics.allOpponentPairs}
                allPlayers={stats.socialDynamics.allPlayers}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
