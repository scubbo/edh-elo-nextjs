import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const gameCount = await prisma.game.count();
    const deckCount = await prisma.deck.count();
    const playerCount = await prisma.player.count();
    const winTypeCount = await prisma.winType.count();
    const formatCount = await prisma.format.count();

    const stats = {
      games: gameCount,
      decks: deckCount,
      players: playerCount,
      winTypes: winTypeCount,
      formats: formatCount
    };

    if (gameCount > 0) {
      const sampleGame = await prisma.game.findFirst({
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
      return NextResponse.json({ ...stats, sampleGame });
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { error: 'Failed to check database' },
      { status: 500 }
    );
  }
}
