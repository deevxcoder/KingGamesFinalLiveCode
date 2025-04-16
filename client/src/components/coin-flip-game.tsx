import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GameOutcome } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function CoinFlipGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(10);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const coinRef = useRef<HTMLDivElement>(null);

  // Play game mutation
  const playGameMutation = useMutation({
    mutationFn: async ({ betAmount, prediction }: { betAmount: number; prediction: string }) => {
      const res = await apiRequest("POST", "/api/games/play", {
        betAmount: betAmount * 100, // Convert to cents
        prediction,
      });
      return await res.json();
    },
    onSuccess: (data) => {
      // Update user data in cache
      queryClient.setQueryData(["/api/user"], data.user);
      
      // Set the result to trigger animation
      setResult(data.game.result);
      
      // Show result after animation
      setTimeout(() => {
        const isWin = data.game.payout > 0;
        toast({
          title: isWin ? "You won!" : "You lost!",
          description: isWin 
            ? `+$${(data.game.payout / 100).toFixed(2)}` 
            : "Better luck next time!",
          variant: isWin ? "default" : "destructive",
        });
        
        // Reset for next game
        setIsFlipping(false);
        setSelectedPrediction(null);
      }, 2000);
    },
    onError: (error: Error) => {
      setIsFlipping(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBetAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (isNaN(value) || value <= 0) {
      setBetAmount(0);
    } else {
      setBetAmount(value);
    }
  };

  const handleQuickAmount = (amount: number) => {
    setBetAmount(amount);
  };

  const handleMaxAmount = () => {
    setBetAmount(Math.floor((user?.balance || 0) / 100));
  };

  const selectPrediction = (prediction: string) => {
    setSelectedPrediction(prediction);
  };

  const handlePlaceBet = () => {
    if (!selectedPrediction) {
      toast({
        title: "Select a prediction",
        description: "Please select Heads or Tails first",
        variant: "destructive",
      });
      return;
    }

    if (betAmount <= 0) {
      toast({
        title: "Invalid bet amount",
        description: "Please enter a valid bet amount",
        variant: "destructive",
      });
      return;
    }

    const betAmountInCents = betAmount * 100;
    if (betAmountInCents > (user?.balance || 0)) {
      toast({
        title: "Insufficient balance",
        description: "You don't have enough balance for this bet",
        variant: "destructive",
      });
      return;
    }

    // Start animation and play game
    setIsFlipping(true);
    setResult(null);
    
    playGameMutation.mutate({
      betAmount,
      prediction: selectedPrediction,
    });
  };

  return (
    <Card className="bg-card rounded-xl shadow-xl border border-border mb-8">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          <span className="text-primary">King</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-primary">Games</span>
          <span className="ml-2">Royal Toss</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col lg:flex-row lg:items-start">
          {/* Game Area */}
          <div className="flex-1 flex flex-col items-center mb-8 lg:mb-0">
            <motion.div 
              className="relative w-40 h-40 mb-8 perspective-1000"
              style={{ perspective: "1000px" }}
            >
              <motion.div
                ref={coinRef}
                className="w-full h-full relative transform-style-3d"
                animate={{
                  rotateY: isFlipping 
                    ? result === GameOutcome.HEADS 
                      ? 1440 
                      : 1530 
                    : 0,
                }}
                transition={{
                  duration: 2,
                  ease: "easeInOut",
                }}
                style={{ transformStyle: "preserve-3d" }}
              >
                {/* Heads Side */}
                <div 
                  className="absolute w-full h-full rounded-full flex items-center justify-center text-white text-xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 backface-hidden"
                  style={{ backfaceVisibility: "hidden" }}
                >
                  HEADS
                </div>
                {/* Tails Side */}
                <div 
                  className="absolute w-full h-full rounded-full flex items-center justify-center text-white text-xl font-bold bg-gradient-to-r from-red-500 to-red-600 backface-hidden"
                  style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                  TAILS
                </div>
              </motion.div>
            </motion.div>
            
            <div className="text-center mb-6">
              <p className="text-muted-foreground mb-2">Select your prediction:</p>
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={() => selectPrediction(GameOutcome.HEADS)}
                  className={`px-6 py-5 ${
                    selectedPrediction === GameOutcome.HEADS
                      ? "bg-amber-600 hover:bg-amber-700"
                      : "bg-amber-600/70 hover:bg-amber-600"
                  } text-white font-bold rounded-lg transition-colors`}
                  disabled={isFlipping}
                >
                  HEADS
                </Button>
                <Button
                  onClick={() => selectPrediction(GameOutcome.TAILS)}
                  className={`px-6 py-5 ${
                    selectedPrediction === GameOutcome.TAILS
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-red-600/70 hover:bg-red-600"
                  } text-white font-bold rounded-lg transition-colors`}
                  disabled={isFlipping}
                >
                  TAILS
                </Button>
              </div>
            </div>
          </div>
          
          {/* Bet Settings */}
          <div className="lg:w-80 bg-card/50 border border-border rounded-lg p-4">
            <h3 className="text-lg font-medium mb-4 pb-2 border-b border-border">Bet Settings</h3>
            
            <div className="mb-4">
              <Label className="block text-muted-foreground text-sm mb-2">Bet Amount ($)</Label>
              <div className="flex items-center">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                  disabled={betAmount <= 1 || isFlipping}
                  className="px-3 rounded-r-none"
                >
                  -
                </Button>
                <Input
                  type="number"
                  value={betAmount}
                  onChange={handleBetAmountChange}
                  className="text-center rounded-none border-x-0"
                  disabled={isFlipping}
                  min={1}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBetAmount(betAmount + 1)}
                  disabled={betAmount * 100 >= (user?.balance || 0) - 100 || isFlipping}
                  className="px-3 rounded-l-none"
                >
                  +
                </Button>
              </div>
              <div className="flex justify-between mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(10)}
                  disabled={isFlipping || 1000 > (user?.balance || 0)}
                >
                  $10
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(50)}
                  disabled={isFlipping || 5000 > (user?.balance || 0)}
                >
                  $50
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(100)}
                  disabled={isFlipping || 10000 > (user?.balance || 0)}
                >
                  $100
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMaxAmount}
                  disabled={isFlipping || (user?.balance || 0) <= 0}
                >
                  MAX
                </Button>
              </div>
            </div>
            
            <div className="mb-4">
              <Label className="block text-muted-foreground text-sm mb-2">Potential Win</Label>
              <div className="p-3 bg-card/70 border border-border rounded-lg">
                ${(betAmount * 1.95).toFixed(2)} <span className="text-xs text-muted-foreground">(1.95x)</span>
              </div>
            </div>
            
            <Button
              onClick={handlePlaceBet}
              className="w-full px-4 py-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-center transition-colors"
              disabled={isFlipping || !selectedPrediction || betAmount <= 0 || betAmount * 100 > (user?.balance || 0)}
            >
              {isFlipping ? "Flipping..." : "PLACE BET"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
