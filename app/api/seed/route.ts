import { NextResponse } from "next/server";
import { google } from 'googleapis';
import prisma from "@/lib/db/client";

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

export async function POST() {
    try {
        const data = await readGoogleSheet();
        const parsedData = data.map(parseGameInfo).filter((item): item is ParsedGameInfo => item !== null); // Filter out null values
        // await Promise.all(parsedData.slice(1).map(processParsedGameInfo));
        await Promise.all(parsedData.slice(1).map(processParsedGameInfo));
        return NextResponse.json({ parsedData });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json(
        { error: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
        );
    }
}

async function processParsedGameInfo(parsedGameInfo: ParsedGameInfo) {
    const processedParticipants = await Promise.all(parsedGameInfo.participants.map(async (participant) => {
        let existingPlayer = await prisma.player.findFirst({
            where: {
                name: participant.playerName
            },
            select: {
                id: true,
                name: true
            }
        })
        if (!existingPlayer) {
            try {
                existingPlayer = await prisma.player.create({
                    data: {
                        name: participant.playerName
                    },
                    select: {
                        id: true,
                        name: true  
                    }
                })
                console.log(`During seeding, created new player: ${existingPlayer.name} (id: ${existingPlayer.id})`)
            } catch (error: unknown) {
                // If player already exists (race condition), find it
                if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                    existingPlayer = await prisma.player.findFirst({
                        where: {
                            name: participant.playerName
                        },
                        select: {
                            id: true,
                            name: true
                        }
                    })
                    console.log(`During seeding, found existing player after race condition: ${existingPlayer?.name} (id: ${existingPlayer?.id})`)
                } else {
                    throw error
                }
            }
        }

        if (!existingPlayer) {
            throw new Error(`Player not found: ${participant.playerName}`);
        }

        let existingDeck = await prisma.deck.findFirst({
            where: {
                name: participant.deckName,
                ownerId: existingPlayer.id
            },
            select: {
                id: true,
                name: true
            }
        })
        if (!existingDeck) {
            try {
                existingDeck = await prisma.deck.create({
                    data: {
                        name: participant.deckName,
                        ownerId: existingPlayer.id
                    },
                    select: {
                        id: true,
                        name: true
                    }
                })
                console.log(`During seeding, created new deck: ${existingDeck.name} (id: ${existingDeck.id})`)
            } catch (error: unknown) {
                // If deck already exists (race condition), find it
                if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                    existingDeck = await prisma.deck.findFirst({
                        where: {
                            name: participant.deckName,
                            ownerId: existingPlayer.id
                        },
                        select: {
                            id: true,
                            name: true
                        }
                    })
                    console.log(`During seeding, found existing deck after race condition: ${existingDeck?.name} (id: ${existingDeck?.id})`)
                } else {
                    throw error
                }
            }
        }

        if (!existingDeck) {
            throw new Error(`Deck not found: ${participant.deckName} for player ${participant.playerName}`);
        }

        return {
            playerId: existingPlayer.id,
            playerName: existingPlayer.name,
            deckId: existingDeck.id,
            deckName: existingDeck.name
        }
    }))

    const processedWinners = await Promise.all(parsedGameInfo.winners.map(async (winner) => {
        const processedParticipant = processedParticipants.find(p => p.playerName === winner.playerName && p.deckName === winner.deckName)
        if (!processedParticipant) {
            throw new Error(`Participant ${winner.playerName} ${winner.deckName} not found in processed participants`);
        }
        return processedParticipant;
    }))

    // Check if game already exists
    const existingGame = await prisma.game.findFirst({
        where: {
            date: parsedGameInfo.date,
            deckIds: { hasEvery: processedParticipants.map(p => p.deckId) },
            winningDeckIds: { hasEvery: processedWinners.map(p => p.deckId) },
            description: parsedGameInfo.description
        }
    })
    if (existingGame) {
        console.log(`Game already exists for date ${parsedGameInfo.date}, deckIds: ${processedParticipants.map(p => p.deckId).join(', ')}, winningDeckIds: ${processedWinners.map(p => p.deckId).join(', ')}, description: ${parsedGameInfo.description} - skipping...`);
        return;
    }

    let winType = await prisma.winType.findFirst({
        where: {
            name: {
                equals: parsedGameInfo.winType,
                mode: 'insensitive'
            }
        }
    })
    if (!winType) {
        // Create the missing win type
        winType = await prisma.winType.create({
            data: { name: parsedGameInfo.winType }
        });
        console.log(`Created missing win type: ${parsedGameInfo.winType}`);
    }
    let format = await prisma.format.findFirst({
        where: {
            name: {
                equals: parsedGameInfo.format,
                mode: 'insensitive'
            }
        }
    })
    if (!format) {
        // Create the missing format
        format = await prisma.format.create({
            data: { name: parsedGameInfo.format }
        });
        console.log(`Created missing format: ${parsedGameInfo.format}`);
    }

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
    })
    console.log(`During seeding, created new game: ${newGame.id} for date ${newGame.date}, deckIds: ${newGame.deckIds.join(', ')}, winningDeckIds: ${newGame.winningDeckIds.join(', ')}, description: ${newGame.description}`)
}

function parseGameInfo(data: string[]): ParsedGameInfo | null {
    // Validate that we have the minimum required data
    if (!data[0] || data.length < 15) {
        console.error(`❌ SKIPPING ROW - insufficient data (length: ${data.length}): ${JSON.stringify(data)}`);
        return null;
    }
    
    // Ensure we have at least 20 elements, padding with empty strings if needed
    while (data.length < 20) {
        data.push('');
    }


    const date = new Date(data[0]);
    if (isNaN(date.getTime())) {
        console.warn(`Skipping row with invalid date: ${data[0]}`);
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

    // Ensure we have at least 20 elements, padding with empty strings if needed
    while (data.length < 20) {
        data.push('');
    }

    const winners: PlayerDeckNames[] = [];
    
    // Validate that we have the required data
    if (!data[13] || !data[14]) {
        console.error(`❌ SKIPPING ROW - missing winner data (data[13]="${data[13]}", data[14]="${data[14]}"): ${JSON.stringify(data)}`);
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

    return {...partialResponse, winners};
}

async function readGoogleSheet() {
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

    // Read from all available sheets
    const sheetPromises = sheetNames.map(sheetName => 
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A1:Z`,
      })
    );

    const responses = await Promise.all(sheetPromises);
    
    // Combine data from all sheets, skipping header rows after the first sheet
    let combinedData: string[][] = [];
    
    responses.forEach((response, index) => {
      const sheetData = response.data.values || [];
      if (index === 0) {
        // First sheet: include all data (including header)
        combinedData = [...sheetData];
      } else {
        // Subsequent sheets: skip header row
        if (sheetData.length > 1) {
          combinedData = [...combinedData, ...sheetData.slice(1)];
        }
      }
    });

    console.log(`Read data from ${sheetNames.length} sheets, total rows: ${combinedData.length}`);
    return combinedData;
  } catch (error) {
    console.error('Error reading Google Sheet:', error);
    throw error;
  }
}
