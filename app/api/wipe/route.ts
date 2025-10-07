import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function POST() {
  try {
    console.log('Starting database wipe...');

    // Delete all data in the correct order to respect foreign key constraints
    await prisma.eloScore.deleteMany();
    console.log('Deleted all ELO scores');

    await prisma.game.deleteMany();
    console.log('Deleted all games');

    await prisma.deck.deleteMany();
    console.log('Deleted all decks');

    await prisma.player.deleteMany();
    console.log('Deleted all players');

    await prisma.winType.deleteMany();
    console.log('Deleted all win types');

    await prisma.format.deleteMany();
    console.log('Deleted all formats');

    console.log('Database wipe completed successfully');
    
    return NextResponse.json({ 
      message: 'Database wiped successfully. All data has been permanently deleted.',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error wiping database:', error);
    return NextResponse.json(
      { error: `Database wipe failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  } finally {
    // Prisma client is managed by the singleton, no need to disconnect
  }
}
