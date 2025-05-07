import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

// Interface for a cricket toss match
interface CricketTossMatch {
  id: number;
  teamA: string;
  teamB: string;
  description?: string;
  matchTime: string;
  teamAImage?: string;
  teamBImage?: string;
  coverImage?: string;
  oddTeamA: number;
  oddTeamB: number;
  result: string;
  status: string;
  createdAt: string;
}

// Interface for user bets
interface BetHistory {
  id: number;
  userId: number;
  gameType: string;
  betAmount: number;
  prediction: string;
  result: string | null;
  payout: number;
  createdAt: string;
  gameData: {
    teamA: string;
    teamB: string;
    teamAImage?: string;
    teamBImage?: string;
    coverImage?: string;
    oddTeamA: number;
    oddTeamB: number;
    matchTime: string;
  };
}

export default function CricketTossPage() {
  const [selectedMatch, setSelectedMatch] = useState<CricketTossMatch | null>(null);
  const [betAmount, setBetAmount] = useState<string>("100");
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query to fetch open cricket toss matches
  const { data: openMatches = [], isLoading: loadingMatches } = useQuery({
    queryKey: ["/api/cricket-toss/open-matches"],
    staleTime: 30000, // 30 seconds
  });

  // Query to fetch user's betting history
  const { data: betHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ["/api/cricket-toss/my-bets"],
    staleTime: 30000, // 30 seconds
  });

  // Mutation to place a bet
  const placeBetMutation = useMutation({
    mutationFn: async ({
      matchId,
      betAmount,
      prediction,
    }: {
      matchId: number;
      betAmount: number;
      prediction: string;
    }) => {
      return await apiRequest("/api/cricket-toss/bet", "POST", {
        matchId,
        betAmount,
        prediction,
      });
    },
    onSuccess: () => {
      toast({
        title: "Bet Placed Successfully",
        description: "Your bet has been placed on the cricket toss match.",
      });
      setBetAmount("100");
      setSelectedTeam(null);
      setSelectedMatch(null);
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss/my-bets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user"] }); // Refresh user balance
    },
    onError: (error: Error) => {
      toast({
        title: "Error Placing Bet",
        description: error.message || "Failed to place your bet. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Function to handle placing a bet
  const handlePlaceBet = () => {
    if (!selectedMatch || !selectedTeam || !betAmount) {
      toast({
        title: "Incomplete Bet",
        description: "Please select a team and enter a bet amount.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(betAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Bet Amount",
        description: "Please enter a valid bet amount.",
        variant: "destructive",
      });
      return;
    }

    placeBetMutation.mutate({
      matchId: selectedMatch.id,
      betAmount: amount,
      prediction: selectedTeam,
    });
  };

  // Function to format odds from integer to decimal
  const formatOdds = (odds: number) => {
    return (odds / 100).toFixed(2);
  };

  // Function to calculate potential win amount
  const calculatePotentialWin = (amount: string, team: string | null) => {
    if (!selectedMatch || !team || !amount) return 0;
    
    const betAmountNum = parseInt(amount);
    if (isNaN(betAmountNum)) return 0;
    
    const odds = team === "team_a" ? selectedMatch.oddTeamA : selectedMatch.oddTeamB;
    return betAmountNum * (odds / 100);
  };

  // Format the team name based on the prediction value
  const formatPrediction = (prediction: string, bet: BetHistory) => {
    if (prediction === "team_a") return bet.gameData.teamA;
    if (prediction === "team_b") return bet.gameData.teamB;
    return prediction;
  };

  // Get appropriate badge for match status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500">Open</Badge>;
      case "closed":
        return <Badge className="bg-yellow-500">Closed</Badge>;
      case "resulted":
        return <Badge className="bg-blue-500">Resulted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get result text for bet history
  const getResultText = (bet: BetHistory) => {
    if (!bet.result) return "Pending";
    if (bet.result === bet.prediction) return "Won";
    return "Lost";
  };

  // Get class for result text
  const getResultClass = (bet: BetHistory) => {
    if (!bet.result) return "text-yellow-600";
    if (bet.result === bet.prediction) return "text-green-600 font-bold";
    return "text-red-600";
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Cricket Toss</h1>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="matches">Available Matches</TabsTrigger>
          <TabsTrigger value="history">My Betting History</TabsTrigger>
        </TabsList>

        <TabsContent value="matches">
          {loadingMatches ? (
            <div className="flex justify-center p-8">Loading cricket toss matches...</div>
          ) : openMatches && openMatches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {openMatches.map((match: CricketTossMatch) => (
                <Card key={match.id} className={selectedMatch?.id === match.id ? "border-primary" : ""}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">
                        {match.teamA} vs {match.teamB}
                      </CardTitle>
                      {getStatusBadge(match.status)}
                    </div>
                    <CardDescription>
                      {match.description || "Cricket Toss Match"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Match Time:</span>
                        <span>{formatDate(new Date(match.matchTime))}</span>
                      </div>
                      <Separator />
                      {match.coverImage && (
                        <div className="mb-4">
                          <img 
                            src={match.coverImage} 
                            alt={`${match.teamA} vs ${match.teamB}`}
                            className="w-full h-32 object-cover rounded-md" 
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-2 rounded border">
                          <div className="font-bold">{match.teamA}</div>
                          <div className="text-sm">Odds: {formatOdds(match.oddTeamA)}</div>
                        </div>
                        <div className="text-center p-2 rounded border">
                          <div className="font-bold">{match.teamB}</div>
                          <div className="text-sm">Odds: {formatOdds(match.oddTeamB)}</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      onClick={() => {
                        setSelectedMatch(match);
                        setSelectedTeam(null);
                        setBetAmount("100");
                      }}
                    >
                      Place Bet
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>No Matches Available</AlertTitle>
              <AlertDescription>
                There are no open cricket toss matches available for betting at this time.
              </AlertDescription>
            </Alert>
          )}

          {selectedMatch && (
            <div className="mt-8">
              <Card>
                <CardHeader>
                  <CardTitle>Place Your Bet</CardTitle>
                  <CardDescription>
                    {selectedMatch.teamA} vs {selectedMatch.teamB} - {formatDate(new Date(selectedMatch.matchTime))}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    {selectedMatch.coverImage && (
                      <div className="mb-2">
                        <img 
                          src={selectedMatch.coverImage} 
                          alt={`${selectedMatch.teamA} vs ${selectedMatch.teamB}`}
                          className="w-full h-32 object-cover rounded-md" 
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={selectedTeam === "team_a" ? "default" : "outline"}
                        className="h-16"
                        onClick={() => setSelectedTeam("team_a")}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div>{selectedMatch.teamA}</div>
                          <div className="text-sm">Odds: {formatOdds(selectedMatch.oddTeamA)}</div>
                        </div>
                      </Button>
                      <Button
                        variant={selectedTeam === "team_b" ? "default" : "outline"}
                        className="h-16"
                        onClick={() => setSelectedTeam("team_b")}
                      >
                        <div className="flex flex-col items-center justify-center gap-1">
                          <div>{selectedMatch.teamB}</div>
                          <div className="text-sm">Odds: {formatOdds(selectedMatch.oddTeamB)}</div>
                        </div>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div>
                        <label htmlFor="betAmount" className="text-sm font-medium mb-1 block">
                          Bet Amount (₹)
                        </label>
                        <Input
                          id="betAmount"
                          type="number"
                          value={betAmount}
                          onChange={(e) => setBetAmount(e.target.value)}
                          min="10"
                          step="10"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-1 block">
                          Potential Win
                        </label>
                        <div className="text-xl font-bold">
                          ₹{calculatePotentialWin(betAmount, selectedTeam).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline" onClick={() => setSelectedMatch(null)}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handlePlaceBet} 
                    disabled={!selectedTeam || placeBetMutation.isPending}
                  >
                    {placeBetMutation.isPending ? "Placing Bet..." : "Place Bet"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="history">
          {loadingHistory ? (
            <div className="flex justify-center p-8">Loading your bet history...</div>
          ) : betHistory && betHistory.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Match</TableHead>
                  <TableHead>Bet On</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betHistory.map((bet: BetHistory) => (
                  <TableRow key={bet.id}>
                    <TableCell>{formatDate(new Date(bet.createdAt))}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {bet.gameData.coverImage && (
                          <img 
                            src={bet.gameData.coverImage} 
                            alt={`${bet.gameData.teamA} vs ${bet.gameData.teamB}`}
                            className="h-10 w-full max-w-[120px] object-cover rounded-md mb-1" 
                          />
                        )}
                        <div className="flex items-center">
                          <span>{bet.gameData.teamA}</span>
                          <span className="mx-1 text-xs text-gray-500">vs</span>
                          <span>{bet.gameData.teamB}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span>{formatPrediction(bet.prediction, bet)}</span>
                      </div>
                    </TableCell>
                    <TableCell>₹{bet.betAmount}</TableCell>
                    <TableCell>
                      {formatOdds(
                        bet.prediction === "team_a"
                          ? bet.gameData.oddTeamA
                          : bet.gameData.oddTeamB
                      )}
                    </TableCell>
                    <TableCell className={getResultClass(bet)}>
                      {getResultText(bet)}
                    </TableCell>
                    <TableCell>
                      {bet.payout > 0 ? `₹${bet.payout}` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>No Betting History</AlertTitle>
              <AlertDescription>
                You haven't placed any bets on cricket toss matches yet.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}