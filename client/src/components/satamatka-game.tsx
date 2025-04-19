import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, RefreshCw, AlertCircle, Hash, Type, ArrowLeftRight, Divide, Clock } from "lucide-react";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Define SatamatkaMarket interface
interface SatamatkaMarket {
  id: number;
  name: string;
  type: string;
  openTime: string;
  closeTime: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  createdAt: string;
}

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

// Game modes in the Satamatka game
const GAME_MODES = {
  jodi: "Jodi (Full Number)",
  harf: "Harf (Single Digit)",
  crossing: "Crossing Digit",
  odd_even: "Odd-Even",
};

// Define the form schema
const formSchema = z.object({
  gameMode: z.enum(["jodi", "harf", "crossing", "odd_even"], {
    required_error: "Please select a game mode",
  }),
  prediction: z.string().min(1, "Prediction is required"),
  betAmount: z.coerce
    .number()
    .min(10, "Minimum bet amount is 10")
    .max(10000, "Maximum bet amount is 10,000"),
});

// Game data interface for Satamatka game
interface SatamatkaGameData {
  gameMode: string;
  marketId: number;
  marketName?: string;
}

// Game interface for recent bets
interface Game {
  id: number;
  userId: number;
  gameType: string;
  prediction: string;
  betAmount: number;
  result: string | null;
  status: string;
  payout: number | null;
  marketId?: number;
  marketName?: string;
  createdAt: string;
  gameData?: SatamatkaGameData | any; // Using any as fallback since different game types have different data structures
}

