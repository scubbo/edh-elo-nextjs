import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function POST() {
  try {
    console.log('Setting up basic win types and formats...');

    // Create win types
    const winTypes = [
      { name: 'Elimination' },
      { name: 'Concession' },
      { name: 'Deck Out' },
      { name: 'Infinite Combo' },
      { name: 'Commander Damage' },
      { name: 'Combat Damage' },
      { name: '21+ Commander' }
    ];

    for (const winType of winTypes) {
      const existing = await prisma.winType.findFirst({ where: { name: winType.name } });
      if (!existing) {
        await prisma.winType.create({ data: winType });
        console.log(`Created win type: ${winType.name}`);
      } else {
        console.log(`Win type already exists: ${winType.name}`);
      }
    }

    // Create formats
    const formats = [
      { name: 'Commander' },
      { name: 'Brawl' },
      { name: 'Oathbreaker' }
    ];

    for (const format of formats) {
      const existing = await prisma.format.findFirst({ where: { name: format.name } });
      if (!existing) {
        await prisma.format.create({ data: format });
        console.log(`Created format: ${format.name}`);
      } else {
        console.log(`Format already exists: ${format.name}`);
      }
    }

    return NextResponse.json({ 
      message: 'Basic data setup complete!',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error setting up basic data:', error);
    return NextResponse.json(
      { error: 'Failed to setup basic data' },
      { status: 500 }
    );
  }
}
