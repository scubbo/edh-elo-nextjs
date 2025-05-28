import { NextResponse } from 'next/server';
import { getAllDecks } from '@/lib/db/queries';

export async function GET() {
  try {
    const decks = await getAllDecks();
    return NextResponse.json(decks);
  } catch (error) {
    console.error('Error fetching decks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch decks' },
      { status: 500 }
    );
  }
} 