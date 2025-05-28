"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, Trophy, TrendingUp, Users, Clock, Target } from "lucide-react"

export default function StatsPage() {
  const stats = {
    totalGames: 47,
    totalPlayers: 5,
    averageGameDuration: "2h 15m",
    mostActivePlayer: "Alice",
    longestGame: "3h 45m",
    shortestGame: "45m",
  }

  const playerStats = [
    { name: "Charlie", elo: 1720, wins: 28, winRate: 70.0, trend: "up" },
    { name: "Alice", elo: 1650, wins: 23, winRate: 57.5, trend: "up" },
    { name: "Bob", elo: 1580, wins: 19, winRate: 47.5, trend: "down" },
    { name: "Dave", elo: 1520, wins: 15, winRate: 37.5, trend: "down" },
    { name: "Eve", elo: 1500, wins: 2, winRate: 40.0, trend: "neutral" },
  ]

  const recentTrends = [
    { period: "Last 7 days", games: 3, mostWins: "Charlie" },
    { period: "Last 30 days", games: 12, mostWins: "Alice" },
    { period: "Last 90 days", games: 35, mostWins: "Charlie" },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Statistics & Analytics</h1>
          <p className="text-slate-600">Comprehensive overview of your EDH group&apos;s performance</p>
        </div>

        {/* Overview Stats */}
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Trophy className="h-8 w-8 text-amber-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalGames}</p>
                  <p className="text-sm text-slate-600">Total Games</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalPlayers}</p>
                  <p className="text-sm text-slate-600">Active Players</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.averageGameDuration}</p>
                  <p className="text-sm text-slate-600">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.mostActivePlayer}</p>
                  <p className="text-sm text-slate-600">Most Active</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Target className="h-8 w-8 text-red-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.longestGame}</p>
                  <p className="text-sm text-slate-600">Longest Game</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold">{stats.shortestGame}</p>
                  <p className="text-sm text-slate-600">Shortest Game</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Player Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-amber-600" />
                <span>Player Performance</span>
              </CardTitle>
              <CardDescription>Current standings and win rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {playerStats.map((player, index) => (
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
              <div className="space-y-6">
                {recentTrends.map((trend) => (
                  <div key={trend.period} className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium">{trend.period}</h4>
                    <p className="text-sm text-slate-600">{trend.games} games played</p>
                    <p className="text-sm">
                      Most wins: <span className="font-medium text-green-600">{trend.mostWins}</span>
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-2 gap-8 mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Game Duration Analysis</CardTitle>
              <CardDescription>Distribution of game lengths</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Under 1 hour</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={15} className="w-24 h-2" />
                    <span className="text-sm text-slate-600">15%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>1-2 hours</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={45} className="w-24 h-2" />
                    <span className="text-sm text-slate-600">45%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>2-3 hours</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={30} className="w-24 h-2" />
                    <span className="text-sm text-slate-600">30%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span>Over 3 hours</span>
                  <div className="flex items-center space-x-2">
                    <Progress value={10} className="w-24 h-2" />
                    <span className="text-sm text-slate-600">10%</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Win Distribution</CardTitle>
              <CardDescription>How evenly distributed are the wins?</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {playerStats.map((player) => (
                  <div key={player.name} className="flex justify-between items-center">
                    <span>{player.name}</span>
                    <div className="flex items-center space-x-2">
                      <Progress value={(player.wins / 47) * 100} className="w-24 h-2" />
                      <span className="text-sm text-slate-600">{((player.wins / 47) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
