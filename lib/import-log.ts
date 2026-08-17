import prisma from '@/lib/db/client';
import type { SheetImportResult, SkippedRow } from '@/lib/sheet-import';

/** What asked for an import run. */
export type ImportTrigger = 'cron' | 'manual';

/**
 * How long a started-but-unfinished run is assumed to still be going. Vercel can
 * deliver the same scheduled run more than once, and two imports rebuilding the
 * history at the same time would each insert the games the other did. Past this
 * long the run cannot still be alive: it is shorter than the schedule's period
 * and longer than the function's own time limit.
 */
const ASSUME_STILL_RUNNING_FOR_MS = 10 * 60 * 1000;

/** One run of the import, as an admin needs to read it. */
export type ImportRunSummary = {
  id: number,
  startedAt: Date,
  finishedAt: Date | null,
  trigger: string,
  rowsRead: number,
  gamesDeleted: number,
  gamesInserted: number,
  gamesRemaining: number,
  rebuiltFrom: Date | null,
  skippedRows: SkippedRow[],
  warnings: string[],
  error: string | null
}

/**
 * Opens a run, or declines to when one is already in flight.
 *
 * The record is written before the work rather than after it so that a run
 * killed partway through — by the function's time limit, or by anything else
 * that leaves no chance to report — is still visible afterwards.
 */
export async function beginImportRun(
  trigger: ImportTrigger
): Promise<number | null> {
  const inFlight = await prisma.importRun.findFirst({
    where: {
      finishedAt: null,
      startedAt: { gt: new Date(Date.now() - ASSUME_STILL_RUNNING_FOR_MS) }
    },
    select: { id: true }
  });

  if (inFlight !== null) {
    console.log(`Import run ${inFlight.id} is still in flight; skipping this one`);
    return null;
  }

  const run = await prisma.importRun.create({
    data: { trigger },
    select: { id: true }
  });
  return run.id;
}

export async function recordSuccessfulImport(
  runId: number,
  result: SheetImportResult
): Promise<void> {
  await prisma.importRun.update({
    where: { id: runId },
    data: {
      finishedAt: new Date(),
      rowsRead: result.rowsRead,
      gamesDeleted: result.gamesDeleted,
      gamesInserted: result.gamesInserted,
      gamesRemaining: result.gamesRemaining,
      rebuiltFrom: result.rebuiltFrom,
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
  runId: number,
  error: unknown
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Sheet import run ${runId} failed:`, error);

  try {
    await prisma.importRun.update({
      where: { id: runId },
      data: { finishedAt: new Date(), error: message }
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
