import { describe, expect, it } from "vitest";

import {
  describeStoredGames,
  parseGameInfo,
  parseSheetRows,
  rebuildFromIndex,
  type ParsedGameInfo,
  type PlayerDeckNames,
  type StoredGame,
} from "@/lib/sheet-sync";

/**
 * Column layout of the source spreadsheet, for reference:
 *   0        date (MM/DD/YY)
 *   1-12     alternating player name / deck name, up to six seats
 *   13, 14   winning player name / winning deck name, or "Tie (a; b)" pairs
 *   15       number of turns
 *   16       turn the first player was knocked out
 *   17       win type
 *   18       format
 *   19       description
 */
function row(overrides: Record<number, string> = {}): string[] {
  const cells = [
    "01/15/24",
    "Alice", "Atraxa",
    "Bob", "Bolas",
    "Carol", "Cromat",
    "", "",
    "", "",
    "", "",
    "Alice", "Atraxa",
    "12",
    "8",
    "Combo",
    "EDH",
    "A close one",
  ];
  for (const [index, value] of Object.entries(overrides)) {
    cells[Number(index)] = value;
  }
  return cells;
}

const utc = (year: number, month: number, day: number) =>
  new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

/** The game from a row expected to be readable. */
function gameFrom(cells: string[]): ParsedGameInfo {
  const outcome = parseGameInfo(cells);
  expect(outcome.problem).toBeUndefined();
  return outcome.game!;
}

/** The reason a row expected to be unreadable was rejected. */
function problemFrom(cells: string[]): string {
  const outcome = parseGameInfo(cells);
  expect(outcome.game).toBeUndefined();
  return outcome.problem!;
}

describe("parseGameInfo", () => {
  it("parses a single-winner row", () => {
    const parsed = gameFrom(row());

    expect(parsed.date).toEqual(utc(2024, 1, 15));
    expect(parsed.participants).toEqual([
      { playerName: "Alice", deckName: "Atraxa" },
      { playerName: "Bob", deckName: "Bolas" },
      { playerName: "Carol", deckName: "Cromat" },
    ]);
    expect(parsed.winners).toEqual([{ playerName: "Alice", deckName: "Atraxa" }]);
    expect(parsed.numberOfTurns).toBe(12);
    expect(parsed.firstPlayerOutTurn).toBe(8);
    expect(parsed.winType).toBe("Combo");
    expect(parsed.format).toBe("EDH");
    expect(parsed.description).toBe("A close one");
  });

  it("parses a tie into multiple winners", () => {
    const parsed = gameFrom(row({ 13: "Tie (Alice; Bob)", 14: "Tie (Atraxa; Bolas)" }));

    expect(parsed.winners).toEqual([
      { playerName: "Alice", deckName: "Atraxa" },
      { playerName: "Bob", deckName: "Bolas" },
    ]);
  });

  it("interprets two-digit years below 50 as 20xx", () => {
    expect(gameFrom(row({ 0: "03/04/49" })).date).toEqual(utc(2049, 3, 4));
  });

  it("interprets two-digit years of 50 and above as 19xx", () => {
    expect(gameFrom(row({ 0: "03/04/50" })).date).toEqual(utc(1950, 3, 4));
  });

  it("falls back to placeholder values for blank win type, format and description", () => {
    const parsed = gameFrom(row({ 17: "", 18: "", 19: "" }));

    expect(parsed.winType).toBe("Unknown");
    expect(parsed.format).toBe("Unknown");
    expect(parsed.description).toBe("No description");
  });

  it("rejects a header row, reporting the unreadable date", () => {
    expect(problemFrom(row({ 0: "Date" }))).toContain("date");
  });

  it("rejects a row with too few columns, reporting how many it had", () => {
    expect(problemFrom(["01/15/24", "Alice", "Atraxa"])).toContain("3");
  });

  it("rejects a row with no winner recorded", () => {
    expect(problemFrom(row({ 13: "", 14: "" }))).toContain("winner");
  });

  it("rejects a row whose winner is not among the participants, naming them", () => {
    // Several players in this group share a first name and are told apart by
    // surname initial. A winner cell naming a player who did not play cannot be
    // resolved to a deck, and guessing would credit the wrong one.
    expect(problemFrom(row({ 13: "Dave", 14: "Daretti" }))).toContain(
      "Dave / Daretti",
    );
  });

  it("rejects a row whose winner played a deck nobody brought", () => {
    expect(problemFrom(row({ 13: "Alice", 14: "Daretti" }))).toContain(
      "Alice / Daretti",
    );
  });

  it("rejects a tie where one of the winners is not a participant", () => {
    expect(
      problemFrom(row({ 13: "Tie (Alice; Dave)", 14: "Tie (Atraxa; Daretti)" })),
    ).toContain("Dave / Daretti");
  });

  it("accepts a tie whose winners are all participants", () => {
    expect(
      gameFrom(row({ 13: "Tie (Alice; Bob)", 14: "Tie (Atraxa; Bolas)" })).winners,
    ).toHaveLength(2);
  });

  it("rejects a tie whose winners and decks disagree in count", () => {
    // One unreadable row must cost us that row and nothing else, so this is
    // reported like any other unreadable row rather than ending the import.
    expect(
      problemFrom(row({ 13: "Tie (Alice; Bob)", 14: "Tie (Atraxa)" })),
    ).toContain("2 winning player(s) but 1 winning deck(s)");
  });

  it("does not mutate the row it is given", () => {
    const input = row();
    const before = [...input];

    parseGameInfo(input);

    expect(input).toEqual(before);
  });
});

