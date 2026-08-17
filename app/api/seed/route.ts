import { NextResponse } from "next/server";

import { isAdmin } from "@/lib/auth";
import { describeImportResult, importGamesFromSheet } from "@/lib/sheet-import";

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

        const result = await importGamesFromSheet('manual');

        if (result === null) {
            return NextResponse.json(
                { error: 'An import is already running; nothing was done' },
                { status: 409 }
            );
        }

        return NextResponse.json({
            message: describeImportResult(result),
            ...result
        });
    } catch (error) {
        return NextResponse.json(
        { error: `Seeding failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
        );
    }
}
