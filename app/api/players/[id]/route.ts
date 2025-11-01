import { NextResponse } from 'next/server';
import { getPlayerDetails } from '@/lib/db/queries';
import { isAdmin } from '@/lib/auth';
import { validateMetadata } from '@/lib/utils';
import prisma from '@/lib/db/client';

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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check admin authorization
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const playerId = parseInt(id, 10);

    if (isNaN(playerId)) {
      return NextResponse.json(
        { error: 'Invalid player ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { metadata } = body;

    if (metadata === undefined) {
      return NextResponse.json(
        { error: 'metadata field is required' },
        { status: 400 }
      );
    }

    // Validate metadata
    const validation = validateMetadata(metadata);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    // Check if player exists
    const existingPlayer = await prisma.player.findUnique({
      where: { id: playerId },
    });

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Update metadata
    const updatedPlayer = await prisma.player.update({
      where: { id: playerId },
      data: { metadata },
    });

    return NextResponse.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update player metadata' },
      { status: 500 }
    );
  }
}
