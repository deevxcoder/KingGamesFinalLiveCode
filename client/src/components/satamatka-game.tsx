import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ChevronRight, ChevronLeft, RefreshCw, AlertCircle } from "lucide-react";
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

export default function SatamatkaGame() {
  const { id } = useParams<{ id: string }>();
  const marketId = parseInt(id);
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedNumber, setSelectedNumber] = useState<string>("");
  const [selectedGameMode, setSelectedGameMode] = useState<string>("jodi");

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
  const { data: market, isLoading } = useQuery({
    queryKey: ["/api/satamatka/markets", marketId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user && !isNaN(marketId),
    onSuccess: (data) => {
      console.log("Market data received:", data);
    },
    onError: (error) => {
      console.error("Error fetching market:", error);
    }
  });

  // Mutation for placing a bet
  const placeBetMutation = useMutation({
    mutationFn: async (data: z.infer<typeof formSchema>) => {
      return apiRequest("/api/satamatka/play", "POST", {
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

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/games/my-history"] });

      // Redirect to the game history page
      setLocation("/game-history");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to place bet",
        description: error.message,
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

    // Confirm bet placement
    if (window.confirm(`Confirm your bet of ${data.betAmount} on ${data.prediction}?`)) {
      placeBetMutation.mutate(data);
    }
  };

  // Generate the number grid based on game mode
  const renderNumberGrid = () => {
    if (selectedGameMode === "jodi") {
      // Generate grid of 100 numbers (00-99)
      return (
        <div className="grid grid-cols-10 gap-2 max-h-[300px] overflow-y-auto p-2">
          {Array.from({ length: 100 }, (_, i) => {
            const num = i.toString().padStart(2, "0");
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
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <Button
          variant="outline"
          size="sm"
          className="mr-2"
          onClick={() => setLocation("/markets")}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{typedMarket.name}</h1>
          <p className="text-muted-foreground">
            Open: {format(new Date(typedMarket.openTime), "h:mm a")} | Close:{" "}
            {format(new Date(typedMarket.closeTime), "h:mm a")}
          </p>
        </div>
        <Badge className="ml-auto bg-green-500 hover:bg-green-600 text-white">
          Open for Betting
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Select Game Mode</CardTitle>
            <CardDescription>Choose how you want to play</CardDescription>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedGameMode}
              onValueChange={handleGameModeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a game mode" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(GAME_MODES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-sm text-muted-foreground">
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