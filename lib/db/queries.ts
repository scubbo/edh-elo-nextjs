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
      format: true
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

  return game;
} 