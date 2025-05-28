import { NextResponse } from 'next/server'
import { getGames, addGame } from '@/lib/db/queries'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    if (dateParam) {
      const date = new Date(dateParam)
      if (isNaN(date.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Please use ISO format (YYYY-MM-DD)' },
          { status: 400 }
        )
      }
      const games = await getGames(date)
      return NextResponse.json(games)
    }

    const games = await getGames()
    return NextResponse.json(games)
  } catch (error) {
    console.error('Error fetching games:', error)
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      date,
      deckIds,
      winningDeckIds,
      numberOfTurns,
      firstPlayerOutTurn,
      winTypeId,
      formatId,
      description
    } = body

    // Validate required fields
    if (!date || !deckIds || !winningDeckIds || !numberOfTurns || 
        !firstPlayerOutTurn || !winTypeId || !formatId || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate date format
    const gameDate = new Date(date)
    if (isNaN(gameDate.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Please use ISO format' },
        { status: 400 }
      )
    }

    // Validate arrays
    if (!Array.isArray(deckIds) || !Array.isArray(winningDeckIds)) {
      return NextResponse.json(
        { error: 'deckIds and winningDeckIds must be arrays' },
        { status: 400 }
      )
    }

    // Validate that all winning decks are in the participants list
    const invalidWinners = winningDeckIds.filter(id => !deckIds.includes(id))
    if (invalidWinners.length > 0) {
      return NextResponse.json(
        { error: 'All winning deck IDs must be in the participants list' },
        { status: 400 }
      )
    }

    const game = await addGame({
      date: gameDate,
      deckIds,
      winningDeckIds,
      numberOfTurns,
      firstPlayerOutTurn,
      winTypeId,
      formatId,
      description
    })

    return NextResponse.json(game)
  } catch (error) {
    console.error('Error creating game:', error)
    return NextResponse.json(
      { error: 'Failed to create game' },
      { status: 500 }
    )
  }
} 