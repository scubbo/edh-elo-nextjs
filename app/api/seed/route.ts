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
        const parsedData = data.map(parseGameInfo);
        // await Promise.all(parsedData.slice(1).map(processParsedGameInfo));
        await Promise.all(parsedData.slice(1).slice(0, 2).map(processParsedGameInfo));
        return NextResponse.json({ parsedData });
    } catch (error) {
        console.error(error);
        return NextResponse.json(
        { error: 'Failed to read Google Sheet' },
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

    const winType = await prisma.winType.findFirst({
        where: {
            name: parsedGameInfo.winType
        }
    })
    if (!winType) {
        throw new Error(`Win type ${parsedGameInfo.winType} not found`);
    }
    const format = await prisma.format.findFirst({
        where: {
            name: parsedGameInfo.format
        }
    })
    if (!format) {
        throw new Error(`Format ${parsedGameInfo.format} not found`);
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
            description: parsedGameInfo.description
        }
    })
    console.log(`During seeding, created new game: ${newGame.id} for date ${newGame.date}, deckIds: ${newGame.deckIds.join(', ')}, winningDeckIds: ${newGame.winningDeckIds.join(', ')}, description: ${newGame.description}`)
}

function parseGameInfo(data: string[]): ParsedGameInfo {
    const partialResponse: Omit<ParsedGameInfo, 'winners'> = {
        date: new Date(data[0]),
        participants: [...Array(6).keys()].map(i => ({
            playerName: data[2*i + 1],
            deckName: data[2*(i+1)]
        })).filter(p => p.playerName !== '' && p.deckName !== ''),
        numberOfTurns: Number.parseInt(data[15]),
        firstPlayerOutTurn: Number.parseInt(data[16]),
        winType: data[17],
        format: data[18],
        description: data[19],
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

    // Read the spreadsheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'A1:Z', // Adjust range as needed
    });

    return response.data.values || [];
  } catch (error) {
    console.error('Error reading Google Sheet:', error);
    throw error;
  }
}
