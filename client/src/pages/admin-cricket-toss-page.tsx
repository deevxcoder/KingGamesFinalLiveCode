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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/dashboard-layout";
import { Check, X, MoreVertical } from "lucide-react";

// Define the schema for creating a cricket toss match
const createCricketTossSchema = z.object({
  teamA: z.string().min(1, "Team A is required"),
  teamB: z.string().min(1, "Team B is required"),
  description: z.string().optional(),
  matchTime: z.string().min(1, "Match time is required"),
  teamAImage: z.instanceof(File).optional(),
  teamBImage: z.instanceof(File).optional(),
  // We'll use fixed odds: 2.00 for both teams
});

// Type for a cricket toss match
interface CricketTossMatch {
  id: number;
  teamA: string;
  teamB: string;
  description?: string;
  matchTime: string;
  teamAImage?: string;
  teamBImage?: string;
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
  const [open, setOpen] = useState(false);
  const [declareOpen, setDeclareOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const [matchToClose, setMatchToClose] = useState<number | null>(null);
  const [teamAPreview, setTeamAPreview] = useState<string | null>(null);
  const [teamBPreview, setTeamBPreview] = useState<string | null>(null);
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
    },
  });

  // Query to fetch cricket toss matches
  const { data: cricketTossMatches = [], isLoading } = useQuery({
    queryKey: ["/api/cricket-toss/matches"],
    staleTime: 10000,
  });

  // Mutation to create a new cricket toss match
  const createCricketTossMutation = useMutation({
    mutationFn: async (values: z.infer<typeof createCricketTossSchema>) => {
      // Create form data to handle file uploads
      const formData = new FormData();
      formData.append("teamA", values.teamA);
      formData.append("teamB", values.teamB);
      formData.append("matchTime", values.matchTime);
      if (values.description) formData.append("description", values.description);
      
      // Use fixed odds: 2.00 for both teams
      formData.append("oddTeamA", "200");
      formData.append("oddTeamB", "200");
      
      // Append image files if provided
      if (values.teamAImage) formData.append("teamAImage", values.teamAImage);
      if (values.teamBImage) formData.append("teamBImage", values.teamBImage);
      
      // Use fetch directly for FormData
      const response = await fetch("/api/cricket-toss/matches", {
        method: "POST",
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create cricket toss match");
      }
      
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Cricket Toss Match Created",
        description: "The cricket toss match has been created successfully.",
      });
      form.reset();
      setOpen(false);
      setTeamAPreview(null);
      setTeamBPreview(null);
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

  // Function to handle opening the close betting confirmation dialog
  const handleCloseBetting = (matchId: number) => {
    setMatchToClose(matchId);
    setConfirmCloseOpen(true);
  };
  
  // Function to confirm and execute the close betting action
  const confirmCloseBetting = () => {
    if (matchToClose) {
      closeBettingMutation.mutate(matchToClose);
      setConfirmCloseOpen(false);
      setMatchToClose(null);
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
    <DashboardLayout>
      <div className="container px-4 py-6 mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Cricket Toss Management</h1>
          <Dialog 
            open={open} 
            onOpenChange={(isOpen) => {
              setOpen(isOpen);
              if (!isOpen) {
                setTeamAPreview(null);
                setTeamBPreview(null);
              }
            }}>
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
                      name="teamAImage"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>Team A Image (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onChange(file);
                                  // Create a preview URL for the selected image
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setTeamAPreview(e.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </FormControl>
                          {teamAPreview && (
                            <div className="mt-2">
                              <img 
                                src={teamAPreview} 
                                alt="Team A Preview" 
                                className="w-16 h-16 object-cover rounded-full border border-gray-200"
                              />
                            </div>
                          )}
                          <FormDescription>Upload team logo or image</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="teamBImage"
                      render={({ field: { value, onChange, ...field } }) => (
                        <FormItem>
                          <FormLabel>Team B Image (Optional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  onChange(file);
                                  // Create a preview URL for the selected image
                                  const reader = new FileReader();
                                  reader.onload = (e) => {
                                    setTeamBPreview(e.target?.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </FormControl>
                          {teamBPreview && (
                            <div className="mt-2">
                              <img 
                                src={teamBPreview} 
                                alt="Team B Preview" 
                                className="w-16 h-16 object-cover rounded-full border border-gray-200"
                              />
                            </div>
                          )}
                          <FormDescription>Upload team logo or image</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md">
                    <p className="text-sm text-slate-700 dark:text-slate-300">
                      <span className="font-medium">Note:</span> Odds are fixed at 2.00 for both teams.
                    </p>
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
                        <div className="flex items-center gap-2">
                          {match.teamAImage && (
                            <img 
                              src={match.teamAImage} 
                              alt={match.teamA}
                              className="w-8 h-8 object-cover rounded-full" 
                            />
                          )}
                          <span>{match.teamA}</span>
                        </div>
                        <div className="text-center my-1 text-xs text-gray-500">vs</div>
                        <div className="flex items-center gap-2">
                          {match.teamBImage && (
                            <img 
                              src={match.teamBImage} 
                              alt={match.teamB}
                              className="w-8 h-8 object-cover rounded-full" 
                            />
                          )}
                          <span>{match.teamB}</span>
                        </div>
                        {match.description && (
                          <div className="text-xs text-gray-500 mt-1">{match.description}</div>
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
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            
                            <DropdownMenuSeparator />
                            
                            {match.status === "open" && (
                              <DropdownMenuItem 
                                onClick={() => handleCloseBetting(match.id)}
                              >
                                <X className="mr-2 h-4 w-4" />
                                Close Betting
                              </DropdownMenuItem>
                            )}
                            
                            {match.status === "closed" && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMatch(match);
                                  setDeclareOpen(true);
                                }}
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Declare Result
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="p-8 text-center">
            <p className="text-gray-500 mb-4">No cricket toss matches found.</p>
            <p className="text-sm text-gray-400">Create a new match to get started.</p>
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
                  className="h-16 flex flex-col items-center justify-center gap-2"
                >
                  {selectedMatch?.teamAImage && (
                    <img 
                      src={selectedMatch.teamAImage} 
                      alt={selectedMatch.teamA}
                      className="w-6 h-6 object-cover rounded-full" 
                    />
                  )}
                  <span>{selectedMatch?.teamA} Wins</span>
                </Button>
                <Button
                  onClick={() => handleDeclareResult("team_b")}
                  className="h-16 flex flex-col items-center justify-center gap-2"
                >
                  {selectedMatch?.teamBImage && (
                    <img 
                      src={selectedMatch.teamBImage} 
                      alt={selectedMatch.teamB}
                      className="w-6 h-6 object-cover rounded-full" 
                    />
                  )}
                  <span>{selectedMatch?.teamB} Wins</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}