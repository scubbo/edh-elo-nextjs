import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

// This ensures the code only runs on the server
if (typeof window === 'undefined') {
  // Ensure the data directory exists
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  const dbPath = path.join(dataDir, 'edh-elo.db');
  db = new Database(dbPath);

  // Initialize the database with tables
  function initializeDatabase() {
    if (!db) return;

    // Create players table
    db.exec(`
      CREATE TABLE IF NOT EXISTS players (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL
      )
    `);

    // Create decks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS decks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        elo INTEGER NOT NULL DEFAULT 1500,
        wins INTEGER NOT NULL DEFAULT 0,
        losses INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (owner_id) REFERENCES players(id)
      )
    `);

    // Insert test data if tables are empty
    const playerCount = (db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number }).count;
    if (playerCount === 0) {
      const insertPlayer = db.prepare('INSERT INTO players (id, name) VALUES (?, ?)');
      const insertDeck = db.prepare(`
        INSERT INTO decks (id, name, owner_id, elo, wins, losses, games_played)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      // Insert test players
      insertPlayer.run('1', 'Alice');
      insertPlayer.run('2', 'Bob');
      insertPlayer.run('3', 'Charlie');
      insertPlayer.run('4', 'Dave');

      // Insert test decks
      insertDeck.run('1-1', 'Meren of Clan Nel Toth', '1', 1650, 15, 10, 25);
      insertDeck.run('1-2', 'Krenko, Mob Boss', '1', 1580, 8, 7, 15);
      insertDeck.run('2-1', 'Atraxa, Praetors\' Voice', '2', 1720, 20, 8, 28);
      insertDeck.run('2-2', 'Edgar Markov', '2', 1520, 5, 7, 12);
      insertDeck.run('3-1', 'Muldrotha, the Gravetide', '3', 1580, 12, 10, 22);
      insertDeck.run('4-1', 'The Ur-Dragon', '4', 1520, 10, 15, 25);
    }
  }

  // Initialize the database
  initializeDatabase();
}

export default db; 