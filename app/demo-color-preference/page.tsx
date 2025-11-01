import ColorPreference from "@/components/ColorPreference"

// Mock data for demo purposes
const mockDeckCounts: Record<string, number> = {
  "White": 2,
  "Blue": 1,
  "Black": 3,
  "Red": 5,
  "Green": 2,
  "Azorius (WU)": 1,
  "Dimir (UB)": 2,
  "Rakdos (BR)": 1,
  "Gruul (RG)": 3,
  "Selesnya (WG)": 0,
  "Orzhov (WB)": 1,
  "Izzet (UR)": 2,
  "Golgari (BG)": 1,
  "Boros (WR)": 1,
  "Simic (UG)": 0,
  "Bant (WUG)": 1,
  "Esper (WUB)": 0,
  "Grixis (UBR)": 1,
  "Jund (BRG)": 2,
  "Naya (WRG)": 0,
  "Abzan (WBG)": 1,
  "Jeskai (WUR)": 0,
  "Sultai (UBG)": 1,
  "Mardu (WBR)": 0,
  "Temur (URG)": 1,
  "WUBR": 0,
  "WUBG": 1,
  "WURG": 0,
  "WBRG": 0,
  "UBRG": 0,
  "WUBRG": 1,
}

const mockPlayCounts: Record<string, number> = {
  "White": 8,
  "Blue": 3,
  "Black": 15,
  "Red": 25,
  "Green": 7,
  "Azorius (WU)": 5,
  "Dimir (UB)": 12,
  "Rakdos (BR)": 4,
  "Gruul (RG)": 18,
  "Selesnya (WG)": 0,
  "Orzhov (WB)": 6,
  "Izzet (UR)": 10,
  "Golgari (BG)": 3,
  "Boros (WR)": 5,
  "Simic (UG)": 0,
  "Bant (WUG)": 7,
  "Esper (WUB)": 0,
  "Grixis (UBR)": 8,
  "Jund (BRG)": 14,
  "Naya (WRG)": 0,
  "Abzan (WBG)": 9,
  "Jeskai (WUR)": 0,
  "Sultai (UBG)": 6,
  "Mardu (WBR)": 0,
  "Temur (URG)": 11,
  "WUBR": 0,
  "WUBG": 4,
  "WURG": 0,
  "WBRG": 0,
  "UBRG": 0,
  "WUBRG": 8,
}

export default function ColorPreferenceDemoPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Color Preference Widget Demo</h1>
        <p className="text-slate-600 mb-8">
          This is a demo page showing the color preference statistics widget with mock data.
          Navigate to: <code className="bg-slate-100 px-2 py-1 rounded">/demo-color-preference</code>
        </p>
        <ColorPreference deckCounts={mockDeckCounts} playCounts={mockPlayCounts} />
      </div>
    </div>
  )
}

