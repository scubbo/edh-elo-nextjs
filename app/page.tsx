import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Trophy, Users, BarChart3, Plus, TrendingUp } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      {/* <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Trophy className="h-8 w-8 text-amber-600" />
              <h1 className="text-2xl font-bold text-slate-900">EDH ELO Tracker</h1>
            </div>
            <nav className="flex items-center space-x-4">
              <Link href="/players">
                <Button variant="ghost">Players</Button>
              </Link>
              <Link href="/games">
                <Button variant="ghost">Games</Button>
              </Link>
              <Link href="/stats">
                <Button variant="ghost">Statistics</Button>
              </Link>
              <Link href="/games/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Game
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header> */}

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold text-slate-900 mb-6">Track Your Commander Games</h2>
          <p className="text-xl text-slate-600 mb-8">
            Keep score, track statistics, and see how your EDH group performs over time. Built for competitive Commander
            players who want to track their progress.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/games/new">
              <Button size="lg" className="bg-amber-600 hover:bg-amber-700">
                <Plus className="h-5 w-5 mr-2" />
                Record New Game
              </Button>
            </Link>
            <Link href="/stats">
              <Button size="lg" variant="outline">
                <BarChart3 className="h-5 w-5 mr-2" />
                View Statistics
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Users className="h-6 w-6 text-blue-600" />
                <CardTitle>Player Management</CardTitle>
              </div>
              <CardDescription>
                Add and manage players in your EDH group. Track individual performance and statistics.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/players">
                <Button variant="outline" className="w-full">
                  Manage Players
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <Trophy className="h-6 w-6 text-amber-600" />
                <CardTitle>Game Tracking</CardTitle>
              </div>
              <CardDescription>
                Record game results, track wins and losses, and maintain a complete game history.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/games">
                <Button variant="outline" className="w-full">
                  View Games
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <CardTitle>ELO Rankings</CardTitle>
              </div>
              <CardDescription>
                Advanced ELO rating system to track skill progression and competitive rankings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/stats">
                <Button variant="outline" className="w-full">
                  View Rankings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-slate-900 mb-8">Recent Activity</h3>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Game #47</h4>
                    <p className="text-slate-600">Alice defeated Bob, Charlie, and Dave</p>
                    <p className="text-sm text-slate-500">2 hours ago</p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">New Player Added</h4>
                    <p className="text-slate-600">Eve joined the group</p>
                    <p className="text-sm text-slate-500">1 day ago</p>
                  </div>
                  <Badge variant="outline">Player</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">Game #46</h4>
                    <p className="text-slate-600">Charlie won against Alice, Bob, and Dave</p>
                    <p className="text-sm text-slate-500">3 days ago</p>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Trophy className="h-6 w-6 text-amber-400" />
              <span className="text-xl font-bold">EDH ELO Tracker</span>
            </div>
            <p className="text-slate-400">Track your Commander games and improve your play</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
