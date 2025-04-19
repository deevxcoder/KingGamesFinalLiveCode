import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Trophy } from "lucide-react";
import { IoFootball } from "react-icons/io5";
import { GiCricketBat } from "react-icons/gi";
import { FaBasketball } from "react-icons/fa6";
import { Badge } from '@/components/ui/badge';

// Type for Team Match
type TeamMatch = {
  id: number;
  teamA: string;
  teamB: string;
  category: string;
  description: string | null;
  matchTime: string;
  result: string;
  oddTeamA: number;
  oddTeamB: number;
  oddDraw: number | null;
  status: string;
  createdAt: string;
};

type TeamMatchGameProps = {
  match: TeamMatch;
  onClose: () => void;
};

export default function TeamMatchGame({ match, onClose }: TeamMatchGameProps) {
  const [betAmount, setBetAmount] = useState<number>(0);
  const [prediction, setPrediction] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading } = useAuth() || {};

  const placeBetMutation = useMutation({
    mutationFn: async () => {
      if (!prediction || betAmount <= 0) {
        throw new Error("Please select a prediction and enter a valid bet amount");
      }
      
      return apiRequest(
        'POST',
        `/api/team-matches/${match.id}/play`,
        {
          prediction,
          betAmount,
        },
        { headers: { 'Content-Type': 'application/json' } }
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/games/my-game-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Bet placed successfully!",
        description: `You placed ₹${betAmount/100} on ${getPredictionLabel(prediction || '')}. Good luck!`,
        variant: "default",
      });
      
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getCategoryIcon = () => {
    switch (match.category) {
      case 'cricket':
        return <GiCricketBat className="h-5 w-5 mr-2 text-indigo-400" />;
      case 'football':
        return <IoFootball className="h-5 w-5 mr-2 text-indigo-400" />;
      case 'basketball':
        return <FaBasketball className="h-5 w-5 mr-2 text-indigo-400" />;
      default:
        return <Trophy className="h-5 w-5 mr-2 text-indigo-400" />;
    }
  };

  const getPredictionLabel = (pred: string) => {
    switch (pred) {
      case 'team_a':
        return match.teamA;
      case 'team_b':
        return match.teamB;
      case 'draw':
        return 'Draw';
      default:
        return pred;
    }
  };

  const calculatePotentialWin = () => {
    if (!prediction || betAmount <= 0) return 0;
    
    let odds = 0;
    if (prediction === 'team_a') {
      odds = match.oddTeamA / 100;
    } else if (prediction === 'team_b') {
      odds = match.oddTeamB / 100;
    } else if (prediction === 'draw') {
      odds = (match.oddDraw || 300) / 100;
    }
    
    return Math.floor(betAmount * odds);
  };

  const potentialWin = calculatePotentialWin();
  const matchTime = new Date(match.matchTime);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-gray-900 text-white border-gray-800 sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center mb-2">
            {getCategoryIcon()}
            <DialogTitle>Place your bet</DialogTitle>
          </div>
          <DialogDescription className="text-gray-400">
            {match.teamA} vs {match.teamB} | {format(matchTime, 'MMM dd, h:mm a')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <Label htmlFor="prediction">Select your prediction</Label>
            <RadioGroup 
              value={prediction || ''} 
              onValueChange={setPrediction}
              className="grid grid-cols-3 gap-4"
            >
              <div className="flex flex-col items-center space-y-2">
                <div className={`
                  relative p-4 w-full rounded-md border border-gray-800 
                  ${prediction === 'team_a' ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-800'}
                `}>
                  <RadioGroupItem
                    value="team_a"
                    id="team_a"
                    className="absolute right-2 top-2"
                  />
                  <div className="text-center pt-2">
                    <p className="font-medium">{match.teamA}</p>
                    <p className="text-xl font-bold text-indigo-400">
                      {(match.oddTeamA / 100).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className={`
                  relative p-4 w-full rounded-md border border-gray-800 
                  ${prediction === 'draw' ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-800'}
                `}>
                  <RadioGroupItem
                    value="draw"
                    id="draw"
                    className="absolute right-2 top-2"
                  />
                  <div className="text-center pt-2">
                    <p className="font-medium">Draw</p>
                    <p className="text-xl font-bold text-indigo-400">
                      {(match.oddDraw ? match.oddDraw / 100 : 3).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-2">
                <div className={`
                  relative p-4 w-full rounded-md border border-gray-800 
                  ${prediction === 'team_b' ? 'bg-indigo-900/50 border-indigo-500' : 'bg-gray-800'}
                `}>
                  <RadioGroupItem
                    value="team_b"
                    id="team_b"
                    className="absolute right-2 top-2"
                  />
                  <div className="text-center pt-2">
                    <p className="font-medium">{match.teamB}</p>
                    <p className="text-xl font-bold text-indigo-400">
                      {(match.oddTeamB / 100).toFixed(2)}x
                    </p>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="betAmount">Bet Amount (₹)</Label>
            <Input
              id="betAmount"
              type="number"
              min="1"
              step="1"
              value={betAmount / 100 || ''}
              onChange={(e) => setBetAmount(parseInt(e.target.value || '0') * 100)}
              className="bg-gray-800 border-gray-700"
            />
            <p className="text-sm text-gray-400">
              {user?.balance !== undefined && (
                <>Available balance: ₹{(user.balance / 100).toFixed(2)}</>
              )}
            </p>
          </div>
          
          <div className="p-4 bg-gray-800 rounded-md">
            <div className="flex justify-between">
              <span className="text-gray-400">Potential win:</span>
              <span className="font-bold text-indigo-400">
                ₹{(potentialWin / 100).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-gray-400">Odds:</span>
              <span className="text-indigo-400">
                {prediction === 'team_a' && (match.oddTeamA / 100).toFixed(2)}
                {prediction === 'team_b' && (match.oddTeamB / 100).toFixed(2)}
                {prediction === 'draw' && ((match.oddDraw || 300) / 100).toFixed(2)}
                {!prediction && '0.00'}
              </span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button 
            className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            disabled={!prediction || betAmount <= 0 || placeBetMutation.isPending}
            onClick={() => placeBetMutation.mutate()}
          >
            {placeBetMutation.isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Place Bet'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}