import { NextResponse } from 'next/server';
import db from '@/lib/db/setup';

export async function GET() {
  try {
    // The database is automatically initialized when imported
    return NextResponse.json({ status: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
} 