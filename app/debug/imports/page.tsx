import Link from "next/link"
import { AlertTriangle, ArrowLeft, CheckCircle, XCircle } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getRecentImportRuns, type ImportRunSummary } from "@/lib/import-log"
import { requireAdmin } from "@/lib/require-admin"

// The daily schedule is the main writer here, so a cached page would show an
// admin a stale answer to "did last night's import work?"
export const dynamic = "force-dynamic"

export default async function ImportHistoryPage() {
  await requireAdmin("/debug/imports")

  const runs = await getRecentImportRuns()

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
        <div>
          <Link
            href="/debug"
            className="inline-flex items-center text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to debug
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">Spreadsheet Imports</h1>
          <p className="text-slate-600">
            What each import run did, and any row it could not read
          </p>
        </div>

        {runs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-600">
              No import has run yet. Runs appear here once the daily schedule
              fires or an admin imports from the debug page.
            </CardContent>
          </Card>
        ) : (
          runs.map((run) => <ImportRunCard key={run.id} run={run} />)
        )}
      </div>
    </div>
  )
}

function ImportRunCard({ run }: { run: ImportRunSummary }) {
  const failed = run.error !== null
  const skipped = run.skippedRows.length
  const hasProblems = failed || skipped > 0 || run.warnings.length > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center space-x-2 text-lg">
              {failed ? (
                <XCircle className="h-5 w-5 text-red-600" />
              ) : hasProblems ? (
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-600" />
              )}
              <span>{run.startedAt.toISOString().replace("T", " ").slice(0, 19)} UTC</span>
            </CardTitle>
            <CardDescription>
              {failed
                ? "Ended early - nothing after the error was imported"
                : `Read ${run.rowsRead} row(s), imported ${run.gamesInserted} game(s)` +
                  (run.eloReplayedFrom
                    ? `, replayed ELO for ${run.gamesRescored} game(s) from ` +
                      `${run.eloReplayedFrom.toISOString().slice(0, 10)}`
                    : "")}
            </CardDescription>
          </div>
          <Badge variant="secondary">{run.trigger}</Badge>
        </div>
      </CardHeader>

      {hasProblems && (
        <CardContent className="space-y-4">
          {run.error !== null && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm font-medium text-red-900">Error</p>
              <p className="text-sm text-red-800 font-mono break-words">{run.error}</p>
            </div>
          )}

          {skipped > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">
                {skipped} row(s) skipped
              </p>
              {run.skippedRows.map((row, index) => (
                <div
                  key={`${row.sheetName}-${row.rowNumber}-${index}`}
                  className="rounded-md border border-amber-200 bg-amber-50 p-3"
                >
                  <p className="text-sm font-medium text-amber-900">
                    {row.sheetName} row {row.rowNumber}
                  </p>
                  <p className="text-sm text-amber-800">{row.reason}</p>
                  <p className="text-xs text-amber-700 font-mono mt-1 break-words">
                    {row.cells.filter((cell) => cell !== "").join(" | ")}
                  </p>
                </div>
              ))}
            </div>
          )}

          {run.warnings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-900">Stored data</p>
              {run.warnings.map((warning, index) => (
                <div
                  key={index}
                  className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"
                >
                  {warning}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
