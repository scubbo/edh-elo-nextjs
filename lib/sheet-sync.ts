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

/** The subset of a stored Game needed to recognise it in the spreadsheet. */
export type ExistingGame = {
  date: Date,
  deckIds: number[],
  winningDeckIds: number[],
  description: string
}

/**
 * Parses every row of the spreadsheet, discarding those that do not describe a
 * game (the header, and any row too incomplete to interpret).
 *
 * Games are ordered by date so that ELO can be accumulated in the order the
 * games were played. Games sharing a date fall back to the order they appear in
 * the sheet, which is the only signal available for sequencing them.
 */
export function parseSheetRows(rows: string[][]): ParsedGameInfo[] {
  return rows
    .map((row, sheetPosition) => ({ parsed: parseGameInfo(row), sheetPosition }))
    .filter((entry): entry is { parsed: ParsedGameInfo, sheetPosition: number } =>
      entry.parsed !== null)
    .sort((a, b) => {
      const dateDifference = a.parsed.date.getTime() - b.parsed.date.getTime();
      return dateDifference !== 0
        ? dateDifference
        : a.sheetPosition - b.sheetPosition;
    })
    .map((entry) => entry.parsed);
}

/**
 * Identifies a game by what makes it distinct in the spreadsheet: when it was
 * played, who played with which deck, who won, and its description. Seats are
 * sorted so that reordering columns in the sheet does not read as a new game.
 */
function gameKey(
  date: Date,
  participants: PlayerDeckNames[],
  winners: PlayerDeckNames[],
  description: string
): string {
  const seat = ({ playerName, deckName }: PlayerDeckNames) =>
    JSON.stringify([playerName, deckName]);

  return JSON.stringify([
    date.toISOString(),
    participants.map(seat).sort(),
    winners.map(seat).sort(),
    description
  ]);
}

export function parsedGameKey(game: ParsedGameInfo): string {
  return gameKey(game.date, game.participants, game.winners, game.description);
}

/**
 * Reduces the stored games to the same keys the spreadsheet rows produce, so
 * the two can be compared directly.
 *
 * A game referencing a deck that no longer exists cannot be keyed, and is
 * reported rather than silently dropped: it would otherwise be re-inserted from
 * the sheet as though it were new.
 */
export function buildExistingGameKeys(
  games: ExistingGame[],
  deckIdentities: Map<number, PlayerDeckNames>
): Set<string> {
  const keys = new Set<string>();

  for (const game of games) {
    const resolve = (deckIds: number[]) =>
      deckIds.map((deckId) => deckIdentities.get(deckId));
    const participants = resolve(game.deckIds);
    const winners = resolve(game.winningDeckIds);

    if (participants.includes(undefined) || winners.includes(undefined)) {
      const known = [...game.deckIds, ...game.winningDeckIds]
        .filter((deckId) => !deckIdentities.has(deckId));
      console.warn(
        `Stored game on ${game.date.toISOString()} references unknown deck ids ` +
        `${known.join(', ')} and cannot be matched against the spreadsheet`
      );
      continue;
    }

    keys.add(gameKey(
      game.date,
      participants as PlayerDeckNames[],
      winners as PlayerDeckNames[],
      game.description
    ));
  }

  return keys;
}

/**
 * Narrows the spreadsheet down to the games not already stored.
 *
 * Rows that key identically to each other collapse to one game. The
 * spreadsheet holds no game identifier, so a row duplicated within it is
 * indistinguishable from a genuine repeat of the same matchup on the same day,
 * and inventing a second game is the worse of the two mistakes.
 */
export function selectNewGames(
  parsedGames: ParsedGameInfo[],
  existingKeys: Set<string>
): ParsedGameInfo[] {
  const seenKeys = new Set(existingKeys);

  return parsedGames.filter((game) => {
    const key = parsedGameKey(game);
    if (seenKeys.has(key)) {
      return false;
    }
    seenKeys.add(key);
    return true;
  });
}

/**
 * ELO is a running total, so a game can only be scored as it is inserted if it
 * happened after every game already scored. A back-dated row invalidates every
 * rating computed after it, and those games have to be replayed from it
 * onwards.
 *
 * Returns the date to replay from, or null when every new game belongs at the
 * end of the history and can be scored incrementally. A game sharing the most
 * recent stored date needs no replay: it takes a higher id on insertion, so it
 * sorts after the stored game of that date.
 */
export function eloReplayCutoff(
  newGames: ParsedGameInfo[],
  latestStoredGameDate: Date | null
): Date | null {
  if (latestStoredGameDate === null) {
    return null;
  }

  return newGames.reduce<Date | null>((earliest, game) => {
    if (game.date.getTime() >= latestStoredGameDate.getTime()) {
      return earliest;
    }
    return earliest === null || game.date < earliest ? game.date : earliest;
  }, null);
}

export function parseGameInfo(sheetRow: string[]): ParsedGameInfo | null {
  // Validate that we have the minimum required data
  if (!sheetRow[0] || sheetRow.length < 15) {
    console.error(`❌ SKIPPING ROW - insufficient data (length: ${sheetRow.length}): ${JSON.stringify(sheetRow)}`);
    return null;
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
    console.warn(`Skipping row with invalid date format: ${dateStr}`);
    return null;
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
    console.warn(`Skipping row with invalid date: ${dateStr}`);
    return null;
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
    console.error(`❌ SKIPPING ROW - missing winner data (data[13]="${data[13]}", data[14]="${data[14]}"): ${JSON.stringify(sheetRow)}`);
    return null; // Return null to skip this row
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
      throw new Error('Mismatch between winner player names and deck names');
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
    console.error(
      `❌ SKIPPING ROW - winner(s) ${described} not among the participants ` +
      `${JSON.stringify(partialResponse.participants)}: ${JSON.stringify(sheetRow)}`
    );
    return null;
  }

  return {...partialResponse, winners};
}
