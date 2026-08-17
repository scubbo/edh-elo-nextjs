import prisma from '@/lib/db/client';
import type { SheetImportResult, SkippedRow } from '@/lib/sheet-import';

/** What asked for an import run. */
export type ImportTrigger = 'cron' | 'manual';

/** One run of the import, as an admin needs to read it. */
export type ImportRunSummary = {
  id: number,
  startedAt: Date,
  trigger: string,
  rowsRead: number,
  gamesInserted: number,
  gamesRescored: number,
  eloReplayedFrom: Date | null,
  skippedRows: SkippedRow[],
  warnings: string[],
  error: string | null
}

export async function recordSuccessfulImport(
  trigger: ImportTrigger,
  result: SheetImportResult
): Promise<void> {
  await prisma.importRun.create({
    data: {
      trigger,
      rowsRead: result.rowsRead,
      gamesInserted: result.gamesInserted,
      gamesRescored: result.gamesRescored,
      eloReplayedFrom: result.eloReplayedFrom,
      skippedRows: result.skippedRows,
      warnings: result.warnings
    }
  });
}

/**
 * Records a run that ended before it finished. The error is the whole point of
 * the record, so failing to store it must not be what hides it: it is logged
 * either way.
 */
export async function recordFailedImport(
  trigger: ImportTrigger,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sheet import (${trigger}) failed:`, error);

  try {
    await prisma.importRun.create({
      data: { trigger, error: message }
    });
  } catch (recordingError) {
    console.error('Could not record the failed import run:', recordingError);
  }
}

export async function getRecentImportRuns(limit = 20): Promise<ImportRunSummary[]> {
  const runs = await prisma.importRun.findMany({
    orderBy: { startedAt: 'desc' },
    take: limit
  });

  return runs.map((run) => ({
    ...run,
    skippedRows: (run.skippedRows ?? []) as unknown as SkippedRow[],
    warnings: (run.warnings ?? []) as unknown as string[]
  }));
}
