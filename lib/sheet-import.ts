import { google } from 'googleapis';

import prisma from '@/lib/db/client';
import { calculateAndStoreEloScores } from '@/lib/db/queries';
import {
  beginImportRun,
  recordFailedImport,
  recordSuccessfulImport,
  type ImportTrigger
} from '@/lib/import-log';
import {
  describeStoredGames,
  parseSheetRows,
  rebuildFromIndex,
  type ParsedGameInfo,
  type PlayerDeckNames,
  type SheetRowProblem
} from '@/lib/sheet-sync';

/** A row the import could not use, located in the sheet it came from. */
export type SkippedRow = {
  sheetName: string,
  /** Row number as the spreadsheet shows it, so the row can be found and fixed. */
  rowNumber: number,
  reason: string,
  cells: string[]
}

export type SheetImportResult = {
  rowsRead: number,
  gamesParsed: number,
  /** Stored games discarded because the spreadsheet no longer agreed with them. */
  gamesDeleted: number,
  gamesInserted: number,
  /** Games this run ran out of time to import, left for the next one. */
  gamesRemaining: number,
  /** The date of the earliest game rebuilt, when any history was rebuilt. */
  rebuiltFrom: Date | null,
  skippedRows: SkippedRow[],
  /** Problems with data already stored, found while comparing it to the sheet. */
  warnings: string[]
}

/**
 * How long the import will keep importing games before stopping of its own
 * accord. Comfortably inside the function's own time limit, so that a run with
 * more games than fit in one invocation ends by choosing to and can report what
 * it left behind, rather than being killed mid-game with nothing to show.
 */
const TIME_BUDGET_MS = 45 * 1000;

/**
 * Brings the database up to date with the spreadsheet, and records what the run
 * did where an admin can read it.
 *
 * Returns null when another run is already in flight, having done nothing.
 *
 * Safe to run repeatedly, and safe to be cut short: every game it imports is
 * fully scored before the next is started, so the database is always a complete
 * prefix of the spreadsheet and the next run simply carries on from the end of
 * it.
 */
export async function importGamesFromSheet(
  trigger: ImportTrigger,
  { budgetMs = TIME_BUDGET_MS }: { budgetMs?: number } = {}
): Promise<SheetImportResult | null> {
  const runId = await beginImportRun(trigger);
  if (runId === null) {
    return null;
  }

  let result: SheetImportResult;
  try {
    result = await runImport(Date.now() + budgetMs);
  } catch (error) {
    await recordFailedImport(runId, error);
    throw error;
  }

  await recordSuccessfulImport(runId, result);
  return result;
}

/** One line saying what a run did, for a log line or an API response. */
export function describeImportResult(result: SheetImportResult): string {
  const parts = [
    `imported ${result.gamesInserted} game(s) from ` +
    `${result.gamesParsed} spreadsheet row(s)`
  ];

  if (result.rebuiltFrom !== null) {
    parts.push(
      `discarded ${result.gamesDeleted} stored game(s) from ` +
      `${result.rebuiltFrom.toISOString().slice(0, 10)} onwards that the ` +
      `spreadsheet no longer agreed with`
    );
  }
  if (result.gamesRemaining > 0) {
    parts.push(`${result.gamesRemaining} game(s) left for the next run`);
  }
  if (result.skippedRows.length > 0) {
    parts.push(`${result.skippedRows.length} row(s) skipped - see /debug/imports`);
  }

  return parts.join('; ');
}

