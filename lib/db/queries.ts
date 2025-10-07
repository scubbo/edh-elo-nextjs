import prisma from './client';

// ELO Rating System Constants
const ELO_K_FACTOR = 24; // Controls how much ratings change after each game. Higher is more volatile.
const ELO_STARTING_SCORE = 1000; // Starting ELO score for new decks

export interface Player {
  id: number;
  name: string;
  decks: Deck[];
}

export interface Deck {
  id: number;
  name: string;
  ownerId: number;
}

export interface Game {
  id: number;
  date: Date;
  deckIds: number[];
  winningDeckIds: number[];
  numberOfTurns: number;
  firstPlayerOutTurn: number;
  winTypeId: number;
  formatId: number;
  description: string;
  winType: { id: number; name: string };
  format: { id: number; name: string };
  scores: {
    id: number;
    date: Date;
    score: number;
    deck: {
      id: number;
      name: string;
      owner: {
        id: number;
        name: string;
      };
    };
  }[];
}

export type CreateGameInput = {
  date: Date;
  deckIds: number[];
  winningDeckIds: number[];
  numberOfTurns: number;
  firstPlayerOutTurn: number;
  winTypeId: number;
  formatId: number;
  description: string;
}

export async function getAllPlayers(): Promise<Player[]> {
  const players = await prisma.player.findMany({
    include: {
      decks: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
    },
  });

  return players;
}

export async function addPlayer(name: string): Promise<Player> {
  const player = await prisma.player.create({
    data: {
      name,
    },
    include: {
      decks: true,
    },
  });

  return player;
}

export async function getAllDecks(): Promise<Deck[]> {
  const decks = await prisma.deck.findMany({
    orderBy: {
      id: 'asc',
    },
  });

  return decks;
}

export async function getGames(date?: Date): Promise<Game[]> {
  const where = date ? {
    date: {
      gte: new Date(date.setHours(0, 0, 0, 0)),
      lt: new Date(date.setHours(23, 59, 59, 999))
    }
  } : {};

  const games = await prisma.game.findMany({
    where,
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
        },
        orderBy: {
          date: 'desc'
        }
      }
    },
    orderBy: {
      date: 'desc'
    }
  });

  return games;
}

export async function addGame(input: CreateGameInput): Promise<Game> {
  const game = await prisma.game.create({
    data: {
      date: input.date,
      deckIds: input.deckIds,
      winningDeckIds: input.winningDeckIds,
      numberOfTurns: input.numberOfTurns,
      firstPlayerOutTurn: input.firstPlayerOutTurn,
      winTypeId: input.winTypeId,
      formatId: input.formatId,
      description: input.description
    },
    include: {
      winType: true,
      format: true
    }
  });

  // Calculate and store ELO scores for this game
  await calculateAndStoreEloScores(game.id);

  // Return the game with updated scores
  return await prisma.game.findUnique({
    where: { id: game.id },
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
        },
        orderBy: {
          date: 'desc'
        }
      }
    }
  }) as Game;
}

// ELO Calculation Functions
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function calculateNewRating(currentRating: number, actualScore: number, expectedScore: number): number {
  return Math.round(currentRating + ELO_K_FACTOR * (actualScore - expectedScore));
}

async function getCurrentEloScore(deckId: number): Promise<number> {
  const latestScore = await prisma.eloScore.findFirst({
    where: { deckId },
    orderBy: { date: 'desc' }
  });
  return latestScore?.score ?? ELO_STARTING_SCORE;
}

export async function calculateAndStoreEloScores(gameId: number): Promise<void> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      scores: {
        include: {
          deck: true
        }
      }
    }
  });

  if (!game) {
    throw new Error(`Game with id ${gameId} not found`);
  }

  // Get current ELO scores for all participating decks
  const deckScores = new Map<number, number>();
  for (const deckId of game.deckIds) {
    deckScores.set(deckId, await getCurrentEloScore(deckId));
  }

  // Calculate new ELO scores for each deck
  const newScores = new Map<number, number>();
  
  for (const deckId of game.deckIds) {
    const currentRating = deckScores.get(deckId)!;
    const isWinner = game.winningDeckIds.includes(deckId);
    const actualScore = isWinner ? 1 : 0;
    
    // Calculate expected score against all other decks
    let totalExpectedScore = 0;
    for (const otherDeckId of game.deckIds) {
      if (otherDeckId !== deckId) {
        const otherRating = deckScores.get(otherDeckId)!;
        totalExpectedScore += calculateExpectedScore(currentRating, otherRating);
      }
    }
    
    const averageExpectedScore = totalExpectedScore / (game.deckIds.length - 1);
    const newRating = calculateNewRating(currentRating, actualScore, averageExpectedScore);
    newScores.set(deckId, newRating);
  }

  // Store new ELO scores
  for (const [deckId, newScore] of newScores) {
    await prisma.eloScore.create({
      data: {
        deckId,
        gameId,
        score: newScore,
        date: game.date
      }
    });
  }
}

export async function getDecksWithStats(): Promise<Array<{
  id: number;
  name: string;
  ownerId: number;
  owner: { id: number; name: string };
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number;
}>> {
  const decks = await prisma.deck.findMany({
    include: {
      owner: true,
      scores: {
        orderBy: { date: 'desc' },
        take: 1
      }
    }
  });

  const deckStats = await Promise.all(decks.map(async (deck) => {
    // Get current ELO score
    const currentElo = deck.scores[0]?.score ?? ELO_STARTING_SCORE;

    // Count wins and losses
    const games = await prisma.game.findMany({
      where: {
        deckIds: { has: deck.id }
      }
    });

    const wins = games.filter(game => game.winningDeckIds.includes(deck.id)).length;
    const losses = games.length - wins;
    const gamesPlayed = games.length;
    const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;

    return {
      id: deck.id,
      name: deck.name,
      ownerId: deck.ownerId,
      owner: {
        id: deck.owner.id,
        name: deck.owner.name
      },
      elo: currentElo,
      wins,
      losses,
      gamesPlayed,
      winRate
    };
  }));

  return deckStats.sort((a, b) => b.elo - a.elo);
}

export async function backCalculateAllEloScores(): Promise<void> {
  console.log('Starting ELO back-calculation for all games...');
  
  // Get all games in chronological order
  const games = await prisma.game.findMany({
    orderBy: { date: 'asc' }
  });

  // Clear existing ELO scores
  await prisma.eloScore.deleteMany({});

  // Recalculate ELO scores for each game
  for (const game of games) {
    await calculateAndStoreEloScores(game.id);
    console.log(`Processed game ${game.id} from ${game.date.toISOString()}`);
  }

  console.log(`Completed ELO back-calculation for ${games.length} games`);
} 