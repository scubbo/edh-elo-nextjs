import { NextResponse } from 'next/server';
import { backCalculateAllEloScores } from '@/lib/db/queries';

export async function POST() {
  try {
    console.log('Starting ELO back-calculation...');
    await backCalculateAllEloScores();
    
    return NextResponse.json({ 
      message: 'ELO scores back-calculated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error back-calculating ELO scores:', error);
    return NextResponse.json(
      { error: 'Failed to back-calculate ELO scores' },
      { status: 500 }
    );
  }
}