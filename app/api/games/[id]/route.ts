import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { validateMetadata } from '@/lib/utils';
import prisma from '@/lib/db/client';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const gameId = parseInt(id, 10);

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
        { status: 400 }
      );
    }

    const game = await prisma.game.findUnique({
      where: { id: gameId },
      include: {
        winType: true,
        format: true,
        scores: {
          include: {
            deck: {
              include: {
                owner: true
              }
            }
          }
        }
      }
    });

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error('Error fetching game details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch game details' },
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
    const gameId = parseInt(id, 10);

    if (isNaN(gameId)) {
      return NextResponse.json(
        { error: 'Invalid game ID' },
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

    // Check if game exists
    const existingGame = await prisma.game.findUnique({
      where: { id: gameId },
    });

    if (!existingGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    // Update metadata
    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: { metadata },
    });

    return NextResponse.json(updatedGame);
  } catch (error) {
    console.error('Error updating game metadata:', error);
    return NextResponse.json(
      { error: 'Failed to update game metadata' },
      { status: 500 }
    );
  }
}

