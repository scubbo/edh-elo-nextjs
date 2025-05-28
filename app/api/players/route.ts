import { NextResponse } from 'next/server';
import { getAllPlayers, addPlayer } from '@/lib/db/queries';

export async function GET() {
  try {
    const players = await getAllPlayers();
    return NextResponse.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { name } = await request.json();
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    const player = await addPlayer(name);
    return NextResponse.json(player);
  } catch (error) {
    console.error('Error adding player:', error);
    return NextResponse.json(
      { error: 'Failed to add player' },
      { status: 500 }
    );
  }
} 