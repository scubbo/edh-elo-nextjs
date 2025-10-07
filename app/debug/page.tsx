"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Database, Trash2, AlertTriangle, RefreshCw } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface OperationResult {
  success: boolean
  message: string
  timestamp: string
}

interface DatabaseStats {
  games: number
  decks: number
  players: number
  winTypes: number
  formats: number
}

export default function DebugPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<OperationResult[]>([])
  const [stats, setStats] = useState<DatabaseStats | null>(null)
  const [isWipeDialogOpen, setIsWipeDialogOpen] = useState(false)

  const runOperation = async (endpoint: string, operationName: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setResults(prev => [...prev, {
          success: true,
          message: `${operationName}: ${data.message || 'Success'}`,
          timestamp: new Date().toLocaleString()
        }])
      } else {
        setResults(prev => [...prev, {
          success: false,
          message: `${operationName}: ${data.error || 'Failed'}`,
          timestamp: new Date().toLocaleString()
        }])
      }
    } catch (error) {
      setResults(prev => [...prev, {
        success: false,
        message: `${operationName}: ${error instanceof Error ? error.message : 'Network error'}`,
        timestamp: new Date().toLocaleString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/debug')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setResults(prev => [...prev, {
          success: true,
          message: `Database stats refreshed`,
          timestamp: new Date().toLocaleString()
        }])
      }
    } catch (error) {
      setResults(prev => [...prev, {
        success: false,
        message: `Failed to fetch stats: ${error instanceof Error ? error.message : 'Network error'}`,
        timestamp: new Date().toLocaleString()
      }])
    }
  }

  const wipeDatabase = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/wipe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()
      
      if (response.ok) {
        setResults(prev => [...prev, {
          success: true,
          message: `Database wiped: ${data.message || 'Success'}`,
          timestamp: new Date().toLocaleString()
        }])
        setStats(null) // Clear stats since database is empty
      } else {
        setResults(prev => [...prev, {
          success: false,
          message: `Database wipe failed: ${data.error || 'Failed'}`,
          timestamp: new Date().toLocaleString()
        }])
      }
    } catch (error) {
      setResults(prev => [...prev, {
        success: false,
        message: `Database wipe failed: ${error instanceof Error ? error.message : 'Network error'}`,
        timestamp: new Date().toLocaleString()
      }])
    } finally {
      setIsLoading(false)
      setIsWipeDialogOpen(false)
    }
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Debug & Database Management</h1>
        
        {/* Database Stats */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5 text-blue-600" />
              <span>Database Statistics</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.games}</div>
                  <div className="text-sm text-slate-600">Games</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.decks}</div>
                  <div className="text-sm text-slate-600">Decks</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{stats.players}</div>
                  <div className="text-sm text-slate-600">Players</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{stats.winTypes}</div>
                  <div className="text-sm text-slate-600">Win Types</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">{stats.formats}</div>
                  <div className="text-sm text-slate-600">Formats</div>
                </div>
              </div>
            ) : (
              <p className="text-slate-600">Click &quot;Refresh Stats&quot; to load database statistics</p>
            )}
            <div className="mt-4">
              <Button 
                onClick={fetchStats}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh Stats
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Operations */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Setup Basic Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span>Setup Basic Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Create win types and formats in the database
              </p>
              <Button 
                onClick={() => runOperation('setup', 'Setup Basic Data')}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Setup'}
              </Button>
            </CardContent>
          </Card>

          {/* Seed Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-green-600" />
                <span>Seed Data</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Import games and players from Google Sheets
              </p>
              <Button 
                onClick={() => runOperation('seed', 'Seed Data')}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run Seeding'}
              </Button>
            </CardContent>
          </Card>

          {/* Calculate ELO */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <RefreshCw className="h-5 w-5 text-purple-600" />
                <span>Calculate ELO</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                Back-calculate ELO scores for all games
              </p>
              <Button 
                onClick={() => runOperation('init', 'Calculate ELO')}
                disabled={isLoading}
                className="w-full"
                variant="outline"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Run ELO Calc'}
              </Button>
            </CardContent>
          </Card>

          {/* Wipe Database */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-red-600">
                <Trash2 className="h-5 w-5 text-red-600" />
                <span>Wipe Database</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600 mb-4">
                <strong className="text-red-600">DANGER:</strong> This will permanently delete all data
              </p>
              <Dialog open={isWipeDialogOpen} onOpenChange={setIsWipeDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    disabled={isLoading}
                    className="w-full bg-red-600 hover:bg-red-700"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Wipe Database
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      <span>Confirm Database Wipe</span>
                    </DialogTitle>
                    <DialogDescription>
                      This action will permanently delete ALL data from the database including:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>All games and their ELO scores</li>
                        <li>All players and decks</li>
                        <li>All win types and formats</li>
                      </ul>
                      <strong className="text-red-600">This action cannot be undone!</strong>
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsWipeDialogOpen(false)}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={wipeDatabase}
                      disabled={isLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Wipe Database'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Operation Results</CardTitle>
                <Button onClick={clearResults} variant="outline" size="sm">
                  Clear
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {results.map((result, index) => (
                  <div key={index} className="flex items-center space-x-3 p-3 bg-slate-50 rounded-lg">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium">{result.message}</p>
                      <p className="text-xs text-slate-500">{result.timestamp}</p>
                    </div>
                    <Badge variant={result.success ? "default" : "destructive"}>
                      {result.success ? "Success" : "Error"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
