import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { importGamesFromSheet } from "@/lib/sheet-import";

// A run scales with the size of the spreadsheet, well past the default limit
export const maxDuration = 60;

export async function POST() {
    try {
        // Check admin authorization
        if (!(await isAdmin())) {
            return NextResponse.json(
                { error: 'Unauthorized - Admin access required' },
                { status: 403 }
            );
        }

        const result = await importGamesFromSheet();

        return NextResponse.json({
            message: `Imported ${result.gamesInserted} new game(s) from ${result.gamesParsed} spreadsheet row(s); ` +
                `${result.gamesAlreadyStored} already stored` +
                (result.eloReplayedFrom
                    ? `. ELO recalculated for ${result.gamesRescored} game(s) from ` +
                      `${result.eloReplayedFrom.toISOString()} onwards`
                    : ''),
            ...result
        });
    } catch (error) {
        console.error('Seeding error:', error);
        return NextResponse.json(
        { error: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
        );
    }
}
