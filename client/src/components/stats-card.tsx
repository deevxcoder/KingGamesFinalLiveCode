import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  winRate: number;
  totalBets: number;
  showFullWidth?: boolean;
}

export default function StatsCard({ winRate, totalBets, showFullWidth = false }: StatsCardProps) {
  return (
    <Card className={`bg-card shadow-lg border border-border ${showFullWidth ? 'w-full' : 'w-full lg:w-auto'}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between w-full">
          <div>
            <p className="text-sm text-muted-foreground">Win Rate</p>
            <p className="text-xl font-bold">{winRate}%</p>
          </div>
          <div className="mx-4 h-10 border-r border-border"></div>
          <div>
            <p className="text-sm text-muted-foreground">Total Bets</p>
            <p className="text-xl font-bold">{totalBets}</p>
          </div>
          
          {showFullWidth && (
            <>
              <div className="mx-4 h-10 border-r border-border"></div>
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-xl font-bold">{Math.round(totalBets * (winRate / 100))}</p>
              </div>
              <div className="mx-4 h-10 border-r border-border"></div>
              <div>
                <p className="text-sm text-muted-foreground">Losses</p>
                <p className="text-xl font-bold">{totalBets - Math.round(totalBets * (winRate / 100))}</p>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
