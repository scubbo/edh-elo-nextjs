import { Badge } from "@/components/ui/badge"

interface DeckSummaryProps {
  deck: {
    id: number;
    name: string;
    elo: number;
    winRate: number;
    gamesPlayed: number;
  };
  showBorder?: boolean;
}

export default function DeckSummary({ deck, showBorder = true }: DeckSummaryProps) {
  // Calculate gradient color for ELO (1000-1200 range)
  const eloPercent = Math.min(Math.max((deck.elo - 900) / 300, 0), 1)
  const eloColor = eloPercent > 0.6 ? 'from-green-50 to-green-100 text-green-800 border-green-200' :
                   eloPercent > 0.3 ? 'from-blue-50 to-blue-100 text-blue-800 border-blue-200' :
                   'from-slate-50 to-slate-100 text-slate-800 border-slate-200'

  // Calculate gradient color for win rate
  const winRateColor = deck.winRate >= 50 ? 'from-green-50 to-green-100 text-green-800 border-green-200' :
                      deck.winRate >= 25 ? 'from-amber-50 to-amber-100 text-amber-800 border-amber-200' :
                      'from-red-50 to-red-100 text-red-800 border-red-200'

  const borderClasses = showBorder ? "pb-3 border-b border-slate-200 last:border-0 last:pb-0" : ""

  return (
    <div className={borderClasses}>
      <div className="font-bold text-slate-900 mb-2">{deck.name}</div>
      <div className="flex gap-2 flex-wrap">
        <Badge
          variant="outline"
          className={`bg-gradient-to-br ${eloColor} border font-semibold`}
        >
          {deck.elo} ELO
        </Badge>
        <Badge
          variant="outline"
          className={`bg-gradient-to-br ${winRateColor} border font-semibold`}
        >
          {deck.winRate.toFixed(1)}% WR
        </Badge>
        <Badge
          variant="outline"
          className="bg-gradient-to-br from-slate-50 to-slate-100 text-slate-700 border-slate-200 font-semibold"
        >
          {deck.gamesPlayed} Game{deck.gamesPlayed === 1 ? "" : "s"}
        </Badge>
      </div>
    </div>
  )
}
