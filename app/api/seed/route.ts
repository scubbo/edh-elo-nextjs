import { NextResponse } from "next/server";
import { google } from 'googleapis';

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
        return NextResponse.json({ parsedData });
    } catch (error) {
        return NextResponse.json(
        { error: 'Failed to read Google Sheet' },
        { status: 500 }
        );
    }
}

function parseGameInfo(data: string[]): ParsedGameInfo {
    let partialResponse: Omit<ParsedGameInfo, 'winners'> = {
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

    let winners: PlayerDeckNames[] = [];
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
