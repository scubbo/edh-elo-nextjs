import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { validateMetadata } from '@/lib/utils';
import { MAGIC_COLOURS_SET, type MagicColour } from '@/lib/constants';
import prisma from '@/lib/db/client';

// Convert Scryfall color identity array to our format
function convertColorIdentity(colorIdentity: string[]): string | null {
  if (!colorIdentity || colorIdentity.length === 0) {
    return 'colourless';
  }
  
  // Sort colors in WUBRG order for consistent representation
  const colorOrder = ['W', 'U', 'B', 'R', 'G'];
  const sorted = [...colorIdentity].sort((a, b) => {
    const aIndex = colorOrder.indexOf(a);
    const bIndex = colorOrder.indexOf(b);
    return aIndex - bIndex;
  });
  
  const combined = sorted.join('');
  
  // Check if it's a valid Magic color combination
  if (MAGIC_COLOURS_SET.has(combined as MagicColour)) {
    return combined;
  }
  
  return null;
}

async function queryScryfall(cardName: string): Promise<{ colorIdentity: string[] | null; totalCards: number } | null> {
  try {
    // Use exact name search first (higher confidence)
    const exactUrl = `https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`;
    const exactResponse = await fetch(exactUrl, {
      headers: {
        'User-Agent': 'EDH-ELO-Tracker/1.0',
      },
    });
    
    if (exactResponse.ok) {
      const card = await exactResponse.json();
      return {
        colorIdentity: card.color_identity || [],
        totalCards: 1,
      };
    }
    
    // If exact match fails, try fuzzy search
    const fuzzyUrl = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(`name:"${cardName}"`)}`;
    const fuzzyResponse = await fetch(fuzzyUrl, {
      headers: {
        'User-Agent': 'EDH-ELO-Tracker/1.0',
      },
    });
    
    if (!fuzzyResponse.ok) {
      return null;
    }
    
    const searchResult = await fuzzyResponse.json();
    
    if (searchResult.total_cards === 1) {
      return {
        colorIdentity: searchResult.data[0]?.color_identity || [],
        totalCards: 1,
      };
    }
    
    return {
      colorIdentity: null,
      totalCards: searchResult.total_cards || 0,
    };
  } catch (error) {
    console.error(`Error querying Scryfall for "${cardName}":`, error);
    return null;
  }
}

export async function POST() {
  try {
    // Check admin authorization
    if (!(await isAdmin())) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    // Get all decks
    const allDecks = await prisma.deck.findMany();
    
    // Filter decks without colours in metadata
    const decks = allDecks.filter(deck => {
      const metadata = deck.metadata as Record<string, unknown> | null;
      return !metadata || !('colours' in metadata && metadata.colours);
    });

    const results = {
      processed: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const deck of decks) {
      results.processed++;
      
      try {
        // Query Scryfall for the deck name
        const scryfallResult = await queryScryfall(deck.name);
        
        if (!scryfallResult || scryfallResult.totalCards !== 1) {
          results.skipped++;
          continue;
        }
        
        if (!scryfallResult.colorIdentity) {
          results.skipped++;
          continue;
        }
        
        // Convert color identity to our format
        const colours = convertColorIdentity(scryfallResult.colorIdentity);
        
        if (!colours) {
          results.skipped++;
          continue;
        }
        
        // Get existing metadata or create new
        const currentMetadata = (deck.metadata as Record<string, unknown>) || {};
        
        // Update metadata with colours
        const updatedMetadata = {
          ...currentMetadata,
          colours,
        };
        
        // Validate the metadata
        const validation = validateMetadata(updatedMetadata);
        if (!validation.valid) {
          results.errors.push(`Deck ${deck.id} (${deck.name}): ${validation.error}`);
          continue;
        }
        
        // Update the deck
        await prisma.deck.update({
          where: { id: deck.id },
          data: { metadata: updatedMetadata },
        });
        
        results.updated++;
        
        // Be nice to Scryfall API - rate limit: 50-100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        results.errors.push(`Deck ${deck.id} (${deck.name}): ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      message: `Processed ${results.processed} decks. Updated ${results.updated}, skipped ${results.skipped}.`,
      results,
    });
  } catch (error) {
    console.error('Error auto-filling colours:', error);
    return NextResponse.json(
      { error: `Failed to auto-fill colours: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