describe("parseSheetRows", () => {
  it("drops the header row but keeps every real game", () => {
    const rows = [
      row({ 0: "Date" }),
      row({ 0: "01/15/24" }),
      row({ 0: "01/16/24" }),
    ];

    expect(parseSheetRows(rows).games.map((game) => game.date)).toEqual([
      utc(2024, 1, 15),
      utc(2024, 1, 16),
    ]);
  });

  it("keeps the earliest game rather than discarding it", () => {
    const rows = [row({ 0: "Date" }), row({ 0: "02/02/24" }), row({ 0: "01/01/24" })];

    const { games } = parseSheetRows(rows);

    expect(games).toHaveLength(2);
    expect(games[0].date).toEqual(utc(2024, 1, 1));
  });

  it("sorts by date ascending", () => {
    const rows = [
      row({ 0: "03/01/24" }),
      row({ 0: "01/01/24" }),
      row({ 0: "02/01/24" }),
    ];

    expect(parseSheetRows(rows).games.map((game) => game.date)).toEqual([
      utc(2024, 1, 1),
      utc(2024, 2, 1),
      utc(2024, 3, 1),
    ]);
  });

  it("keeps the usable games when one row names an unknown winner", () => {
    // A single unusable row must not cost us the rest of the spreadsheet.
    const rows = [
      row({ 0: "01/15/24" }),
      row({ 0: "01/16/24", 13: "Dave", 14: "Daretti" }),
      row({ 0: "01/17/24" }),
    ];

    expect(parseSheetRows(rows).games.map((game) => game.date)).toEqual([
      utc(2024, 1, 15),
      utc(2024, 1, 17),
    ]);
  });

  it("reports an unreadable row against its position in the input", () => {
    // The position is what lets a human find the row in the spreadsheet, so it
    // has to survive the reordering that sorting the games does.
    const rows = [
      row({ 0: "01/15/24" }),
      row({ 0: "01/16/24", 13: "Dave", 14: "Daretti" }),
      row({ 0: "01/17/24" }),
    ];

    const { problems } = parseSheetRows(rows);

    expect(problems).toHaveLength(1);
    expect(problems[0].rowIndex).toBe(1);
    expect(problems[0].reason).toContain("Dave / Daretti");
    expect(problems[0].cells).toEqual(rows[1]);
  });

  it("reports every unreadable row, not just the first", () => {
    const rows = [
      row({ 13: "Dave", 14: "Daretti" }),
      row({ 0: "01/16/24" }),
      row({ 13: "", 14: "" }),
    ];

    expect(parseSheetRows(rows).problems.map((p) => p.rowIndex)).toEqual([0, 2]);
  });

  it("reports nothing when every row is a game", () => {
    expect(parseSheetRows([row()]).problems).toEqual([]);
  });

  it("preserves sheet order for games played on the same date", () => {
    const rows = [
      row({ 0: "01/15/24", 19: "first" }),
      row({ 0: "01/15/24", 19: "second" }),
      row({ 0: "01/15/24", 19: "third" }),
    ];

    expect(parseSheetRows(rows).games.map((game) => game.description)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

const deckIdentities = new Map<number, PlayerDeckNames>([
  [1, { playerName: "Alice", deckName: "Atraxa" }],
  [2, { playerName: "Bob", deckName: "Bolas" }],
  [3, { playerName: "Carol", deckName: "Cromat" }],
  [4, { playerName: "Dave", deckName: "Daretti" }],
]);

/** A stored game matching the spreadsheet row the `row` helper produces. */
const stored = (overrides: Partial<StoredGame> = {}): StoredGame => ({
  date: utc(2024, 1, 15),
  deckIds: [1, 2, 3],
  winningDeckIds: [1],
  numberOfTurns: 12,
  firstPlayerOutTurn: 8,
  winType: "Combo",
  format: "EDH",
  description: "A close one",
  rated: true,
  ...overrides,
});

describe("describeStoredGames", () => {
  it("describes a stored game in the same terms as a spreadsheet row", () => {
    const { games } = describeStoredGames([stored()], deckIdentities);

    expect(games).toEqual([gameFrom(row())]);
  });

  it("cannot describe a stored game whose decks no longer exist", () => {
    // ELO accumulates through such a game, so it cannot be left in place and
    // cannot be compared either: the only way back to a known state is to
    // rebuild from it.
    const { games, problems } = describeStoredGames(
      [stored({ deckIds: [1, 2, 99] })],
      deckIdentities,
    );

    expect(games).toEqual([null]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("99");
  });

  it("cannot vouch for a stored game that was never rated", () => {
    // Ratings accumulate, so every game after an unrated one was rated as though
    // it had never been played. It is no more trustworthy than a game the
    // spreadsheet disagrees with.
    const { games, problems } = describeStoredGames(
      [stored({ rated: false })],
      deckIdentities,
    );

    expect(games).toEqual([null]);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("rating");
  });

  it("reports nothing when every stored game is identifiable and rated", () => {
    expect(describeStoredGames([stored()], deckIdentities).problems).toEqual([]);
  });
});

describe("rebuildFromIndex", () => {
  const sheetGames = (...rows: string[][]) => parseSheetRows(rows).games;
  const storedGames = (...games: StoredGame[]) =>
    describeStoredGames(games, deckIdentities).games;

  it("is zero when the database is empty", () => {
    expect(rebuildFromIndex([], sheetGames(row()))).toBe(0);
  });

  it("is the end of the history when the spreadsheet only adds games", () => {
    // The ordinary nightly case: nothing to discard, three games to append.
    const index = rebuildFromIndex(
      storedGames(stored()),
      sheetGames(row(), row({ 0: "01/16/24" }), row({ 0: "01/17/24" })),
    );

    expect(index).toBe(1);
  });

  it("is the end of both when nothing has changed", () => {
    expect(rebuildFromIndex(storedGames(stored()), sheetGames(row()))).toBe(1);
  });

  it("is the position of an edited row", () => {
    const index = rebuildFromIndex(
      storedGames(stored(), stored({ date: utc(2024, 1, 16) }), stored({ date: utc(2024, 1, 17) })),
      sheetGames(
        row(),
        row({ 0: "01/16/24", 13: "Bob", 14: "Bolas" }),
        row({ 0: "01/17/24" }),
      ),
    );

    expect(index).toBe(1);
  });

  it("is the position of a row inserted into the middle of the spreadsheet", () => {
    const index = rebuildFromIndex(
      storedGames(stored(), stored({ date: utc(2024, 1, 17) })),
      sheetGames(row(), row({ 0: "01/16/24" }), row({ 0: "01/17/24" })),
    );

    expect(index).toBe(1);
  });

  it("is the position of a row removed from the spreadsheet", () => {
    const index = rebuildFromIndex(
      storedGames(stored(), stored({ date: utc(2024, 1, 16) }), stored({ date: utc(2024, 1, 17) })),
      sheetGames(row(), row({ 0: "01/17/24" })),
    );

    expect(index).toBe(1);
  });

  it("is the end of the spreadsheet when it describes fewer games than are stored", () => {
    // Rows deleted from the end of the sheet: nothing to import, and the games
    // past that point are no longer described by the source of truth.
    const index = rebuildFromIndex(
      storedGames(stored(), stored({ date: utc(2024, 1, 16) })),
      sheetGames(row()),
    );

    expect(index).toBe(1);
  });

  it("is the position of a stored game whose decks can no longer be identified", () => {
    const index = rebuildFromIndex(
      [...storedGames(stored()), null],
      sheetGames(row(), row({ 0: "01/16/24" })),
    );

    expect(index).toBe(1);
  });

  it("is the position of an unrated stored game the spreadsheet still agrees with", () => {
    // Agreeing with the spreadsheet is not enough. A game with no rating leaves
    // every rating after it wrong, so the history has to be rebuilt from it even
    // though the row it came from has not changed.
    const index = rebuildFromIndex(
      storedGames(
        stored(),
        stored({ date: utc(2024, 1, 16), rated: false }),
        stored({ date: utc(2024, 1, 17) }),
      ),
      sheetGames(row(), row({ 0: "01/16/24" }), row({ 0: "01/17/24" })),
    );

    expect(index).toBe(1);
  });

  it("ignores seat ordering", () => {
    // Reordering the columns of a row describes the same game.
    const index = rebuildFromIndex(
      storedGames(stored({ deckIds: [3, 2, 1] })),
      sheetGames(row()),
    );

    expect(index).toBe(1);
  });

  it("ignores the letter case of win type and format", () => {
    // Both are matched case-insensitively when stored, so a difference in case
    // is not a difference in the game.
    const index = rebuildFromIndex(
      storedGames(stored({ winType: "combo", format: "edh" })),
      sheetGames(row()),
    );

    expect(index).toBe(1);
  });

  it("notices a changed turn count", () => {
    // Turn counts, win type and format were invisible to the old matching, so
    // an edit to one of them silently never reached the database.
    const index = rebuildFromIndex(
      storedGames(stored({ numberOfTurns: 99 })),
      sheetGames(row()),
    );

    expect(index).toBe(0);
  });

  it("notices a changed turn a player was knocked out on", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ firstPlayerOutTurn: 99 })), sheetGames(row())),
    ).toBe(0);
  });

  it("notices a changed win type", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ winType: "Damage" })), sheetGames(row())),
    ).toBe(0);
  });

  it("notices a changed format", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ format: "Brawl" })), sheetGames(row())),
    ).toBe(0);
  });

  it("notices a changed description", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ description: "different" })), sheetGames(row())),
    ).toBe(0);
  });

  it("notices a changed winner", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ winningDeckIds: [2] })), sheetGames(row())),
    ).toBe(0);
  });

  it("notices an extra participant", () => {
    expect(
      rebuildFromIndex(storedGames(stored({ deckIds: [1, 2, 3, 4] })), sheetGames(row())),
    ).toBe(0);
  });
});
