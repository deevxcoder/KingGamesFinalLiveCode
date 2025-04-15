import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  winRate: number;
  totalBets: number;
  showFullWidth?: boolean;
}

export default function StatsCard({ winRate, totalBets, showFullWidth = false }: StatsCardProps) {
  return (
    <Card className={`bg-slate-900/70 shadow-lg border border-slate-800 ${showFullWidth ? 'w-full' : 'w-full lg:w-auto'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-sm text-slate-400">Win Rate</p>
            <p className="text-xl font-bold text-blue-400">{winRate}%</p>
          </div>
          <div className="mx-4 h-10 border-r border-slate-800"></div>
          <div>
            <p className="text-sm text-slate-400">Total Bets</p>
            <p className="text-xl font-bold text-slate-200">{totalBets}</p>
          </div>
          
          {showFullWidth && (
            <>
              <div className="mx-4 h-10 border-r border-slate-800"></div>
              <div>
                <p className="text-sm text-slate-400">Wins</p>
                <p className="text-xl font-bold text-indigo-400">{Math.round(totalBets * (winRate / 100))}</p>
              </div>
              <div className="mx-4 h-10 border-r border-slate-800"></div>
              <div>
                <p className="text-sm text-slate-400">Losses</p>
                <p className="text-xl font-bold text-slate-300">{totalBets - Math.round(totalBets * (winRate / 100))}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
