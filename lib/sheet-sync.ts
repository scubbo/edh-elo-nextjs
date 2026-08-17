export type ParsedGameInfo = {
  date: Date,
  participants: PlayerDeckNames[],
  winners: PlayerDeckNames[],
  numberOfTurns: number,
  firstPlayerOutTurn: number,
  winType: string,
  format: string,
  description: string
}

export type PlayerDeckNames = {
  playerName: string,
  deckName: string
}

/** What comparing a stored game against the spreadsheet needs to know about it. */
export type StoredGame = {
  date: Date,
  deckIds: number[],
  winningDeckIds: number[],
  numberOfTurns: number,
  firstPlayerOutTurn: number,
  winType: string,
  format: string,
  description: string,
  /** Whether ratings have been computed for the game. */
  rated: boolean
}

/**
 * A row that does not describe a game, and why. Reported rather than dropped
 * silently: nothing watches a scheduled run, so an unreadable row is invisible
 * unless it is recorded somewhere an admin can read it.
 */
export type SheetRowProblem = {
  /** Position in the rows handed to parseSheetRows, for locating the row. */
  rowIndex: number,
  reason: string,
  cells: string[]
}

/** Either the game a row describes, or why it does not describe one. */
export type RowOutcome =
  | { game: ParsedGameInfo, problem?: undefined }
  | { game?: undefined, problem: string }

export type SheetParseResult = {
  games: ParsedGameInfo[],
  problems: SheetRowProblem[]
}

/**
 * Parses every row of the spreadsheet, separating the games from the rows that
 * do not describe one (the header, and any row too incomplete or inconsistent
 * to interpret).
 *
 * Games are ordered by date so that ELO can be accumulated in the order the
 * games were played. Games sharing a date fall back to the order they appear in
 * the sheet, which is the only signal available for sequencing them.
 */
export function parseSheetRows(rows: string[][]): SheetParseResult {
  const games: { parsed: ParsedGameInfo, sheetPosition: number }[] = [];
  const problems: SheetRowProblem[] = [];

  rows.forEach((cells, sheetPosition) => {
    const outcome = parseGameInfo(cells);
    if (outcome.problem !== undefined) {
      problems.push({ rowIndex: sheetPosition, reason: outcome.problem, cells });
      return;
    }
    games.push({ parsed: outcome.game, sheetPosition });
  });

  games.sort((a, b) => {
    const dateDifference = a.parsed.date.getTime() - b.parsed.date.getTime();
    return dateDifference !== 0
      ? dateDifference
      : a.sheetPosition - b.sheetPosition;
  });

  return { games: games.map((entry) => entry.parsed), problems };
}

/**
 * Identifies a game by everything the spreadsheet says about it, so that any
 * edit to a row is a change of identity.
 *
 * Seats and winners are sorted because reordering the columns of a row describes
 * the same game. Win type and format are lowercased because they are matched
 * case-insensitively when stored, so a difference in case is not a difference in
 * the game.
 */
export function gameFingerprint(game: ParsedGameInfo): string {
  const seat = ({ playerName, deckName }: PlayerDeckNames) =>
    JSON.stringify([playerName, deckName]);

  return JSON.stringify([
    game.date.toISOString(),
    game.participants.map(seat).sort(),
    game.winners.map(seat).sort(),
    game.numberOfTurns,
    game.firstPlayerOutTurn,
    game.winType.toLowerCase(),
    game.format.toLowerCase(),
    game.description
  ]);
}

/**
 * Restates the stored games in the terms a spreadsheet row is read into, so the
 * two sequences can be compared directly.
 *
 * A game the comparison cannot vouch for stands as null rather than being
 * dropped, so that it counts as a disagreement and the history is rebuilt from
 * it. Two kinds cannot be vouched for: one referencing a deck that no longer
 * exists, which cannot be restated at all; and one with no ratings, which every
 * later rating was computed as though it had never been played.
 */
export function describeStoredGames(
  games: StoredGame[],
  deckIdentities: Map<number, PlayerDeckNames>
): { games: (ParsedGameInfo | null)[], problems: string[] } {
  const problems: string[] = [];

  const described = games.map((game) => {
    const playedOn = game.date.toISOString().slice(0, 10);

    if (!game.rated) {
      problems.push(
        `Stored game on ${playedOn} has no rating, so every game after it was ` +
        `rated as though it had never been played; it will be imported again`
      );
      return null;
    }

    const resolve = (deckIds: number[]) =>
      deckIds.map((deckId) => deckIdentities.get(deckId));
    const participants = resolve(game.deckIds);
    const winners = resolve(game.winningDeckIds);

    if (participants.includes(undefined) || winners.includes(undefined)) {
      const unknown = [...new Set(
        [...game.deckIds, ...game.winningDeckIds]
          .filter((deckId) => !deckIdentities.has(deckId))
      )];
      problems.push(
        `Stored game on ${playedOn} references deck id(s) ${unknown.join(', ')} ` +
        `that no longer exist, so it cannot be compared with the spreadsheet ` +
        `and will be imported again`
      );
      return null;
    }

    return {
      date: game.date,
      participants: participants as PlayerDeckNames[],
      winners: winners as PlayerDeckNames[],
      numberOfTurns: game.numberOfTurns,
      firstPlayerOutTurn: game.firstPlayerOutTurn,
      winType: game.winType,
      format: game.format,
      description: game.description
    };
  });

  return { games: described, problems };
}

