import { NextResponse } from 'next/server'
import prisma from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { gameId } = body

    if (!gameId || typeof gameId !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid gameId' },
        { status: 400 }
      )
    }

    // Find the game to get its date
    const referenceGame = await prisma.game.findUnique({
      where: { id: gameId },
      select: { date: true }
    })

    if (!referenceGame) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      )
    }

    // Find all games with dates after this game
    const gamesToDelete = await prisma.game.findMany({
      where: {
        date: {
          gt: referenceGame.date
        }
      },
      select: {
        id: true
      }
    })

    const gameIdsToDelete = gamesToDelete.map(g => g.id)

    if (gameIdsToDelete.length === 0) {
      return NextResponse.json({
        message: 'No games found to delete',
        deletedCount: 0
      })
    }

    // Delete EloScores associated with these games first
    await prisma.eloScore.deleteMany({
      where: {
        gameId: {
          in: gameIdsToDelete
        }
      }
    })

    // Delete the games
    await prisma.game.deleteMany({
      where: {
        id: {
          in: gameIdsToDelete
        }
      }
    })

    return NextResponse.json({
      message: `Successfully deleted ${gameIdsToDelete.length} game(s) and their ELO scores`,
      deletedCount: gameIdsToDelete.length
    })
  } catch (error) {
    console.error('Error deleting games:', error)
    return NextResponse.json(
      { error: 'Failed to delete games' },
      { status: 500 }
    )
  }
}
