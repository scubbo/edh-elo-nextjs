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

async function getCurrentEloScore(deckId: number, beforeGameId?: number): Promise<number> {
  // If we're calculating for a specific game, we need to find the most recent score
  // before that game, ordered by the game's date and then game ID
  if (beforeGameId !== undefined) {
    const currentGame = await prisma.game.findUnique({
      where: { id: beforeGameId },
      select: { date: true }
    });

    if (!currentGame) {
      throw new Error(`Game ${beforeGameId} not found`);
    }

    const latestScore = await prisma.eloScore.findFirst({
      where: {
        deckId,
        game: {
          OR: [
            { date: { lt: currentGame.date } },
            {
              AND: [
                { date: currentGame.date },
                { id: { lt: beforeGameId } }
              ]
            }
          ]
        }
      },
      include: {
        game: true
      },
      orderBy: [
        { game: { date: 'desc' } },
        { gameId: 'desc' }
      ]
    });

    return latestScore?.score ?? ELO_STARTING_SCORE;
  }

  // For current ELO (no specific game), just get the most recent
  const latestScore = await prisma.eloScore.findFirst({
    where: { deckId },
    include: {
      game: true
    },
    orderBy: [
      { game: { date: 'desc' } },
      { gameId: 'desc' }
    ]
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

  // Get current ELO scores for all participating decks (before this game)
  const deckScores = new Map<number, number>();
  for (const deckId of game.deckIds) {
    deckScores.set(deckId, await getCurrentEloScore(deckId, gameId));
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
  previousElo: number | null;
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
        take: 2  // Get current and previous
      }
    }
  });

  const deckStats = await Promise.all(decks.map(async (deck) => {
    // Get current and previous ELO scores
    const currentElo = deck.scores[0]?.score ?? ELO_STARTING_SCORE;
    const previousElo = deck.scores[1]?.score ?? null;

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
      previousElo,
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

export async function getDeckDetails(deckId: number) {
  const deck = await prisma.deck.findUnique({
    where: { id: deckId },
    include: {
      owner: true,
      scores: {
        include: {
          game: {
            include: {
              winType: true,
              format: true
            }
          }
        },
        orderBy: {
          date: 'asc'
        }
      }
    }
  });

  if (!deck) {
    return null;
  }

  // Get all games this deck participated in
  const games = await prisma.game.findMany({
    where: {
      deckIds: { has: deckId }
    },
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
        }
      }
    },
    orderBy: {
      date: 'asc'
    }
  });

  // Calculate stats
  const wins = games.filter(game => game.winningDeckIds.includes(deckId)).length;
  const gamesPlayed = games.length;
  const winRate = gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
  const currentElo = deck.scores[deck.scores.length - 1]?.score ?? ELO_STARTING_SCORE;

  // Build ELO history for chart
  const eloHistory = deck.scores.map(score => ({
    date: score.date,
    elo: score.score,
    gameId: score.game.id
  }));

  // Build game history with results
  const gameHistory = games.map(game => {
    const deckScore = deck.scores.find(s => s.game.id === game.id);
    const isWin = game.winningDeckIds.includes(deckId);

    return {
      id: game.id,
      date: game.date,
      isWin,
      eloAfter: deckScore?.score ?? ELO_STARTING_SCORE,
      format: game.format.name,
      winType: game.winType.name,
      numberOfTurns: game.numberOfTurns,
      opponents: game.scores
        .filter(s => s.deck.id !== deckId)
        .map(s => ({
          deckName: s.deck.name,
          playerName: s.deck.owner.name
        }))
    };
  });

  return {
    id: deck.id,
    name: deck.name,
    owner: {
      id: deck.owner.id,
      name: deck.owner.name
    },
    stats: {
      gamesPlayed,
      wins,
      losses: gamesPlayed - wins,
      winRate,
      currentElo
    },
    eloHistory,
    gameHistory
  };
}

