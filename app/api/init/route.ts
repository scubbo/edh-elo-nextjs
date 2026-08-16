import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { backCalculateAllEloScores } from '@/lib/db/queries';

export async function POST() {
  try {
    // Check admin authorization
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

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