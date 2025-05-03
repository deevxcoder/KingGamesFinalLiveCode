import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { GameOutcome } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatProfitLoss } from "@/lib/format-utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronsUp, ChevronsDown, IndianRupee, Trophy, X } from "lucide-react";

export default function CoinFlipGame() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [betAmount, setBetAmount] = useState(10);
  const [selectedPrediction, setSelectedPrediction] = useState<string | null>(null);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [showWinPopup, setShowWinPopup] = useState(false);
  const [showLosePopup, setShowLosePopup] = useState(false);
  const [lastResult, setLastResult] = useState<{
    isWin: boolean;
    amount: number;
    prediction: string;
    result: string;
  } | null>(null);
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
      
      // First let the coin flip for a while (1.4 seconds) without showing result
      // Then slow down to show the result (0.6 seconds)
      // Then stop and show popup
      
      // Wait for the coin flip animation to complete (2 seconds)
      setTimeout(() => {
        // Set flipping to false (stop spinning)
        setIsFlipping(false);
        
        // Prepare result data
        const isWin = data.game.payout > 0;
        setLastResult({
          isWin,
          amount: data.game.payout / 100, // Convert to rupees from paise
          prediction: selectedPrediction!,
          result: data.game.result
        });
        
        // Show appropriate popup after a slight delay
        // This gives user time to see the final result before showing popup
        setTimeout(() => {
          if (isWin) {
            setShowWinPopup(true);
          } else {
            setShowLosePopup(true);
          }
        }, 600); // Add a small delay after animation stops
      }, 2000); // 2 seconds for coin flip animation
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

  // Set bet amount with values that match display (10, 50, 100)
  const handleQuickAmount = (amount: number) => {
    setBetAmount(amount);
  };

  const handleMaxAmount = () => {
    setBetAmount(Math.floor((user?.balance || 0) / 100));
  };

  const selectPrediction = (prediction: string) => {
    setSelectedPrediction(prediction);
  };

  const handlePlayAgain = () => {
    // Reset game state for a new game
    setShowWinPopup(false);
    setShowLosePopup(false);
    setSelectedPrediction(null);
    setResult(null);
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
    <Card className="bg-card rounded-xl shadow-xl border border-border mb-8 relative overflow-hidden">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-center">
          <span className="text-primary">King</span>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-primary">Games</span>
          <span className="ml-2">Royal Toss</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:gap-6">
          {/* Game Area */}
          <div className="flex-1 flex flex-col md:flex-row items-center justify-center gap-5 mb-5 lg:mb-0">
            <div className="flex flex-col items-center">
              <motion.div 
                className="relative w-32 h-32 sm:w-36 sm:h-36 perspective-1000 mb-3"
                style={{ perspective: "1000px" }}
              >
                <motion.div
                  ref={coinRef}
                  className="w-full h-full relative transform-style-3d"
                  animate={{
                    rotateY: isFlipping 
                      ? [0, 1080, result === GameOutcome.HEADS ? 1440 : 1530]  // Start, multiple spins, then result position
                      : result === GameOutcome.HEADS
                        ? 0     // Keep showing heads after animation
                        : result === GameOutcome.TAILS
                          ? 180 // Keep showing tails after animation
                          : 0,  // Default position
                  }}
                  transition={{
                    duration: isFlipping ? 2 : 0,
                    ease: "easeOut",
                    times: isFlipping ? [0, 0.7, 1] : [0, 1],  // Control timing of animation segments
                  }}
                  style={{ transformStyle: "preserve-3d" }}
                >
                  {/* Heads Side */}
                  <div 
                    className="absolute w-full h-full rounded-full flex items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    <img 
                      src="/images/heads.png" 
                      alt="Heads" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                  {/* Tails Side */}
                  <div 
                    className="absolute w-full h-full rounded-full flex items-center justify-center backface-hidden"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                  >
                    <img 
                      src="/images/tails.png" 
                      alt="Tails" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </motion.div>
              </motion.div>
            </div>
            
            <div className="text-center">
              <p className="text-muted-foreground mb-2 text-sm">Select your prediction:</p>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-center sm:space-x-3">
                <Button
                  onClick={() => selectPrediction(GameOutcome.HEADS)}
                  className={`px-4 py-3 relative ${
                    selectedPrediction === GameOutcome.HEADS
                      ? "bg-primary hover:bg-primary/90 ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
                      : "bg-primary/70 hover:bg-primary/80"
                  } text-white font-bold rounded-lg transition-all`}
                  disabled={isFlipping}
                >
                  {selectedPrediction === GameOutcome.HEADS && (
                    <div className="absolute -top-1 -right-1 bg-white text-primary text-xs font-bold rounded-full p-1 w-5 h-5 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <span className="text-sm sm:text-base">HEADS</span>
                </Button>
                <Button
                  onClick={() => selectPrediction(GameOutcome.TAILS)}
                  className={`px-4 py-3 relative ${
                    selectedPrediction === GameOutcome.TAILS
                      ? "bg-purple-600 hover:bg-purple-700 ring-2 ring-purple-400 ring-offset-2 ring-offset-background"
                      : "bg-purple-600/70 hover:bg-purple-600"
                  } text-white font-bold rounded-lg transition-all`}
                  disabled={isFlipping}
                >
                  {selectedPrediction === GameOutcome.TAILS && (
                    <div className="absolute -top-1 -right-1 bg-white text-purple-600 text-xs font-bold rounded-full p-1 w-5 h-5 flex items-center justify-center">
                      ✓
                    </div>
                  )}
                  <span className="text-sm sm:text-base">TAILS</span>
                </Button>
              </div>
            </div>
          </div>
          
          {/* Bet Settings */}
          <div className="lg:w-72 bg-card/50 border border-border rounded-lg p-3">
            <h3 className="text-base font-medium mb-2 pb-1 border-b border-border flex items-center">
              <IndianRupee className="h-4 w-4 mr-1" />
              <span>Bet Settings</span>
            </h3>
            
            <div className="mb-3">
              <div className="flex items-center mb-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                  disabled={betAmount <= 1 || isFlipping}
                  className="px-2 h-8 rounded-r-none"
                >
                  <ChevronsDown className="h-3 w-3" />
                </Button>
                <div className="relative flex-1">
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                    ₹
                  </div>
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={handleBetAmountChange}
                    className="text-center h-8 rounded-none border-x-0 pl-5 text-sm"
                    disabled={isFlipping}
                    min={1}
                  />
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setBetAmount(betAmount + 1)}
                  disabled={betAmount * 100 >= (user?.balance || 0) - 100 || isFlipping}
                  className="px-2 h-8 rounded-l-none"
                >
                  <ChevronsUp className="h-3 w-3" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(10)}
                  disabled={isFlipping || 1000 > (user?.balance || 0)}
                  className="text-xs h-7"
                >
                  ₹10
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(50)}
                  disabled={isFlipping || 5000 > (user?.balance || 0)}
                  className="text-xs h-7"
                >
                  ₹50
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleQuickAmount(100)}
                  disabled={isFlipping || 10000 > (user?.balance || 0)}
                  className="text-xs h-7"
                >
                  ₹100
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleMaxAmount}
                  disabled={isFlipping || (user?.balance || 0) <= 0}
                  className="text-xs h-7"
                >
                  MAX
                </Button>
              </div>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground flex items-center">
                  <Trophy className="h-3 w-3 mr-1" />
                  Potential Win:
                </span>
                <div className="flex items-center text-green-500 font-medium">
                  {formatCurrency(betAmount * 1.95, 'coin_flip')}
                  <span className="text-xs text-muted-foreground ml-1">(1.95x)</span>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handlePlaceBet}
              className="w-full px-4 py-4 bg-gradient-to-r from-primary/90 to-purple-600 hover:from-primary hover:to-purple-700 text-white font-bold text-center transition-colors"
              disabled={isFlipping || !selectedPrediction || betAmount <= 0 || betAmount * 100 > (user?.balance || 0)}
            >
              {isFlipping ? "Flipping..." : "PLACE BET"}
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Win Popup */}
      <AnimatePresence>
        {showWinPopup && lastResult && (
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-card p-6 rounded-lg border border-primary shadow-xl max-w-md w-full mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">You Won!</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full" 
                  onClick={() => setShowWinPopup(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="my-5 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Trophy className="h-12 w-12 text-amber-500 mr-2" />
                  <div className="flex items-center text-3xl font-bold text-green-500">
                    {formatCurrency(lastResult.amount, 'coin_flip')}
                  </div>
                </div>
                
                <p className="text-slate-300 mb-4">
                  Your prediction was <strong className="text-primary">{lastResult.prediction}</strong> and the result was <strong className="text-primary">{lastResult.result}</strong>
                </p>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-primary/90 to-purple-600 hover:from-primary hover:to-purple-700 mt-2 py-6 text-lg"
                onClick={handlePlayAgain}
              >
                Play Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lose Popup */}
      <AnimatePresence>
        {showLosePopup && lastResult && (
          <motion.div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="bg-card p-6 rounded-lg border border-purple-600 shadow-xl max-w-md w-full mx-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", damping: 15 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">You Lost!</h3>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full" 
                  onClick={() => setShowLosePopup(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="my-5 text-center">
                <div className="flex items-center justify-center mb-3">
                  <div className="flex items-center text-2xl font-bold text-red-500">
                    <span>- </span>
                    {formatCurrency(betAmount, 'coin_flip', false)}
                  </div>
                </div>
                
                <p className="text-slate-300 mb-4">
                  Your prediction was <strong className="text-purple-400">{lastResult.prediction}</strong> but the result was <strong className="text-purple-400">{lastResult.result}</strong>
                </p>
                <p className="text-slate-400">Better luck next time!</p>
              </div>
              
              <Button 
                className="w-full bg-gradient-to-r from-primary/90 to-purple-600 hover:from-primary hover:to-purple-700 mt-2 py-6 text-lg"
                onClick={handlePlayAgain}
              >
                Try Again
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
