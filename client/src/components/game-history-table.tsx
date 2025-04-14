import { formatDistanceToNow } from "date-fns";
import { GameOutcome } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface Game {
  id: number;
  userId: number;
  betAmount: number;
  prediction: string;
  result: string;
  payout: number;
  createdAt: string;
}

interface GameHistoryTableProps {
  games: Game[];
  showFullHistory?: boolean;
}

export default function GameHistoryTable({ games, showFullHistory = false }: GameHistoryTableProps) {
  const [_, setLocation] = useLocation();
  
  // Display only the most recent 5 games unless showFullHistory is true
  const displayGames = showFullHistory ? games : games.slice(0, 5);
  
  // Format timestamp to relative time
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "Unknown time";
    }
  };

  return (
    <Card className="bg-card rounded-xl shadow-xl border border-border">
      <CardHeader>
        <CardTitle className="text-xl font-bold">
          {showFullHistory ? "Game History" : "Recent Games"}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Bet Amount</TableHead>
                <TableHead>Prediction</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGames.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                    No games played yet
                  </TableCell>
                </TableRow>
              ) : (
                displayGames.map((game) => {
                  const isWin = game.payout > 0;
                  return (
                    <TableRow key={game.id} className="hover:bg-accent/10 transition-colors">
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatTime(game.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        ${(game.betAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={
                          game.prediction === GameOutcome.HEADS
                            ? "bg-amber-100/10 text-amber-500 border-amber-500/20"
                            : "bg-red-100/10 text-red-500 border-red-500/20"
                        }>
                          {game.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={
                          game.result === GameOutcome.HEADS
                            ? "bg-amber-100/10 text-amber-500 border-amber-500/20"
                            : "bg-red-100/10 text-red-500 border-red-500/20"
                        }>
                          {game.result}
                        </Badge>
                      </TableCell>
                      <TableCell className={`whitespace-nowrap text-sm ${
                        isWin ? "text-green-500" : "text-red-500"
                      }`}>
                        {isWin ? "+" : ""}${((isWin ? game.payout - game.betAmount : -game.betAmount) / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
        
        {!showFullHistory && games.length > 0 && (
          <div className="mt-6 text-center">
            <Button 
              variant="link" 
              className="text-primary hover:text-primary/80"
              onClick={() => setLocation("/history")}
            >
              View All History
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
