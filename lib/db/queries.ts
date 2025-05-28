import db from './setup';

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
  winRate: number;
}

export async function getAllPlayers(): Promise<Player[]> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const players = db.prepare('SELECT * FROM players').all() as { id: string; name: string }[];
  
  return players.map(player => {
    const decks = db.prepare(`
      SELECT 
        id,
        name,
        owner_id as ownerId,
        elo,
        wins,
        losses,
        games_played as gamesPlayed,
        ROUND((wins * 100.0 / games_played), 1) as winRate
      FROM decks 
      WHERE owner_id = ?
    `).all(player.id) as Deck[];
    
    return {
      ...player,
      decks
    };
  });
}

export async function addPlayer(name: string): Promise<Player> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  const id = Date.now().toString();
  db.prepare('INSERT INTO players (id, name) VALUES (?, ?)').run(id, name);
  
  return {
    id,
    name,
    decks: []
  };
}

export async function getAllDecks(): Promise<Deck[]> {
  if (!db) {
    throw new Error('Database not initialized');
  }

  return db.prepare(`
    SELECT 
      id,
      name,
      owner_id as ownerId,
      elo,
      wins,
      losses,
      games_played as gamesPlayed,
      ROUND((wins * 100.0 / games_played), 1) as winRate
    FROM decks
    ORDER BY elo DESC
  `).all() as Deck[];
} 