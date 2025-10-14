import { NextResponse } from 'next/server';
import { getDeckDetails } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deckId = parseInt(id, 10);

    if (isNaN(deckId)) {
      return NextResponse.json(
        { error: 'Invalid deck ID' },
        { status: 400 }
      );
    }

    const deckDetails = await getDeckDetails(deckId);

    if (!deckDetails) {
      return NextResponse.json(
        { error: 'Deck not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(deckDetails);
  } catch (error) {
    console.error('Error fetching deck details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deck details' },
      { status: 500 }
    );
  }
}