/**
 * The position from which the stored games have to be discarded and read afresh
 * from the spreadsheet.
 *
 * Both sequences are in the order the games were played, so the stored games
 * should be a leading run of the spreadsheet's. From the first position where
 * they disagree, nothing stored can be trusted: ELO accumulates through every
 * game, so an edited, inserted or deleted row invalidates every rating after it,
 * and correcting one game in place would leave the rest wrong.
 *
 * Where neither disagrees, the shorter sequence has simply run out. A longer
 * spreadsheet means games to append — the ordinary case — and a longer history
 * means games the spreadsheet no longer describes.
 */
export function rebuildFromIndex(
  storedGames: (ParsedGameInfo | null)[],
  sheetGames: ParsedGameInfo[]
): number {
  const shared = Math.min(storedGames.length, sheetGames.length);

  for (let index = 0; index < shared; index++) {
    const stored = storedGames[index];
    if (
      stored === null ||
      gameFingerprint(stored) !== gameFingerprint(sheetGames[index])
    ) {
      return index;
    }
  }

  return shared;
}

export function parseGameInfo(sheetRow: string[]): RowOutcome {
  // Validate that we have the minimum required data
  if (!sheetRow[0] || sheetRow.length < 15) {
    return { problem: `Row has insufficient data: ${sheetRow.length} column(s), at least 15 needed` };
  }

  // Ensure we have at least 20 elements, padding with empty strings if needed
  const data = [...sheetRow];
  while (data.length < 20) {
    data.push('');
  }

  // Parse date in MM/DD/YY format
  const dateStr = data[0];
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3) {
    return { problem: `Unreadable date "${dateStr}": expected MM/DD/YY` };
  }

  const month = parseInt(dateParts[0], 10) - 1; // Month is 0-indexed
  const day = parseInt(dateParts[1], 10);
  const year = parseInt(dateParts[2], 10);

  // Handle 2-digit years (assume 20xx for years < 50, 19xx for years >= 50)
  const fullYear = year < 50 ? 2000 + year : 1900 + year;

  // Create date in UTC at noon to avoid timezone shifts when displayed
  // Using noon UTC ensures the date displays correctly in all timezones
  const date = new Date(Date.UTC(fullYear, month, day, 12, 0, 0));
  if (isNaN(date.getTime())) {
    return { problem: `Unreadable date "${dateStr}"` };
  }

  const partialResponse: Omit<ParsedGameInfo, 'winners'> = {
    date: date,
    participants: [...Array(6).keys()].map(i => ({
      playerName: data[2*i + 1],
      deckName: data[2*(i+1)]
    })).filter(p => p.playerName !== '' && p.deckName !== ''),
    numberOfTurns: Number.parseInt(data[15]) || 0,
    firstPlayerOutTurn: Number.parseInt(data[16]) || 0,
    winType: data[17] || 'Unknown',
    format: data[18] || 'Unknown',
    description: data[19] || 'No description',
  }

  partialResponse.participants.forEach(p => {
    if (p.playerName === '') {
      throw new Error(`Player name is empty for deck ${p.deckName} played on ${partialResponse.date}`);
    }
    if (p.deckName === '') {
      throw new Error(`Deck name is empty for player ${p.playerName} played on ${partialResponse.date}`);
    }
  });

  const winners: PlayerDeckNames[] = [];

  // Validate that we have the required data
  if (!data[13] || !data[14]) {
    return {
      problem: `No winner recorded: winning player is "${data[13]}" and winning deck is "${data[14]}"`
    };
  }

  if (!(data[13].startsWith('Tie'))) {
    winners.push({
      playerName: data[13],
      deckName: data[14]
    })
  } else {
    const winnerPlayerNames = data[13].replace('Tie (', '').replace(')', '').split('; ');
    const winnerDeckNames = data[14].replace('Tie (', '').replace(')', '').split('; ');
    if (winnerPlayerNames.length !== winnerDeckNames.length) {
      return {
        problem: `Tie names ${winnerPlayerNames.length} winning player(s) but ` +
          `${winnerDeckNames.length} winning deck(s)`
      };
    }

    for (let i = 0; i < winnerPlayerNames.length; i++) {
      winners.push({
        playerName: winnerPlayerNames[i],
        deckName: winnerDeckNames[i]
      });
    }
  }

  // A winner cell has to name a seat from the same row, or the win cannot be
  // attributed to a deck. Several players share a first name and are told apart
  // by surname initial, so a cell naming the bare first name is ambiguous and
  // guessing would credit the wrong deck.
  const unmatchedWinners = winners.filter((winner) =>
    !partialResponse.participants.some(
      p => p.playerName === winner.playerName && p.deckName === winner.deckName
    )
  );
  if (unmatchedWinners.length > 0) {
    const described = unmatchedWinners
      .map(w => `${w.playerName} / ${w.deckName}`)
      .join(', ');
    const played = partialResponse.participants
      .map(p => `${p.playerName} / ${p.deckName}`)
      .join(', ');
    return {
      problem: `Winner(s) ${described} did not play in this game; the seats are ${played}`
    };
  }

  return { game: {...partialResponse, winners} };
}
