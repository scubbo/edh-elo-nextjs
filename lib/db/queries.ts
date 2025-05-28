import prisma from './client';

export interface Player {
  id: string;
  name: string;
  decks: Deck[];
}

export interface Deck {
  id: string;
  name: string;
  ownerId: string;
  elo: number;
  wins: number;
  losses: number;
  gamesPlayed: number;
  winRate: number | null;
}

export async function getAllPlayers(): Promise<Player[]> {
  const players = await prisma.player.findMany({
    include: {
      decks: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          elo: true,
          wins: true,
          losses: true,
          gamesPlayed: true,
          winRate: true,
        },
      },
    },
  });

  return players;
}

export async function addPlayer(name: string): Promise<Player> {
  const id = Date.now().toString();
  const player = await prisma.player.create({
    data: {
      id,
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
      elo: 'desc',
    },
  });

  return decks;
} 