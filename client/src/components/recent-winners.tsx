import { formatDistanceToNow } from "date-fns";
import { Trophy, Award, User, Sparkles } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Winner {
  id: number;
  username: string;
  game: string;
  amount: number;
  payout: number;
  createdAt: string;
}

interface RecentWinnersProps {
  winners: Winner[];
}

export default function RecentWinners({ winners }: RecentWinnersProps) {
  if (winners.length === 0) {
    return (
      <Card className="bg-slate-900/70 border-slate-800">
        <CardHeader>
          <CardTitle className="text-xl flex items-center text-slate-200">
            <Trophy className="w-5 h-5 text-blue-400 mr-2" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Award className="h-12 w-12 text-slate-700 mb-2" />
            <p className="text-slate-500 text-sm">No recent winners yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/70 border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl flex items-center text-slate-200">
          <Trophy className="w-5 h-5 text-blue-400 mr-2" />
          Recent Winners
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="space-y-1">
          {winners.map((winner) => {
            const profit = (winner.payout - winner.amount) / 100;
            const formattedProfit = profit.toFixed(2);
            const timeAgo = formatDistanceToNow(new Date(winner.createdAt), { addSuffix: true });
            
            return (
              <div 
                key={winner.id}
                className="flex items-center px-6 py-2 hover:bg-slate-800/50 transition-colors cursor-default"
              >
                <div className="flex-shrink-0 mr-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-r from-indigo-800 to-blue-700 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center">
                    <p className="font-medium truncate text-slate-200">
                      {winner.username}
                    </p>
                    <span className="mx-1.5 text-slate-600">•</span>
                    <p className="text-sm text-slate-400 truncate">
                      {winner.game}
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {timeAgo}
                  </p>
                </div>
                
                <div className="flex-shrink-0 ml-2 flex items-center">
                  {profit > 100 ? (
                    <Badge variant="outline" className="bg-indigo-900/30 text-indigo-300 border-indigo-500/30 flex items-center">
                      <Sparkles className="h-3 w-3 mr-1" />
                      +${formattedProfit}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-500/30">
                      +${formattedProfit}
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}