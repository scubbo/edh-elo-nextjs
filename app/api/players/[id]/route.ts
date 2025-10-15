import { NextResponse } from 'next/server';
import { getPlayerDetails } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const playerId = parseInt(id, 10);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const playerDetails = await getPlayerDetails(playerId);

    if (!playerDetails) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(playerDetails);
  } catch (error) {
    console.error('Error fetching player details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch player details' },
      { status: 500 }
    );
  }
}