export async function getStatistics() {
  // Get all games, players, and decks
  const [games, players, decks] = await Promise.all([
    prisma.game.findMany({
      include: {
        scores: {
          include: {
            deck: {
              include: {
                owner: true
              }
            }
          }
        }
      },
      orderBy: { date: 'desc' }
    }),
    prisma.player.findMany(),
    prisma.deck.findMany({
      include: {
        owner: true,
        scores: {
          orderBy: { date: 'desc' },
          take: 1
        }
      }
    })
  ]);

  // Calculate overview statistics
  const totalGames = games.length;
  const totalPlayers = players.length;
  const averageTurns = games.length > 0 
    ? Math.round(games.reduce((sum, game) => sum + game.numberOfTurns, 0) / games.length * 10) / 10
    : 0;
  
  // Find longest and shortest games by turn count
  const longestGame = games.length > 0 
    ? Math.max(...games.map(g => g.numberOfTurns))
    : 0;
  const shortestGame = games.length > 0 
    ? Math.min(...games.map(g => g.numberOfTurns))
    : 0;

  // Calculate most active player (by game appearances)
  const playerGameCounts = new Map<number, number>();
  games.forEach(game => {
    game.scores.forEach(score => {
      const playerId = score.deck.owner.id;
      playerGameCounts.set(playerId, (playerGameCounts.get(playerId) || 0) + 1);
    });
  });
  
  const mostActivePlayerId = Array.from(playerGameCounts.entries())
    .sort(([,a], [,b]) => b - a)[0]?.[0];
  const mostActivePlayer = mostActivePlayerId 
    ? players.find(p => p.id === mostActivePlayerId)?.name || 'Unknown'
    : 'None';

  // Calculate player performance stats (aggregated from their decks)
  const playerStats = players.map(player => {
    const playerDecks = decks.filter(deck => deck.ownerId === player.id);
    
    // Calculate aggregated stats across all decks
    const totalWins = playerDecks.reduce((sum, deck) => {
      const deckGames = games.filter(game => game.deckIds.includes(deck.id));
      return sum + deckGames.filter(game => game.winningDeckIds.includes(deck.id)).length;
    }, 0);
    
    const totalGamesPlayed = playerDecks.reduce((sum, deck) => {
      return sum + games.filter(game => game.deckIds.includes(deck.id)).length;
    }, 0);
    
    const winRate = totalGamesPlayed > 0 ? (totalWins / totalGamesPlayed) * 100 : 0;
    
    // Average ELO across all decks
    const averageElo = playerDecks.length > 0 
      ? Math.round(playerDecks.reduce((sum, deck) => {
          const currentElo = deck.scores[0]?.score ?? ELO_STARTING_SCORE;
          return sum + currentElo;
        }, 0) / playerDecks.length)
      : ELO_STARTING_SCORE;

    return {
      name: player.name,
      elo: averageElo,
      wins: totalWins,
      winRate: Math.round(winRate * 10) / 10,
      gamesPlayed: totalGamesPlayed
    };
  }).sort((a, b) => b.elo - a.elo);

  // Calculate recent trends
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const recentGames7 = games.filter(game => game.date >= sevenDaysAgo);
  const recentGames30 = games.filter(game => game.date >= thirtyDaysAgo);
  const recentGames90 = games.filter(game => game.date >= ninetyDaysAgo);

  // Calculate most winning player in each period
  const getMostWinningPlayer = (gameList: typeof games) => {
    const playerWinCounts = new Map<number, number>();
    gameList.forEach(game => {
      game.scores.forEach(score => {
        if (game.winningDeckIds.includes(score.deck.id)) {
          const playerId = score.deck.owner.id;
          playerWinCounts.set(playerId, (playerWinCounts.get(playerId) || 0) + 1);
        }
      });
    });
    
    const mostWinningPlayerId = Array.from(playerWinCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0];
    return mostWinningPlayerId 
      ? players.find(p => p.id === mostWinningPlayerId)?.name || 'Unknown'
      : 'None';
  };

  const recentTrends = [
    { period: "Last 7 days", games: recentGames7.length, mostWins: getMostWinningPlayer(recentGames7) },
    { period: "Last 30 days", games: recentGames30.length, mostWins: getMostWinningPlayer(recentGames30) },
    { period: "Last 90 days", games: recentGames90.length, mostWins: getMostWinningPlayer(recentGames90) }
  ];

  // Calculate turn count distribution
  const turnDistribution = {
    under8: games.filter(g => g.numberOfTurns < 8).length,
    between8and12: games.filter(g => g.numberOfTurns >= 8 && g.numberOfTurns < 12).length,
    between12and16: games.filter(g => g.numberOfTurns >= 12 && g.numberOfTurns < 16).length,
    over16: games.filter(g => g.numberOfTurns >= 16).length
  };

  // Calculate social dynamics - opponent analysis
  const opponentCounts = new Map<string, number>();
  const allPlayerPairs = new Set<string>();
  
  // Track all possible player pairs
  players.forEach(player1 => {
    players.forEach(player2 => {
      if (player1.id !== player2.id) {
        const pair = player1.id < player2.id 
          ? `${player1.name} & ${player2.name}`
          : `${player2.name} & ${player1.name}`;
        allPlayerPairs.add(pair);
      }
    });
  });

  // Count actual games played together
  games.forEach(game => {
    // Get player IDs from deckIds by looking up deck owners
    const gamePlayerIds = game.deckIds.map(deckId => {
      const deck = decks.find(d => d.id === deckId);
      return deck?.ownerId;
    }).filter(Boolean) as number[];
    
    const uniquePlayerIds = [...new Set(gamePlayerIds)];
    
    // Count all pairs in this game
    for (let i = 0; i < uniquePlayerIds.length; i++) {
      for (let j = i + 1; j < uniquePlayerIds.length; j++) {
        const player1 = players.find(p => p.id === uniquePlayerIds[i]);
        const player2 = players.find(p => p.id === uniquePlayerIds[j]);
        if (player1 && player2) {
          const pair = player1.id < player2.id 
            ? `${player1.name} & ${player2.name}`
            : `${player2.name} & ${player1.name}`;
          opponentCounts.set(pair, (opponentCounts.get(pair) || 0) + 1);
        }
      }
    }
  });

  // Most frequent opponents (top 10)
  const mostFrequentOpponents = Array.from(opponentCounts.entries())
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // All opponent pairs (for debugging/analysis)
  const allOpponentPairs = Array.from(opponentCounts.entries())
    .map(([pair, count]) => ({ pair, count }))
    .sort((a, b) => b.count - a.count);

  // Never-played pairings (players who have never been in the same game)
  const neverPlayedPairings = Array.from(allPlayerPairs)
    .filter(pair => !opponentCounts.has(pair))
    .sort();

  // Calculate deck play counts for histogram
  const deckPlayCounts = new Map<number, number>();
  games.forEach(game => {
    game.deckIds.forEach(deckId => {
      deckPlayCounts.set(deckId, (deckPlayCounts.get(deckId) || 0) + 1);
    });
  });

  // Create histogram data (bins for different play count ranges)
  const playCountHistogram = {
    "1 game": 0,
    "2 games": 0,
    "3 games": 0,
    "4 games": 0,
    "5 games": 0,
    "6-10 games": 0,
    "11-20 games": 0,
    "21-30 games": 0,
    "31-50 games": 0,
    "50+ games": 0
  };

  deckPlayCounts.forEach(count => {
    if (count === 1) {
      playCountHistogram["1 game"]++;
    } else if (count === 2) {
      playCountHistogram["2 games"]++;
    } else if (count === 3) {
      playCountHistogram["3 games"]++;
    } else if (count === 4) {
      playCountHistogram["4 games"]++;
    } else if (count === 5) {
      playCountHistogram["5 games"]++;
    } else if (count <= 10) {
      playCountHistogram["6-10 games"]++;
    } else if (count <= 20) {
      playCountHistogram["11-20 games"]++;
    } else if (count <= 30) {
      playCountHistogram["21-30 games"]++;
    } else if (count <= 50) {
      playCountHistogram["31-50 games"]++;
    } else {
      playCountHistogram["50+ games"]++;
    }
  });

  return {
    overview: {
      totalGames,
      totalPlayers,
      averageTurns,
      mostActivePlayer,
      longestGame,
      shortestGame
    },
    playerStats,
    recentTrends,
    turnDistribution,
    playCountHistogram,
    socialDynamics: {
      mostFrequentOpponents,
      neverPlayedPairings,
      allOpponentPairs,
      allPlayers: players.map(p => p.name).sort()
    }
  };
} 