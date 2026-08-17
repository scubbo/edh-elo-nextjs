import { NextResponse } from 'next/server';

import { describeImportResult, importGamesFromSheet } from '@/lib/sheet-import';

// A run scales with the size of the spreadsheet, well past the default limit
export const maxDuration = 60;

/**
 * Invoked on a schedule by Vercel Cron, which sends CRON_SECRET as a bearer
 * token. There is no user session on a scheduled request, so this is the only
 * credential available.
 *
 * An import large enough to need more than one invocation stops partway and
 * leaves the rest for the next run, so vercel.json schedules several runs an
 * hour apart rather than one. A schedule cannot be set from here — the plan
 * allows one run per entry per day, and only whole entries declared up front —
 * so the catch-up runs are standing appointments that usually find nothing to do.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('Refusing to run scheduled sheet import: CRON_SECRET is not set');
    return NextResponse.json(
      { error: 'Scheduled import is not configured' },
      { status: 500 }
    );
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await importGamesFromSheet('cron');

    // Vercel Cron can deliver the same scheduled run more than once, so a run
    // declining to start alongside another is expected, not a failure.
    if (result === null) {
      return NextResponse.json({ message: 'An import is already running' });
    }

    const summary = describeImportResult(result);
    console.log(`Scheduled sheet import finished: ${summary}`);
    return NextResponse.json({ message: summary, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
