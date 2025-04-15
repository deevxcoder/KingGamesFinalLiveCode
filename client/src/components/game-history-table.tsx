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
    <Card className="bg-slate-900/70 rounded-xl shadow-xl border border-slate-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-slate-200">
          {showFullHistory ? "Game History" : "Recent Games"}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800">
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Bet Amount</TableHead>
                <TableHead className="text-slate-400">Prediction</TableHead>
                <TableHead className="text-slate-400">Result</TableHead>
                <TableHead className="text-slate-400">Profit/Loss</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayGames.length === 0 ? (
                <TableRow className="border-slate-800">
                  <TableCell colSpan={5} className="text-center py-4 text-slate-500">
                    No games played yet
                  </TableCell>
                </TableRow>
              ) : (
                displayGames.map((game) => {
                  const isWin = game.payout > 0;
                  return (
                    <TableRow key={game.id} className="hover:bg-slate-800/50 transition-colors border-slate-800">
                      <TableCell className="whitespace-nowrap text-sm text-slate-400">
                        {formatTime(game.createdAt)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-slate-300">
                        ${(game.betAmount / 100).toFixed(2)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={
                          game.prediction === GameOutcome.HEADS
                            ? "bg-indigo-900/30 text-indigo-300 border-indigo-500/30"
                            : "bg-blue-900/30 text-blue-300 border-blue-500/30"
                        }>
                          {game.prediction}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline" className={
                          game.result === GameOutcome.HEADS
                            ? "bg-indigo-900/30 text-indigo-300 border-indigo-500/30"
                            : "bg-blue-900/30 text-blue-300 border-blue-500/30"
                        }>
                          {game.result}
                        </Badge>
                      </TableCell>
                      <TableCell className={`whitespace-nowrap text-sm ${
                        isWin ? "text-blue-400" : "text-slate-400"
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
              className="text-blue-400 hover:text-blue-300"
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
