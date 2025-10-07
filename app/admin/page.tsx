"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, CheckCircle, XCircle, Database, Sprout, Calculator } from "lucide-react"

interface OperationResult {
  success: boolean
  message: string
  timestamp: string
}

export default function AdminPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<OperationResult[]>([])

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

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Database Admin</h1>
        
        <div className="grid gap-6 md:grid-cols-3">
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
                <Sprout className="h-5 w-5 text-green-600" />
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
                <Calculator className="h-5 w-5 text-purple-600" />
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
