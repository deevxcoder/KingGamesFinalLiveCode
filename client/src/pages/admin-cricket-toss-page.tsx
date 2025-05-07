import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

// Define the schema for creating a cricket toss match
const createCricketTossSchema = z.object({
  teamA: z.string().min(1, "Team A is required"),
  teamB: z.string().min(1, "Team B is required"),
  description: z.string().optional(),
  matchTime: z.string().min(1, "Match time is required"),
  oddTeamA: z.string().min(1, "Odd for Team A is required"),
  oddTeamB: z.string().min(1, "Odd for Team B is required"),
});

// Type for a cricket toss match
interface CricketTossMatch {
  id: number;
  teamA: string;
  teamB: string;
  description?: string;
  matchTime: string;
  oddTeamA: number;
  oddTeamB: number;
  result: string;
  status: string;
  createdAt: string;
}

// Types for the betting data
interface BetData {
  id: number;
  userId: number;
  username: string;
  betAmount: number;
  prediction: string;
  potential: number;
  result: string | null;
  payout: number;
}

export default function AdminCricketTossPage() {
  const [selectedMatch, setSelectedMatch] = useState<CricketTossMatch | null>(null);
  const [showBets, setShowBets] = useState(false);
  const [open, setOpen] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form setup for creating a new cricket toss match
  const form = useForm<z.infer<typeof createCricketTossSchema>>({
    resolver: zodResolver(createCricketTossSchema),
    defaultValues: {
      teamA: "",
      teamB: "",
      description: "",
      matchTime: "",
      oddTeamA: "200", // Default 2.00 odds
      oddTeamB: "200", // Default 2.00 odds
    },
  });

  // Query to fetch cricket toss matches
  const { data: cricketTossMatches = [], isLoading } = useQuery({
    queryKey: ["/api/cricket-toss/matches"],
    staleTime: 10000,
  });

  // Query to fetch bet data for a selected match
  const { data: betData = [], isLoading: isLoadingBets } = useQuery({
    queryKey: ["/api/cricket-toss/bets", selectedMatch?.id],
    enabled: showBets && !!selectedMatch,
    staleTime: 5000,
  });

  // Mutation to create a new cricket toss match
  const createCricketTossMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createCricketTossSchema>) => {
      const payload = {
        ...values,
        oddTeamA: parseInt(values.oddTeamA),
        oddTeamB: parseInt(values.oddTeamB),
      };
      return await apiRequest("/api/cricket-toss/matches", "POST", payload);
    },
    onSuccess: () => {
      toast({
        title: "Cricket Toss Match Created",
        description: "The cricket toss match has been created successfully.",
      });
      form.reset();
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss/matches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create cricket toss match",
        variant: "destructive",
      });
    },
  });

  // Mutation to close betting for a match
  const closeBettingMutation = useMutation({
    mutationFn: async (matchId: number) => {
      return await apiRequest(`/api/cricket-toss/matches/${matchId}/close`, "POST");
    },
    onSuccess: () => {
      toast({
        title: "Betting Closed",
        description: "Betting has been closed for this match.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss/matches"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to close betting",
        variant: "destructive",
      });
    },
  });

  // Mutation to declare result for a match
  const declareResultMutation = useMutation({
    mutationFn: async ({ matchId, result }: { matchId: number; result: string }) => {
      return await apiRequest(`/api/cricket-toss/matches/${matchId}/result`, "POST", { result });
    },
    onSuccess: () => {
      toast({
        title: "Result Declared",
        description: "The result has been declared and payouts processed.",
      });
      setDeclareOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss/matches"] });
      if (selectedMatch) {
        queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss/bets", selectedMatch.id] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to declare result",
        variant: "destructive",
      });
    },
  });

  // Handle form submission for creating a new cricket toss match
  const onSubmit = (values: z.infer<typeof createCricketTossSchema>) => {
    createCricketTossMutation.mutate(values);
  };

  // Function to handle closing betting for a match
  const handleCloseBetting = (matchId: number) => {
    if (confirm("Are you sure you want to close betting for this match?")) {
      closeBettingMutation.mutate(matchId);
    }
  };

  // Function to handle declaring result for a match
  const handleDeclareResult = (result: string) => {
    if (!selectedMatch) return;
    
    if (confirm(`Are you sure you want to declare ${result === 'team_a' ? selectedMatch.teamA : selectedMatch.teamB} as the winner?`)) {
      declareResultMutation.mutate({
        matchId: selectedMatch.id,
        result,
      });
    }
  };

  // Function to format odds for display (converts from integer to decimal representation)
  const formatOdds = (odds: number) => {
    return (odds / 100).toFixed(2);
  };

  // Function to get the status badge for a match
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

  // Format the team name based on the prediction value
  const formatPrediction = (prediction: string, match: CricketTossMatch) => {
    if (prediction === "team_a") return match.teamA;
    if (prediction === "team_b") return match.teamB;
    return prediction;
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Cricket Toss Management</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create New Match</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Cricket Toss Match</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="teamA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team A</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter team A name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter team B name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Enter match description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="matchTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Time</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="datetime-local"
                          min={new Date().toISOString().slice(0, 16)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="oddTeamA"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odd for Team A</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="100"
                            step="1"
                            placeholder="200 (2.00)"
                          />
                        </FormControl>
                        <FormDescription>Enter as 200 for 2.00 odds</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="oddTeamB"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Odd for Team B</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type="number"
                            min="100"
                            step="1"
                            placeholder="200 (2.00)"
                          />
                        </FormControl>
                        <FormDescription>Enter as 200 for 2.00 odds</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCricketTossMutation.isPending}
                  >
                    {createCricketTossMutation.isPending ? "Creating..." : "Create Match"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-8">Loading cricket toss matches...</div>
      ) : cricketTossMatches && cricketTossMatches.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Cricket Toss Matches</CardTitle>
            <CardDescription>
              Manage cricket toss matches and view betting activity
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Teams</TableHead>
                  <TableHead>Match Time</TableHead>
                  <TableHead>Odds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cricketTossMatches.map((match: CricketTossMatch) => (
                  <TableRow key={match.id}>
                    <TableCell>{match.id}</TableCell>
                    <TableCell>
                      {match.teamA} vs {match.teamB}
                      {match.description && (
                        <div className="text-xs text-gray-500">{match.description}</div>
                      )}
                    </TableCell>
                    <TableCell>{formatDate(new Date(match.matchTime))}</TableCell>
                    <TableCell>
                      {match.teamA}: {formatOdds(match.oddTeamA)} | {match.teamB}: {formatOdds(match.oddTeamB)}
                    </TableCell>
                    <TableCell>{getStatusBadge(match.status)}</TableCell>
                    <TableCell>
                      {match.result === "pending" ? (
                        "Pending"
                      ) : match.result === "team_a" ? (
                        <span className="font-medium text-green-600">{match.teamA}</span>
                      ) : match.result === "team_b" ? (
                        <span className="font-medium text-green-600">{match.teamB}</span>
                      ) : (
                        match.result
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMatch(match);
                            setShowBets(true);
                          }}
                        >
                          View Bets
                        </Button>
                        {match.status === "open" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleCloseBetting(match.id)}
                          >
                            Close Betting
                          </Button>
                        )}
                        {match.status === "closed" && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => {
                              setSelectedMatch(match);
                              setDeclareOpen(true);
                            }}
                          >
                            Declare Result
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <ExclamationTriangleIcon className="h-4 w-4" />
          <AlertTitle>No cricket toss matches found</AlertTitle>
          <AlertDescription>
            Create your first cricket toss match to get started.
          </AlertDescription>
        </Alert>
      )}

      {showBets && selectedMatch && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">
              Bets for {selectedMatch.teamA} vs {selectedMatch.teamB}
            </h2>
            <Button
              variant="outline"
              onClick={() => {
                setShowBets(false);
                setSelectedMatch(null);
              }}
            >
              Close
            </Button>
          </div>
          <Separator className="mb-4" />
          {isLoadingBets ? (
            <div className="flex justify-center p-8">Loading bet data...</div>
          ) : betData && betData.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Bet Amount</TableHead>
                  <TableHead>Prediction</TableHead>
                  <TableHead>Potential Win</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Payout</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {betData.map((bet: BetData) => (
                  <TableRow key={bet.id}>
                    <TableCell>{bet.id}</TableCell>
                    <TableCell>{bet.username}</TableCell>
                    <TableCell>₹{bet.betAmount}</TableCell>
                    <TableCell>{formatPrediction(bet.prediction, selectedMatch)}</TableCell>
                    <TableCell>₹{bet.potential}</TableCell>
                    <TableCell>
                      {bet.result === null
                        ? "Pending"
                        : bet.result === bet.prediction
                        ? "Win"
                        : "Loss"}
                    </TableCell>
                    <TableCell>₹{bet.payout || 0}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Alert>
              <ExclamationTriangleIcon className="h-4 w-4" />
              <AlertTitle>No bets found</AlertTitle>
              <AlertDescription>
                There are no bets placed on this cricket toss match yet.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Dialog for declaring result */}
      <Dialog open={declareOpen && !!selectedMatch} onOpenChange={setDeclareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Cricket Toss Result</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">
              Select the winner for {selectedMatch?.teamA} vs {selectedMatch?.teamB}:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                onClick={() => handleDeclareResult("team_a")}
                className="h-16"
              >
                {selectedMatch?.teamA} Wins
              </Button>
              <Button
                onClick={() => handleDeclareResult("team_b")}
                className="h-16"
              >
                {selectedMatch?.teamB} Wins
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}