async function runImport(deadline: number): Promise<SheetImportResult> {
  const rows = await readGoogleSheet();
  const { games: sheetGames, problems } = parseSheetRows(rows.map((row) => row.cells));
  const skippedRows = problems.map((problem) => locateProblem(problem, rows));

  for (const skipped of skippedRows) {
    console.warn(
      `Skipped ${skipped.sheetName} row ${skipped.rowNumber}: ${skipped.reason}`
    );
  }

  const [storedGames, decks] = await Promise.all([
    // In the order the games were played, which is the order the spreadsheet
    // describes them in and the order their ratings were accumulated in.
    prisma.game.findMany({
      orderBy: [{ date: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        date: true,
        deckIds: true,
        winningDeckIds: true,
        numberOfTurns: true,
        firstPlayerOutTurn: true,
        description: true,
        winType: { select: { name: true } },
        format: { select: { name: true } },
        // Only whether the game was rated at all matters, so one is enough.
        scores: { select: { id: true }, take: 1 }
      }
    }),
    prisma.deck.findMany({
      select: { id: true, name: true, owner: { select: { name: true } } }
    })
  ]);

  const deckIdentities = new Map<number, PlayerDeckNames>(
    decks.map((deck) => [deck.id, { playerName: deck.owner.name, deckName: deck.name }])
  );

  const { games: describedStoredGames, problems: warnings } = describeStoredGames(
    storedGames.map((game) => ({
      ...game,
      winType: game.winType.name,
      format: game.format.name,
      rated: game.scores.length > 0
    })),
    deckIdentities
  );

  for (const warning of warnings) {
    console.warn(warning);
  }

  // From the first game the spreadsheet no longer agrees with, nothing stored can
  // be trusted: ratings accumulate through every game, so an edited or deleted
  // row leaves every rating after it wrong. That history is discarded and read
  // afresh from the spreadsheet.
  const divergence = rebuildFromIndex(describedStoredGames, sheetGames);
  const staleGames = storedGames.slice(divergence);
  await discardGames(staleGames.map((game) => game.id));

  const gamesToImport = sheetGames.slice(divergence);
  let gamesInserted = 0;

  for (const game of gamesToImport) {
    if (Date.now() > deadline) {
      console.log(
        `Out of time with ${gamesToImport.length - gamesInserted} game(s) still ` +
        `to import; the next run will carry on from here`
      );
      break;
    }
    await insertGame(game);
    gamesInserted++;
  }

  return {
    rowsRead: rows.length,
    gamesParsed: sheetGames.length,
    gamesDeleted: staleGames.length,
    gamesInserted,
    gamesRemaining: gamesToImport.length - gamesInserted,
    rebuiltFrom: staleGames.length > 0 ? staleGames[0].date : null,
    skippedRows,
    warnings
  };
}

/**
 * Removes games along with the ratings computed from them. A rating references
 * the game it came from and the schema does not cascade, so the ratings have to
 * go first.
 */
async function discardGames(gameIds: number[]): Promise<void> {
  if (gameIds.length === 0) {
    return;
  }

  await prisma.eloScore.deleteMany({ where: { gameId: { in: gameIds } } });
  await prisma.game.deleteMany({ where: { id: { in: gameIds } } });
  console.log(
    `Discarded ${gameIds.length} game(s) the spreadsheet no longer agrees with`
  );
}

/**
 * Puts a problem back where it came from. Rows are flattened across the
 * spreadsheet's tabs before parsing, so the parser can only report a position
 * in that flattened list; the sheet name and row number a human needs are
 * recovered here.
 */
function locateProblem(problem: SheetRowProblem, rows: SheetRow[]): SkippedRow {
  const { sheetName, rowNumber } = rows[problem.rowIndex];
  return { sheetName, rowNumber, reason: problem.reason, cells: problem.cells };
}

/**
 * Stores one game and the ratings it produces.
 *
 * Scoring happens here rather than in a pass over all the imported games so that
 * every game is complete the moment it is stored: a run cut short leaves no
 * half-imported game behind, and a deck appears in the UI as soon as its first
 * game does.
 */
async function insertGame(parsedGameInfo: ParsedGameInfo) {
  const processedParticipants = await Promise.all(
    parsedGameInfo.participants.map(async (participant) => {
      const player = await findOrCreatePlayer(participant.playerName);
      const deck = await findOrCreateDeck(participant.deckName, player.id);
      return {
        playerId: player.id,
        playerName: player.name,
        deckId: deck.id,
        deckName: deck.name
      };
    })
  );

  const processedWinners = parsedGameInfo.winners.map((winner) => {
    const processedParticipant = processedParticipants.find(
      p => p.playerName === winner.playerName && p.deckName === winner.deckName
    );
    if (!processedParticipant) {
      throw new Error(`Participant ${winner.playerName} ${winner.deckName} not found in processed participants`);
    }
    return processedParticipant;
  });

  const [winType, format] = await Promise.all([
    findOrCreateWinType(parsedGameInfo.winType),
    findOrCreateFormat(parsedGameInfo.format)
  ]);

  const newGame = await prisma.game.create({
    data: {
      date: parsedGameInfo.date,
      deckIds: processedParticipants.map(p => p.deckId),
      winningDeckIds: processedWinners.map(p => p.deckId),
      numberOfTurns: parsedGameInfo.numberOfTurns,
      firstPlayerOutTurn: parsedGameInfo.firstPlayerOutTurn,
      winTypeId: winType.id,
      formatId: format.id,
      description: parsedGameInfo.description || 'No description'
    }
  });

  await calculateAndStoreEloScores(newGame.id);

  console.log(`Imported game ${newGame.id} for date ${newGame.date.toISOString()}, deckIds: ${newGame.deckIds.join(', ')}, winningDeckIds: ${newGame.winningDeckIds.join(', ')}, description: ${newGame.description}`);
}

async function findOrCreatePlayer(name: string) {
  const existing = await prisma.player.findFirst({
    where: { name },
    select: { id: true, name: true }
  });
  if (existing) {
    return existing;
  }

  try {
    const created = await prisma.player.create({
      data: { name },
      select: { id: true, name: true }
    });
    console.log(`Created new player: ${created.name} (id: ${created.id})`);
    return created;
  } catch (error: unknown) {
    const concurrentlyCreated = await findExistingAfterUniqueViolation(
      error,
      () => prisma.player.findFirst({ where: { name }, select: { id: true, name: true } })
    );
    if (!concurrentlyCreated) {
      throw new Error(`Player not found: ${name}`);
    }
    return concurrentlyCreated;
  }
}

async function findOrCreateDeck(name: string, ownerId: number) {
  const existing = await prisma.deck.findFirst({
    where: { name, ownerId },
    select: { id: true, name: true }
  });
  if (existing) {
    return existing;
  }

  try {
    const created = await prisma.deck.create({
      data: { name, ownerId },
      select: { id: true, name: true }
    });
    console.log(`Created new deck: ${created.name} (id: ${created.id})`);
    return created;
  } catch (error: unknown) {
    const concurrentlyCreated = await findExistingAfterUniqueViolation(
      error,
      () => prisma.deck.findFirst({ where: { name, ownerId }, select: { id: true, name: true } })
    );
    if (!concurrentlyCreated) {
      throw new Error(`Deck not found: ${name} for owner ${ownerId}`);
    }
    return concurrentlyCreated;
  }
}

async function findOrCreateWinType(name: string) {
  const existing = await prisma.winType.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  if (existing) {
    return existing;
  }
  const created = await prisma.winType.create({ data: { name } });
  console.log(`Created missing win type: ${name}`);
  return created;
}

async function findOrCreateFormat(name: string) {
  const existing = await prisma.format.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  if (existing) {
    return existing;
  }
  const created = await prisma.format.create({ data: { name } });
  console.log(`Created missing format: ${name}`);
  return created;
}

/**
 * Recovers from another run creating the same record between our lookup and our
 * insert. Any other failure is the caller's to handle.
 */
async function findExistingAfterUniqueViolation<T>(
  error: unknown,
  find: () => Promise<T | null>
): Promise<T | null> {
  const isUniqueViolation =
    error && typeof error === 'object' && 'code' in error && error.code === 'P2002';
  if (!isUniqueViolation) {
    throw error;
  }
  console.log('Record was created concurrently; using the existing one');
  return find();
}

/** A spreadsheet row, tagged with where in the spreadsheet it was read from. */
type SheetRow = {
  sheetName: string,
  rowNumber: number,
  cells: string[]
}

async function readGoogleSheet(): Promise<SheetRow[]> {
  try {
    // Parse the credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS || '{}');
    const spreadsheetId = process.env.SPREADSHEET_ID;

    if (!credentials || !spreadsheetId) {
      throw new Error('Missing required environment variables');
    }

    // Create auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    // Create sheets client
    const sheets = google.sheets({ version: 'v4', auth });

    // First, get the list of available sheets
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    const sheetNames = spreadsheet.data.sheets?.map(sheet => sheet.properties?.title).filter(Boolean) || [];
    console.log('Available sheets:', sheetNames);

    // Read from all sheets sequentially to preserve order
    const combinedData: SheetRow[] = [];

    for (const sheetName of sheetNames) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z`,
      });

      const sheetData = response.data.values || [];
      // Every tab opens with a header row, which describes no game. Dropping it
      // here keeps it from being reported as an unreadable row on every run.
      sheetData.slice(1).forEach((cells, index) => {
        combinedData.push({
          sheetName: sheetName as string,
          rowNumber: index + 2,
          cells
        });
      });
    }

    console.log(`Read data from ${sheetNames.length} sheets, total rows: ${combinedData.length}`);
    return combinedData;
  } catch (error) {
    console.error('Error reading Google Sheet:', error);
    throw error;
  }
}
