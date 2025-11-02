"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

interface ColorPreferenceProps {
  deckCounts: Record<string, number>
  playCounts: Record<string, number>
}

export default function ColorPreference({ deckCounts, playCounts }: ColorPreferenceProps) {
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
    "Colourless": [],
  }

  // Color information for display
  const colorDisplayInfo: Record<string, { name: string; color: string; hex: string }> = {
    "W": { name: "White", color: "white", hex: "#FFFBF5" },
    "U": { name: "Blue", color: "blue", hex: "#0E68AB" },
    "B": { name: "Black", color: "black", hex: "#150B00" },
    "R": { name: "Red", color: "red", hex: "#D3202A" },
    "G": { name: "Green", color: "green", hex: "#00733E" },
  }

  const [viewMode, setViewMode] = useState<"decks" | "plays">("decks")
  const data = viewMode === "decks" ? deckCounts : playCounts

  // Calculate actual total (sum of all entries, not color fractions)
  const actualTotal = Object.values(data).reduce((sum, count) => sum + count, 0)

  // Calculate individual color counts (where multi-color decks contribute 1/n to each color)
  const colorCounts: Record<string, number> = {
    "W": 0,
    "U": 0,
    "B": 0,
    "R": 0,
    "G": 0,
  }

  Object.entries(data).forEach(([identity, count]) => {
    const colors = colorIdentityToColors[identity]
    if (colors && colors.length > 0) {
      // Each color gets 1/n of the count
      const fractionalCount = count / colors.length
      colors.forEach((color) => {
        colorCounts[color] += fractionalCount
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

  // Total for pie chart calculation (sum of fractional color counts)
  const totalColorFractions = pieData.reduce((sum, item) => sum + item.count, 0)

  // Calculate pie chart segments
  // IMPORTANT: Sweep flag 1 with this arc calculation produces a proper circle
  // Center white on 12 o'clock (vertical)
  // Since SVG is rotated -90°, we need to offset so white's center aligns with 12 o'clock
  // Find white's angle first to calculate the offset
  const whiteAngle = pieData[0] ? (pieData[0].count / totalColorFractions) * 360 : 0
  const startOffset = -whiteAngle / 2 // Offset by half of white's width to center it
  
  let currentAngle = startOffset // Start offset so white is centered at 12 o'clock
  const pieSegments = pieData.map((item) => {
    const percentage = (item.count / totalColorFractions) * 100
    const angle = (item.count / totalColorFractions) * 360
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
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)

  const maxIdentityCount = Math.max(...identityEntries.map(([, count]) => count))

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
          <div className="flex items-center justify-center gap-2 mb-4">
            <h3 className="text-sm font-semibold text-center">
              Overall Color Preference
            </h3>
            <div
              className="relative group"
              title={viewMode === "decks" 
                ? "Each deck contributes 1/n to each of its n colors. Total shows actual deck count."
                : "Each play contributes 1/n to each of its n colors. Total shows actual play count."}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-slate-400 cursor-help"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                {viewMode === "decks"
                  ? "Each deck contributes 1/n to each of its n colors. This ensures the total matches the actual number of decks."
                  : "Each play contributes 1/n to each of its n colors. This ensures the total matches the actual number of plays."}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg width="300" height="300" viewBox="0 0 300 300" className="transform -rotate-90">
                {pieSegments.map((segment) => (
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
                  <div className="text-2xl font-bold text-slate-900">{actualTotal}</div>
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
                <span className="text-sm text-slate-600">
                  ({item.count % 1 === 0 ? item.count.toFixed(0) : item.count.toFixed(2)})
                </span>
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

