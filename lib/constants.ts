export const ADMIN_EMAIL = "scubbojj@gmail.com"

export const MAGIC_COLOURS = [
  // Single colors
  "W", "U", "B", "R", "G",
  // Guilds (2-color)
  "WU", "WB", "WR", "WG", "UB", "UR", "UG", "BR", "BG", "RG",
  // Shards/Wedges (3-color)
  "WUB", "WUR", "WUG", "WBR", "WBG", "WRG", "UBR", "UBG", "URG", "BRG",
  // 4-color
  "WUBR", "WUBG", "WURG", "WBRG", "UBRG",
  // 5-color
  "WUBRG",
  // Colorless
  "colourless"
] as const

export type MagicColour = typeof MAGIC_COLOURS[number]

export const MAGIC_COLOURS_SET = new Set(MAGIC_COLOURS)
