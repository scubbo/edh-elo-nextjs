import { NextResponse } from 'next/server'
import { getGames } from '@/lib/db/queries'

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
