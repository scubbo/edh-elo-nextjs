import { google } from 'googleapis';

import prisma from '@/lib/db/client';
import { backCalculateEloScoresFrom, calculateAndStoreEloScores } from '@/lib/db/queries';
import {
  recordFailedImport,
  recordSuccessfulImport,
  type ImportTrigger
} from '@/lib/import-log';
import {
  buildExistingGameKeys,
  eloReplayCutoff,
  parseSheetRows,
  selectNewGames,
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
  gamesInserted: number,
  gamesAlreadyStored: number,
  eloReplayedFrom: Date | null,
  gamesRescored: number,
  skippedRows: SkippedRow[],
  /** Problems with data already stored, found while comparing it to the sheet. */
  warnings: string[]
}

/**
 * Brings the database up to date with the spreadsheet, and records what the run
 * did where an admin can read it.
 *
 * Safe to run repeatedly: games already stored are recognised and skipped, so a
 * run that fails partway is corrected by the next one.
 */
export async function importGamesFromSheet(
  trigger: ImportTrigger
): Promise<SheetImportResult> {
  let result: SheetImportResult;
  try {
    result = await runImport();
  } catch (error) {
    await recordFailedImport(trigger, error);
    throw error;
  }

  await recordSuccessfulImport(trigger, result);
  return result;
}

async function runImport(): Promise<SheetImportResult> {
  const rows = await readGoogleSheet();
  const { games: parsedGames, problems } = parseSheetRows(rows.map((row) => row.cells));
  const skippedRows = problems.map((problem) => locateProblem(problem, rows));

  for (const skipped of skippedRows) {
    console.warn(
      `Skipped ${skipped.sheetName} row ${skipped.rowNumber}: ${skipped.reason}`
    );
  }

  const [storedGames, decks] = await Promise.all([
    prisma.game.findMany({
      select: { date: true, deckIds: true, winningDeckIds: true, description: true }
    }),
    prisma.deck.findMany({
      select: { id: true, name: true, owner: { select: { name: true } } }
    })
  ]);

  const deckIdentities = new Map<number, PlayerDeckNames>(
    decks.map((deck) => [deck.id, { playerName: deck.owner.name, deckName: deck.name }])
  );

  const { keys: existingKeys, problems: warnings } =
    buildExistingGameKeys(storedGames, deckIdentities);
  const newGames = selectNewGames(parsedGames, existingKeys);

  for (const warning of warnings) {
    console.warn(warning);
  }

  const latestStoredGameDate = storedGames.reduce<Date | null>(
    (latest, game) => (latest === null || game.date > latest ? game.date : latest),
    null
  );
  // A back-dated row invalidates every rating computed after it, so scoring is
  // deferred to a replay from that game onwards rather than done per game.
  const replayFrom = eloReplayCutoff(newGames, latestStoredGameDate);

  for (const game of newGames) {
    await insertGame(game, { scoreImmediately: replayFrom === null });
  }

  const gamesRescored = replayFrom === null
    ? 0
    : await backCalculateEloScoresFrom(replayFrom);

  return {
    rowsRead: rows.length,
    gamesParsed: parsedGames.length,
    gamesInserted: newGames.length,
    gamesAlreadyStored: parsedGames.length - newGames.length,
    eloReplayedFrom: replayFrom,
    gamesRescored,
    skippedRows,
    warnings
  };
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

async function insertGame(
  parsedGameInfo: ParsedGameInfo,
  { scoreImmediately }: { scoreImmediately: boolean }
) {
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

  // Decks only appear in the UI once they have an ELO score
  if (scoreImmediately) {
    await calculateAndStoreEloScores(newGame.id);
  }

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
