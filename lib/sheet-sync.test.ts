import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildExistingGameKeys,
  needsEloBackCalculation,
  parseGameInfo,
  parseSheetRows,
  selectNewGames,
  type ExistingGame,
  type PlayerDeckNames,
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

// Rows the sync cannot interpret are reported rather than dropped silently,
// since nothing watches a scheduled run. Capture that reporting so the
// assertions below can check it and it stays out of the test output.
const consoleError = vi.spyOn(console, "error");
const consoleWarn = vi.spyOn(console, "warn");

beforeEach(() => {
  consoleError.mockImplementation(() => {});
  consoleWarn.mockImplementation(() => {});
});

afterEach(() => {
  consoleError.mockClear();
  consoleWarn.mockClear();
});

describe("parseGameInfo", () => {
  it("parses a single-winner row", () => {
    const parsed = parseGameInfo(row());

    expect(parsed).not.toBeNull();
    expect(parsed!.date).toEqual(utc(2024, 1, 15));
    expect(parsed!.participants).toEqual([
      { playerName: "Alice", deckName: "Atraxa" },
      { playerName: "Bob", deckName: "Bolas" },
      { playerName: "Carol", deckName: "Cromat" },
    ]);
    expect(parsed!.winners).toEqual([{ playerName: "Alice", deckName: "Atraxa" }]);
    expect(parsed!.numberOfTurns).toBe(12);
    expect(parsed!.firstPlayerOutTurn).toBe(8);
    expect(parsed!.winType).toBe("Combo");
    expect(parsed!.format).toBe("EDH");
    expect(parsed!.description).toBe("A close one");
  });

  it("parses a tie into multiple winners", () => {
    const parsed = parseGameInfo(
      row({ 13: "Tie (Alice; Bob)", 14: "Tie (Atraxa; Bolas)" }),
    );

    expect(parsed!.winners).toEqual([
      { playerName: "Alice", deckName: "Atraxa" },
      { playerName: "Bob", deckName: "Bolas" },
    ]);
  });

  it("interprets two-digit years below 50 as 20xx", () => {
    expect(parseGameInfo(row({ 0: "03/04/49" }))!.date).toEqual(utc(2049, 3, 4));
  });

  it("interprets two-digit years of 50 and above as 19xx", () => {
    expect(parseGameInfo(row({ 0: "03/04/50" }))!.date).toEqual(utc(1950, 3, 4));
  });

  it("falls back to placeholder values for blank win type, format and description", () => {
    const parsed = parseGameInfo(row({ 17: "", 18: "", 19: "" }));

    expect(parsed!.winType).toBe("Unknown");
    expect(parsed!.format).toBe("Unknown");
    expect(parsed!.description).toBe("No description");
  });

  it("rejects a header row, reporting the unreadable date", () => {
    expect(parseGameInfo(row({ 0: "Date" }))).toBeNull();
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("invalid date format: Date"),
    );
  });

  it("rejects a row with too few columns, reporting the row", () => {
    expect(parseGameInfo(["01/15/24", "Alice", "Atraxa"])).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("insufficient data"),
    );
  });

  it("rejects a row with no winner recorded, reporting the row", () => {
    expect(parseGameInfo(row({ 13: "", 14: "" }))).toBeNull();
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("missing winner data"),
    );
  });

  it("throws when tie winners and tie decks disagree in count", () => {
    expect(() =>
      parseGameInfo(row({ 13: "Tie (Alice; Bob)", 14: "Tie (Atraxa)" })),
    ).toThrow(/Mismatch/);
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

    const parsed = parseSheetRows(rows);

    expect(parsed.map((game) => game.date)).toEqual([
      utc(2024, 1, 15),
      utc(2024, 1, 16),
    ]);
  });

  it("keeps the earliest game rather than discarding it", () => {
    const rows = [row({ 0: "Date" }), row({ 0: "02/02/24" }), row({ 0: "01/01/24" })];

    const parsed = parseSheetRows(rows);

    expect(parsed).toHaveLength(2);
    expect(parsed[0].date).toEqual(utc(2024, 1, 1));
  });

  it("sorts by date ascending", () => {
    const rows = [
      row({ 0: "03/01/24" }),
      row({ 0: "01/01/24" }),
      row({ 0: "02/01/24" }),
    ];

    expect(parseSheetRows(rows).map((game) => game.date)).toEqual([
      utc(2024, 1, 1),
      utc(2024, 2, 1),
      utc(2024, 3, 1),
    ]);
  });

  it("preserves sheet order for games played on the same date", () => {
    const rows = [
      row({ 0: "01/15/24", 19: "first" }),
      row({ 0: "01/15/24", 19: "second" }),
      row({ 0: "01/15/24", 19: "third" }),
    ];

    expect(parseSheetRows(rows).map((game) => game.description)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

describe("selectNewGames", () => {
  const deckIdentities = new Map<number, PlayerDeckNames>([
    [1, { playerName: "Alice", deckName: "Atraxa" }],
    [2, { playerName: "Bob", deckName: "Bolas" }],
    [3, { playerName: "Carol", deckName: "Cromat" }],
    [4, { playerName: "Dave", deckName: "Daretti" }],
  ]);

  const existing = (overrides: Partial<ExistingGame> = {}): ExistingGame => ({
    date: utc(2024, 1, 15),
    deckIds: [1, 2, 3],
    winningDeckIds: [1],
    description: "A close one",
    ...overrides,
  });

  const keysFor = (games: ExistingGame[]) =>
    buildExistingGameKeys(games, deckIdentities);

  it("excludes a game that is already stored", () => {
    const parsed = parseSheetRows([row()]);

    expect(selectNewGames(parsed, keysFor([existing()]))).toEqual([]);
  });

  it("includes every game when the database is empty", () => {
    const parsed = parseSheetRows([row()]);

    expect(selectNewGames(parsed, keysFor([]))).toHaveLength(1);
  });

  it("ignores seat ordering when matching against stored games", () => {
    const parsed = parseSheetRows([
      row({ 1: "Carol", 2: "Cromat", 5: "Alice", 6: "Atraxa", 13: "Alice", 14: "Atraxa" }),
    ]);

    expect(selectNewGames(parsed, keysFor([existing()]))).toEqual([]);
  });

  it("treats a game whose players are a subset of a stored game as new", () => {
    // A three-player game must not be mistaken for an already-stored
    // four-player game on the same date that happens to contain those three
    // decks and share a description.
    const parsed = parseSheetRows([row()]);
    const storedFourPlayerGame = existing({
      deckIds: [1, 2, 3, 4],
      winningDeckIds: [1],
    });

    expect(selectNewGames(parsed, keysFor([storedFourPlayerGame]))).toHaveLength(1);
  });

  it("treats a differing description as a different game", () => {
    const parsed = parseSheetRows([row({ 19: "a different night" })]);

    expect(selectNewGames(parsed, keysFor([existing()]))).toHaveLength(1);
  });

  it("treats a differing winner as a different game", () => {
    const parsed = parseSheetRows([row({ 13: "Bob", 14: "Bolas" })]);

    expect(selectNewGames(parsed, keysFor([existing()]))).toHaveLength(1);
  });

  it("treats a differing date as a different game", () => {
    const parsed = parseSheetRows([row({ 0: "01/16/24" })]);

    expect(selectNewGames(parsed, keysFor([existing()]))).toHaveLength(1);
  });

  it("reports a stored game whose decks can no longer be identified", () => {
    const keys = keysFor([existing({ deckIds: [1, 2, 99] })]);

    expect(keys.size).toBe(0);
    expect(consoleWarn).toHaveBeenCalledWith(
      expect.stringContaining("unknown deck ids 99"),
    );
  });
});

describe("needsEloBackCalculation", () => {
  it("is false when there are no games to insert", () => {
    expect(needsEloBackCalculation([], utc(2024, 1, 15))).toBe(false);
  });

  it("is false when the database holds no games yet", () => {
    const parsed = parseSheetRows([row()]);

    expect(needsEloBackCalculation(parsed, null)).toBe(false);
  });

  it("is false when every new game postdates the stored games", () => {
    const parsed = parseSheetRows([row({ 0: "02/01/24" })]);

    expect(needsEloBackCalculation(parsed, utc(2024, 1, 15))).toBe(false);
  });

  it("is true when a new game predates the most recent stored game", () => {
    const parsed = parseSheetRows([row({ 0: "01/01/24" })]);

    expect(needsEloBackCalculation(parsed, utc(2024, 1, 15))).toBe(true);
  });

  it("is true when only one of several new games is back-dated", () => {
    const parsed = parseSheetRows([
      row({ 0: "03/01/24" }),
      row({ 0: "01/01/24" }),
    ]);

    expect(needsEloBackCalculation(parsed, utc(2024, 1, 15))).toBe(true);
  });
});
