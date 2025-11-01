/**
 * VISUAL MOCKUP ONLY - This component demonstrates the color preference widget design
 * with fake data to show how all color combinations would be displayed.
 * This file will NOT be part of the final implementation.
 */

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

// Fake data for demonstration
const fakeDeckCounts: Record<string, number> = {
  // Mono colors
  "White": 2,
  "Blue": 1,
  "Black": 3,
  "Red": 5,
  "Green": 2,
  // Two-color pairs (Guilds)
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
  // Three-color Shards
  "Bant (WUG)": 1,
  "Esper (WUB)": 0,
  "Grixis (UBR)": 1,
  "Jund (BRG)": 2,
  "Naya (WRG)": 0,
  // Three-color Wedges
  "Abzan (WBG)": 1,
  "Jeskai (WUR)": 0,
  "Sultai (UBG)": 1,
  "Mardu (WBR)": 0,
  "Temur (URG)": 1,
  // Four-color
  "WUBR": 0,
  "WUBG": 1,
  "WURG": 0,
  "WBRG": 0,
  "UBRG": 0,
  // Five-color
  "WUBRG": 1,
}

const fakePlayCounts: Record<string, number> = {
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

// Map color identities to their constituent colors
const colorIdentityToColors: Record<string, string[]> = {
  "White": ["W"],
  "Blue": ["U"],
  "Black": ["B"],
  "Red": ["R"],
  "Green": ["G"],
  "Azorius (WU)": ["W", "U"],
  "Dimir (UB)": ["U", "B"],
  "Rakdos (BR)": ["B", "R"],
  "Gruul (RG)": ["R", "G"],
  "Selesnya (WG)": ["W", "G"],
  "Orzhov (WB)": ["W", "B"],
  "Izzet (UR)": ["U", "R"],
  "Golgari (BG)": ["B", "G"],
  "Boros (WR)": ["W", "R"],
  "Simic (UG)": ["U", "G"],
  "Bant (WUG)": ["W", "U", "G"],
  "Esper (WUB)": ["W", "U", "B"],
  "Grixis (UBR)": ["U", "B", "R"],
  "Jund (BRG)": ["B", "R", "G"],
  "Naya (WRG)": ["W", "R", "G"],
  "Abzan (WBG)": ["W", "B", "G"],
  "Jeskai (WUR)": ["W", "U", "R"],
  "Sultai (UBG)": ["U", "B", "G"],
  "Mardu (WBR)": ["W", "B", "R"],
  "Temur (URG)": ["U", "R", "G"],
  "WUBR": ["W", "U", "B", "R"],
  "WUBG": ["W", "U", "B", "G"],
  "WURG": ["W", "U", "R", "G"],
  "WBRG": ["W", "B", "R", "G"],
  "UBRG": ["U", "B", "R", "G"],
  "WUBRG": ["W", "U", "B", "R", "G"],
}

// Color information for display
const colorDisplayInfo: Record<string, { name: string; color: string; hex: string }> = {
  "W": { name: "White", color: "white", hex: "#FFFBF5" },
  "U": { name: "Blue", color: "blue", hex: "#0E68AB" },
  "B": { name: "Black", color: "black", hex: "#150B00" },
  "R": { name: "Red", color: "red", hex: "#D3202A" },
  "G": { name: "Green", color: "green", hex: "#00733E" },
}

export default function ColorPreferenceMockup() {
  const [viewMode, setViewMode] = useState<"decks" | "plays">("decks")
  const data = viewMode === "decks" ? fakeDeckCounts : fakePlayCounts

  // Calculate individual color counts (where multi-color decks contribute to each color)
  const colorCounts: Record<string, number> = {
    "W": 0,
    "U": 0,
    "B": 0,
    "R": 0,
    "G": 0,
  }

  Object.entries(data).forEach(([identity, count]) => {
    const colors = colorIdentityToColors[identity]
    if (colors) {
      colors.forEach((color) => {
        colorCounts[color] += count
      })
    }
  })

  // Convert to array for pie chart, ordered: White -> Blue -> Black -> Red -> Green
  const colorOrder = ["W", "U", "B", "R", "G"]
  const pieData = colorOrder
    .filter((colorKey) => colorCounts[colorKey] > 0)
    .map((colorKey) => {
      const displayInfo = colorDisplayInfo[colorKey]
      return {
        color: colorKey,
        count: colorCounts[colorKey],
        name: displayInfo.name,
        colorName: displayInfo.color,
        hex: displayInfo.hex,
      }
    })

  const totalColors = pieData.reduce((sum, item) => sum + item.count, 0)

  // Calculate pie chart segments
  // IMPORTANT: Sweep flag 1 with this arc calculation produces a proper circle
  // Center white on 12 o'clock (vertical)
  // Since SVG is rotated -90°, we need to offset so white's center aligns with 12 o'clock
  // Find white's angle first to calculate the offset
  const whiteAngle = pieData[0] ? (pieData[0].count / totalColors) * 360 : 0
  const startOffset = -whiteAngle / 2 // Offset by half of white's width to center it
  
  let currentAngle = startOffset // Start offset so white is centered at 12 o'clock
  const pieSegments = pieData.map((item) => {
    const percentage = (item.count / totalColors) * 100
    const angle = (item.count / totalColors) * 360
    const startAngle = currentAngle
    currentAngle += angle

    // Calculate path for SVG arc
    const radius = 120
    const x1 = 150 + radius * Math.cos((startAngle * Math.PI) / 180)
    const y1 = 150 + radius * Math.sin((startAngle * Math.PI) / 180)
    const x2 = 150 + radius * Math.cos((currentAngle * Math.PI) / 180)
    const y2 = 150 + radius * Math.sin((currentAngle * Math.PI) / 180)
    const largeArc = angle > 180 ? 1 : 0

    const pathData = `M 150 150 L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`

    return {
      ...item,
      percentage,
      pathData,
      startAngle,
      endAngle: currentAngle,
    }
  })

  // Get specific color identity counts for bars (sorted, non-zero)
  const identityEntries = Object.entries(data)
    .filter(([_, count]) => count > 0)
    .sort(([_, a], [__, b]) => b - a)

  const maxIdentityCount = Math.max(...identityEntries.map(([_, count]) => count))

  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Color Preferences</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === "decks" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("decks")}
            >
              By Deck Ownership
            </Button>
            <Button
              variant={viewMode === "plays" ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode("plays")}
            >
              By Play Count
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Pie Chart - Individual Color Preferences */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold mb-4 text-center">
            Overall Color Preference
          </h3>
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
                {pieSegments.map((segment, idx) => (
                  <path
                    key={segment.color}
                    d={segment.pathData}
                    fill={segment.hex}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  />
                ))}
              </svg>
              {/* Legend */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center bg-white/80 rounded-full px-4 py-2 shadow-md">
                  <div className="text-xs text-slate-600">
                    {viewMode === "decks" ? "Total Decks" : "Total Plays"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{totalColors}</div>
                </div>
              </div>
            </div>
          </div>
          {/* Color legend below pie chart */}
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
            {pieData.map((item) => (
              <div key={item.color} className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-slate-300"
                  style={{ backgroundColor: item.hex }}
                />
                <span className="text-sm font-medium">{item.name}</span>
                <span className="text-sm text-slate-600">({item.count})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Horizontal Bars - Specific Color Identity Combinations */}
        <div className="border-t pt-6">
          <h3 className="text-sm font-semibold mb-4">
            Color Identity Breakdown
          </h3>
          <div className="space-y-3">
            {identityEntries.map(([identity, count]) => {
              const percentage = (count / maxIdentityCount) * 100
              const colors = colorIdentityToColors[identity] || []

              return (
                <div key={identity} className="flex items-center gap-3">
                  {/* Fixed-width left section for alignment */}
                  <div className="flex items-center gap-2" style={{ width: "200px", minWidth: "200px" }}>
                    <div className="text-sm font-medium flex-shrink-0">{identity}</div>
                    {/* Color indicators */}
                    <div className="flex gap-1">
                      {colors.map((color) => (
                        <div
                          key={color}
                          className="w-4 h-4 rounded-full border border-slate-300 flex-shrink-0"
                          style={{ backgroundColor: colorDisplayInfo[color].hex }}
                          title={colorDisplayInfo[color].name}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 bg-slate-200 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-end pr-2 transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="text-xs font-semibold text-white">{count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
