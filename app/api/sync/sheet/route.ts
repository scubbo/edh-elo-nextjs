import { NextResponse } from 'next/server';

import { importGamesFromSheet } from '@/lib/sheet-import';

// A run scales with the size of the spreadsheet, well past the default limit
export const maxDuration = 60;

/**
 * Invoked on a schedule by Vercel Cron, which sends CRON_SECRET as a bearer
 * token. There is no user session on a scheduled request, so this is the only
 * credential available.
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
    console.log('Scheduled sheet import finished', result);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
