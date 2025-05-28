import prisma from './client';

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