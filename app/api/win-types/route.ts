import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const winTypes = await prisma.winType.findMany({
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(winTypes);
  } catch (error) {
    console.error('Error fetching win types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch win types' },
      { status: 500 }
    );
  }
}