export default function SatamatkaGame() {
  const { id } = useParams<{ id: string }>();
  const marketId = parseInt(id);
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [selectedGameMode, setSelectedGameMode] = useState<string>("jodi");
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [betDetails, setBetDetails] = useState<{prediction: string; betAmount: number} | null>(null);
  
  // New state for multi-selection and quick bet amounts
  const [quickBetAmount, setQuickBetAmount] = useState<number>(10);
  const [selectedNumbers, setSelectedNumbers] = useState<Map<string, number>>(new Map());
  const [showBetSlip, setShowBetSlip] = useState<boolean>(false);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      gameMode: "jodi",
      prediction: "",
      betAmount: 100,
    },
  });

  // Update prediction when number or game mode selection changes
  useEffect(() => {
    if (selectedNumber) {
      form.setValue("prediction", selectedNumber);
    }
  }, [selectedNumber, form]);

  // Query the market details
  const { data: market, isLoading, error: marketError } = useQuery({
    queryKey: ["/api/satamatka/markets", marketId],
    queryFn: async ({ queryKey }) => {
      try {
        const res = await fetch(`${queryKey[0]}/${queryKey[1]}`, {
          credentials: "include",
        });
        
        if (res.status === 401) {
          toast({
            variant: "destructive",
            title: "Authentication required",
            description: "Please log in to view market details.",
          });
          setLocation("/auth");
          return null;
        }
        
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text || res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Market fetch error:", error);
        throw error;
      }
    },
    enabled: !!user && !isNaN(marketId)
  });

  // Log market data when it changes
  useEffect(() => {
    if (market) {
      console.log("Market data received:", market);
    }
    if (marketError) {
      console.error("Error fetching market:", marketError);
      toast({
        variant: "destructive",
        title: "Error loading market",
        description: marketError instanceof Error ? marketError.message : "Could not load market details. Please try again."
      });
    }
  }, [market, marketError, toast]);

  // Query for user's recent bets
  const { data: recentBets = [], refetch: refetchRecentBets } = useQuery({
    queryKey: ["/api/games/my-history"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
    onSuccess: (data) => {
      console.log("Received bet history:", data);
    }
  });

  // Mutation for placing a single bet
  const placeBetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      // Fix: Use correct method parameter ordering in apiRequest
      return apiRequest("POST", "/api/satamatka/play", {
        marketId: marketId,
        gameMode: data.gameMode,
        prediction: data.prediction,
        betAmount: data.betAmount,
      });
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "Bet placed successfully!",
        description: "Your bet has been placed on the selected market.",
      });

      // Invalidate relevant queries and refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/my-history"] });
      
      // Reset form
      form.reset({
        gameMode: selectedGameMode as any,
        prediction: "",
        betAmount: 100,
      });
      setSelectedNumber("");
      
      // Refetch recent bets to show updated list
      refetchRecentBets();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to place bet",
        description: error.message,
      });
    },
  });
  
  // Mutation for placing multiple bets
  const placeMultipleBetsMutation = useMutation({
    mutationFn: async (bets: Array<{number: string, amount: number}>) => {
      // Create a promise array for all bets
      const betPromises = bets.map(bet => {
        return apiRequest("POST", "/api/satamatka/play", {
          marketId: marketId,
          gameMode: selectedGameMode,
          prediction: bet.number,
          betAmount: bet.amount,
        });
      });
      
      // Execute all bets in parallel
      return Promise.all(betPromises);
    },
    onSuccess: () => {
      // Show success toast
      toast({
        title: "All bets placed successfully!",
        description: `${selectedNumbers.size} bets have been placed on the selected market.`,
      });

      // Invalidate relevant queries and refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/my-history"] });
      
      // Reset multi-selection
      setSelectedNumbers(new Map());
      setShowBetSlip(false);
      
      // Refetch recent bets to show updated list
      refetchRecentBets();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to place bets",
        description: error.message || "Some bets could not be placed. Please try again.",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please login to place a bet.",
      });
      return;
    }

    // Set bet details and open confirmation dialog
    setBetDetails({
      prediction: data.prediction,
      betAmount: data.betAmount
    });
    setConfirmDialogOpen(true);
  };
  
  // Handle bet confirmation from dialog
  const handleConfirmBet = () => {
    if (betDetails) {
      // Check if we're confirming a single bet or multiple bets
      if (selectedNumbers.size > 0) {
        // Processing multiple bets
        const bets = Array.from(selectedNumbers.entries()).map(([number, amount]) => ({
          number, 
          amount
        }));
        
        // Use the multiple bets mutation
        placeMultipleBetsMutation.mutate(bets);
      } else {
        // Single bet from the form
        const formData = form.getValues();
        placeBetMutation.mutate(formData as any);
      }
      
      // Close dialog and reset UI
      setConfirmDialogOpen(false);
      setSelectedNumbers(new Map());
      setShowBetSlip(false);
    }
  };
  
  // Handle multi-selection of numbers with incremental bet amounts
  const handleNumberSelection = (num: string) => {
    const newSelections = new Map(selectedNumbers);
    
    if (newSelections.has(num)) {
      // If already selected, increment bet amount
      const currentAmount = newSelections.get(num) || 0;
      newSelections.set(num, currentAmount + quickBetAmount);
    } else {
      // If not selected, add with current bet amount
      newSelections.set(num, quickBetAmount);
    }
    
    setSelectedNumbers(newSelections);
  };
  
  // Remove a number from selection
  const removeNumberSelection = (num: string) => {
    const newSelections = new Map(selectedNumbers);
    newSelections.delete(num);
    setSelectedNumbers(newSelections);
  };
  
  // Calculate total bet amount across all selections
  const calculateTotalBetAmount = () => {
    let total = 0;
    selectedNumbers.forEach(amount => {
      total += amount;
    });
    return total;
  };
  
  // Place bets for all selected numbers
  const placeBetsForAllSelections = async () => {
    if (selectedNumbers.size === 0) {
      toast({
        title: "No numbers selected",
        description: "Please select at least one number to place a bet.",
        variant: "destructive"
      });
      return;
    }
    
    // Set bet details for confirmation dialog
    setBetDetails({
      prediction: Array.from(selectedNumbers.keys()).join(", "),
      betAmount: calculateTotalBetAmount()
    });
    setConfirmDialogOpen(true);
  };

  // Generate the number grid based on game mode
  const renderNumberGrid = () => {
    if (selectedGameMode === "jodi") {
      return (
        <div className="space-y-4">
          {/* Quick bet amount buttons */}
          <div className="p-2 mb-4 bg-muted/30 rounded-lg">
            <div className="text-sm font-medium mb-2">Quick Bet Amount</div>
            <div className="grid grid-cols-4 gap-2">
              {[10, 50, 100, 500].map((amount) => (
                <Button
                  key={amount}
                  variant={quickBetAmount === amount ? "default" : "outline"}
                  size="sm"
                  onClick={() => setQuickBetAmount(amount)}
                  className={`${
                    quickBetAmount === amount 
                      ? "bg-primary/90 text-primary-foreground" 
                      : "hover:bg-primary/20"
                  }`}
                >
                  ₹{amount}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Mobile-optimized number grid showing 00-20 initially with 5 numbers per row */}
          <div className="space-y-4">
            <div className="text-sm font-medium">Select Numbers</div>
            
            {/* First 21 numbers (00-20) shown prominently */}
            <div className="grid grid-cols-5 gap-2 p-2">
              {Array.from({ length: 21 }, (_, i) => {
                const num = i.toString().padStart(2, "0");
                const isSelected = selectedNumbers.has(num);
                const betAmount = selectedNumbers.get(num) || 0;
                
                return (
                  <div key={num} className="relative">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className={`h-12 w-full flex flex-col items-center justify-center p-1 ${
                        isSelected ? "bg-primary/90" : ""
                      }`}
                      onClick={() => handleNumberSelection(num)}
                    >
                      <span className="text-base font-medium">{num}</span>
                      {isSelected && (
                        <span className="text-xs mt-1">₹{betAmount}</span>
                      )}
                    </Button>
                    {isSelected && (
                      <button
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNumberSelection(num);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Remaining numbers (21-99) in a scrollable container */}
            <div className="grid grid-cols-5 gap-2 max-h-[230px] overflow-y-auto p-2 border rounded-lg border-slate-700">
              {Array.from({ length: 79 }, (_, i) => {
                const num = (i + 21).toString().padStart(2, "0");
                const isSelected = selectedNumbers.has(num);
                const betAmount = selectedNumbers.get(num) || 0;
                
                return (
                  <div key={num} className="relative">
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      className={`h-12 w-full flex flex-col items-center justify-center p-1 ${
                        isSelected ? "bg-primary/90" : ""
                      }`}
                      onClick={() => handleNumberSelection(num)}
                    >
                      <span className="text-base font-medium">{num}</span>
                      {isSelected && (
                        <span className="text-xs mt-1">₹{betAmount}</span>
                      )}
                    </Button>
                    {isSelected && (
                      <button
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNumberSelection(num);
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Bet slip button for selected numbers */}
          {selectedNumbers.size > 0 && (
            <div className="mt-4">
              <Button 
                variant="default" 
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
                onClick={() => setShowBetSlip(true)}
              >
                View Bet Slip ({selectedNumbers.size} numbers, ₹{calculateTotalBetAmount()})
              </Button>
            </div>
          )}
        </div>
      );
    } else if (selectedGameMode === "harf" || selectedGameMode === "crossing") {
      // Generate grid of 10 numbers (0-9)
      return (
        <div className="grid grid-cols-5 gap-2 p-2">
          {Array.from({ length: 10 }, (_, i) => {
            const num = i.toString();
            return (
              <Button
                key={num}
                variant={selectedNumber === num ? "default" : "outline"}
                className="h-10 w-10"
                onClick={() => setSelectedNumber(num)}
              >
                {num}
              </Button>
            );
          })}
        </div>
      );
    } else if (selectedGameMode === "odd_even") {
      // Generate odd-even options
      return (
        <div className="grid grid-cols-2 gap-4 p-2">
          <Button
            variant={selectedNumber === "odd" ? "default" : "outline"}
            className="h-12"
            onClick={() => setSelectedNumber("odd")}
          >
            Odd
          </Button>
          <Button
            variant={selectedNumber === "even" ? "default" : "outline"}
            className="h-12"
            onClick={() => setSelectedNumber("even")}
          >
            Even
          </Button>
        </div>
      );
    }

    return null;
  };

  // Generate description based on game mode
  const getGameModeDescription = () => {
    switch (selectedGameMode) {
      case "jodi":
        return "Predict the exact two-digit number (00-99). Payout ratio: 90x";
      case "harf":
        return "Predict a single digit (0-9). Payout ratio: 9x";
      case "crossing":
        return "Predict a single digit that appears in either position. Payout ratio: 4.5x";
      case "odd_even":
        return "Predict if the result will be odd or even. Payout ratio: 1.8x";
      default:
        return "Select a game mode to see details.";
    }
  };

  // Handle game mode change
  const handleGameModeChange = (value: string) => {
    setSelectedGameMode(value);
    form.setValue("gameMode", value as any);
    // Reset prediction when game mode changes
    setSelectedNumber("");
    form.setValue("prediction", "");
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <Skeleton className="h-10 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Skeleton className="h-[400px] rounded-lg" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-8 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Market not found or is no longer available.
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setLocation("/markets")}
            >
              Go back to Markets
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // TypeScript check to ensure market has the expected properties
  const typedMarket = market as unknown as SatamatkaMarket;
  
  if (typedMarket.status !== "open") {
    return (
      <div className="container mx-auto py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Market Closed</AlertTitle>
          <AlertDescription>
            This market is no longer open for betting.
            <Button
              variant="outline"
              className="mt-2 w-full"
              onClick={() => setLocation("/markets")}
            >
              Go back to Markets
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="py-2">
      {/* Bet slip dialog for showing all selections */}
      <Dialog open={showBetSlip} onOpenChange={setShowBetSlip}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Your Bet Slip</DialogTitle>
            <DialogDescription>
              Review your selections before placing your bet
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Potential Win</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(selectedNumbers.entries()).map(([num, amount]) => (
                  <TableRow key={num}>
                    <TableCell className="font-medium">{num}</TableCell>
                    <TableCell>₹{amount}</TableCell>
                    <TableCell className="text-amber-500">
                      ₹{calculatePotentialWin(selectedGameMode, amount)}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-red-100 text-red-700 hover:bg-red-200"
                        onClick={() => removeNumberSelection(num)}
                      >
                        ×
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="bg-muted/30 p-3 rounded-lg">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Total Bet Amount:</span>
              <span className="font-bold">₹{calculateTotalBetAmount()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm font-medium">Potential Win:</span>
              <span className="font-bold text-amber-500">
                ₹{Array.from(selectedNumbers.values()).reduce(
                  (total, amount) => total + calculatePotentialWin(selectedGameMode, amount),
                  0
                )}
              </span>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setShowBetSlip(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={placeBetsForAllSelections}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
              disabled={selectedNumbers.size === 0 || placeBetMutation.isPending}
            >
              {placeBetMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Place All Bets"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Confirmation dialog for placing bet */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Your Bet</DialogTitle>
            <DialogDescription>
              Please review your bet details before confirming
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Market</p>
                <p className="font-medium">{typedMarket.name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Game Mode</p>
                <p className="font-medium">{GAME_MODES[selectedGameMode as keyof typeof GAME_MODES]}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Prediction</p>
              <p className="font-bold">{betDetails?.prediction}</p>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Bet Amount</p>
                <p className="text-lg font-bold">₹{betDetails?.betAmount}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Potential Win</p>
                <p className="text-lg font-bold text-amber-500">
                  ₹{betDetails ? calculatePotentialWin(selectedGameMode, betDetails.betAmount) : 0}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setConfirmDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleConfirmBet}
              className="bg-gradient-to-r from-green-500 to-emerald-600"
              disabled={placeBetMutation.isPending || placeMultipleBetsMutation.isPending}
            >
              {placeBetMutation.isPending || placeMultipleBetsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Bet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
        <div className="flex items-center">
          <Button
            variant="outline"
            size="sm"
            className="mr-2"
            onClick={() => setLocation("/markets")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <p className="text-sm text-muted-foreground bg-slate-800/30 px-3 py-1 rounded-full">
            <Clock className="h-4 w-4 inline mr-1" />
            Open: {format(new Date(typedMarket.openTime), "h:mm a")} | Close:{" "}
            {format(new Date(typedMarket.closeTime), "h:mm a")}
          </p>
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Open for Betting
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Game Mode</CardTitle>
            <CardDescription>Choose how you want to play</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {Object.entries(GAME_MODES).map(([value, label]) => (
                <Card 
                  key={value} 
                  className={`cursor-pointer transition-all hover:scale-105 ${selectedGameMode === value ? 'border-primary shadow-md' : 'border'}`}
                  onClick={() => handleGameModeChange(value)}
                >
                  <CardContent className="p-4 flex flex-col items-center justify-center">
                    {value === "jodi" && <Hash className="h-10 w-10 text-primary mb-2" />}
                    {value === "harf" && <Type className="h-10 w-10 text-primary mb-2" />}
                    {value === "crossing" && <ArrowLeftRight className="h-10 w-10 text-primary mb-2" />}
                    {value === "odd_even" && <Divide className="h-10 w-10 text-primary mb-2" />}
                    <p className="font-medium text-center">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <p className="text-sm text-muted-foreground p-2 bg-muted/50 rounded-md">
              {getGameModeDescription()}
            </p>
          </CardContent>
          <CardContent>{renderNumberGrid()}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Place Your Bet</CardTitle>
            <CardDescription>Fill in the details to place your bet</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="prediction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Your Prediction</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={selectedNumber || field.value}
                          readOnly
                          placeholder="Select a number from the grid"
                        />
                      </FormControl>
                      <FormDescription>
                        Select your prediction from the number grid on the left
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="betAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bet Amount</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          min={10} 
                          max={10000} 
                        />
                      </FormControl>
                      <FormDescription>
                        Min: 10, Max: 10,000
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="pt-2">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      placeBetMutation.isPending ||
                      !selectedNumber ||
                      !user
                    }
                  >
                    {placeBetMutation.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Placing Bet...
                      </>
                    ) : (
                      <>
                        Place Bet <ChevronRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="border-t px-6 py-4">
            <div className="flex justify-between w-full text-sm">
              <div>Balance: ₹{user?.balance || 0}</div>
              {selectedNumber && form.getValues("betAmount") && (
                <div>
                  Potential Win: ₹
                  {calculatePotentialWin(
                    selectedGameMode,
                    form.getValues("betAmount")
                  )}
                </div>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Recent Bets Table */}
      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Recent Bets</CardTitle>
            <CardDescription>Latest bets you've placed</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Market</TableHead>
                  <TableHead>Game Type</TableHead>
                  <TableHead>Prediction</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(recentBets as Game[]).slice(0, 5).map((bet) => (
                  <TableRow key={bet.id}>
                    <TableCell>
                      {bet.marketName || 
                       (bet.gameType === 'satamatka' && bet.marketId ? 
                        (bet.marketId === marketId ? typedMarket.name : `Market #${bet.marketId}`) : 
                        'Unknown')}
                    </TableCell>
                    <TableCell>
                      {bet.gameType === 'satamatka' && bet.gameData ? 
                        (GAME_MODES[bet.gameData.gameMode as keyof typeof GAME_MODES] || bet.gameData.gameMode) : 
                        bet.gameType}
                    </TableCell>
                    <TableCell>{bet.prediction}</TableCell>
                    <TableCell>₹{bet.betAmount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          bet.status === "win" ? "success" : 
                          bet.status === "loss" ? "destructive" : 
                          bet.status === "pending" ? "secondary" : "outline"
                        }
                      >
                        {bet.status === "pending" ? "Pending" : 
                         bet.status === "win" ? "Won" : 
                         bet.status === "loss" ? "Lost" : bet.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(bet.createdAt), "MMM d, h:mm a")}</TableCell>
                  </TableRow>
                ))}
                {(recentBets as Game[]).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No recent bets found. Place your first bet!
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Bet Confirmation Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Your Bet</DialogTitle>
            <DialogDescription>
              Please review your bet details before confirming.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Market</h4>
                <p className="text-sm text-muted-foreground">{typedMarket.name}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Game Mode</h4>
                <p className="text-sm text-muted-foreground">{GAME_MODES[selectedGameMode as keyof typeof GAME_MODES]}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Prediction</h4>
                <p className="text-sm text-muted-foreground">{betDetails?.prediction}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Bet Amount</h4>
                <p className="text-sm text-muted-foreground">₹{betDetails?.betAmount}</p>
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-medium">Potential Win</h4>
                <p className="text-sm text-muted-foreground">
                  ₹{betDetails ? calculatePotentialWin(selectedGameMode, betDetails.betAmount) : 0}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmBet} 
              disabled={placeBetMutation.isPending || placeMultipleBetsMutation.isPending}
            >
              {placeBetMutation.isPending || placeMultipleBetsMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Placing Bet{selectedNumbers.size > 0 ? 's' : ''}...
                </>
              ) : (
                "Confirm Bet"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper function to calculate potential win based on game mode
function calculatePotentialWin(gameMode: string, betAmount: number): number {
  let payoutRatio = 1;
  
  switch (gameMode) {
    case "jodi":
      payoutRatio = 90;
      break;
    case "harf":
      payoutRatio = 9;
      break;
    case "crossing":
      payoutRatio = 4.5;
      break;
    case "odd_even":
      payoutRatio = 1.8;
      break;
  }
  
  return Math.floor(betAmount * payoutRatio);
}