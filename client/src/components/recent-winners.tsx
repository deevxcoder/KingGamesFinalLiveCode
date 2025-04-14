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
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <Trophy className="w-5 h-5 text-amber-500 mr-2" />
            Recent Winners
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Award className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No recent winners yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl flex items-center">
          <Trophy className="w-5 h-5 text-amber-500 mr-2" />
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
                className="flex items-center px-6 py-2 hover:bg-muted/50 transition-colors cursor-default"
              >
                <div className="flex-shrink-0 mr-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="flex-grow min-w-0">
                  <div className="flex items-center">
                    <p className="font-medium truncate">
                      {winner.username}
                    </p>
                    <span className="mx-1.5 text-muted-foreground">•</span>
                    <p className="text-sm text-muted-foreground truncate">
                      {winner.game}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {timeAgo}
                  </p>
                </div>
                
                <div className="flex-shrink-0 ml-2 flex items-center">
                  {profit > 100 ? (
                    <Badge variant="outline" className="bg-green-100 text-green-800 flex items-center">
                      <Sparkles className="h-3 w-3 mr-1" />
                      +${formattedProfit}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-100 text-green-800">
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