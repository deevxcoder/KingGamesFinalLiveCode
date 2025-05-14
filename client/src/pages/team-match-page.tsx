import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, Trophy, Wallet, LogOut, User as UserIcon } from "lucide-react";
import { IoFootball, IoBasketball } from "react-icons/io5";
import { GiCricketBat } from "react-icons/gi";
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

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
  coverImage: string | null;
  teamAImage: string | null;
  teamBImage: string | null;
  createdAt: string;
};

export default function TeamMatchPage() {
  const { user, logoutMutation } = useAuth();
  const [_, setLocation] = useLocation();
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  return (
    <div className="flex h-screen bg-slate-950 text-slate-200">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block h-screen">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
            <div className="px-4 py-3 flex justify-between items-center">
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500">
                Sports Betting
              </h1>
              
              {user && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-800/60 px-3 py-1.5 rounded-full">
                    <Wallet className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">₹{(user.balance / 100).toFixed(2)}</span>
                  </div>
                  
                  {/* User avatar dropdown - only for mobile */}
                  <div className="block lg:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="focus:outline-none">
                        <Avatar className="h-8 w-8 bg-gradient-to-r from-primary to-blue-400">
                          <AvatarFallback className="text-white font-bold text-xs">
                            {user.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <div className="flex items-center gap-2 p-2 border-b border-slate-700">
                          <Avatar className="h-8 w-8 bg-gradient-to-r from-primary to-blue-400">
                            <AvatarFallback className="text-white font-bold text-xs">
                              {user.username.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{user.username}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                          </div>
                        </div>
                        <DropdownMenuItem onClick={() => setLocation("/profile")} className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span>Profile</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-300 flex items-center gap-2">
                          <LogOut className="h-4 w-4" />
                          <span>Logout</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="container mx-auto px-4 py-4">
            <TeamMatchTabs />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}

function TeamMatchTabs() {
  const [activeTab, setActiveTab] = useState("cricket");
  const { toast } = useToast();
  const { user } = useAuth() || {};
  const [, setLocation] = useLocation();

  // Query for active matches based on category
  const { data: matches = [], isLoading, error } = useQuery<TeamMatch[]>({
    queryKey: ['/api/team-matches/category', activeTab],
    queryFn: async () => {
      const response = await fetch(`/api/team-matches/category/${activeTab}`);
      if (!response.ok) {
        throw new Error('Failed to fetch matches');
      }
      return response.json();
    },
  });

  if (error) {
    toast({
      title: "Error",
      description: "Failed to load matches. Please try again.",
      variant: "destructive",
    });
  }

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <Tabs defaultValue="cricket" onValueChange={handleTabChange} className="w-full">
      <TabsList className="grid grid-cols-4 mb-8">
        <TabsTrigger value="cricket" className="flex items-center justify-center">
          <GiCricketBat className="h-4 w-4 mr-2" />
          Cricket
        </TabsTrigger>
        <TabsTrigger value="football" className="flex items-center justify-center">
          <IoFootball className="h-4 w-4 mr-2" />
          Football
        </TabsTrigger>
        <TabsTrigger value="basketball" className="flex items-center justify-center">
          <IoBasketball className="h-4 w-4 mr-2" />
          Basketball
        </TabsTrigger>
        <TabsTrigger value="other" className="flex items-center justify-center">
          <Trophy className="h-4 w-4 mr-2" />
          Other
        </TabsTrigger>
      </TabsList>
      
      {Object.keys({ cricket: true, football: true, basketball: true, other: true }).map((category) => (
        <TabsContent key={category} value={category} className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : matches.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No {category} matches available right now.</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for new matches.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TeamMatchBetting({ match, onClose }: { match: TeamMatch, onClose: () => void }) {
  const [prediction, setPrediction] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState<number>(100);
  const { toast } = useToast();
  const { user } = useAuth() || {};
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const formattedDate = format(new Date(match.matchTime), 'MMM dd, yyyy');
  const formattedTime = format(new Date(match.matchTime), 'h:mm a');

  const handlePredictionSelect = (value: string) => {
    setPrediction(value);
  };

  const handleBetAmountSelect = (amount: number) => {
    setBetAmount(amount);
  };

  const calculatePotentialWin = () => {
    if (!prediction) return 0;

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

  const handlePlaceBet = async () => {
    if (!prediction || betAmount <= 0) {
      toast({
        title: "Invalid Selection",
        description: "Please select a prediction and bet amount",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to place a bet",
        variant: "destructive",
      });
      return;
    }

    if (user.balance < betAmount) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance to place this bet",
        variant: "destructive",
      });
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch(`/api/team-matches/${match.id}/play`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prediction,
          betAmount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to place bet");
      }

      const data = await response.json();
      
      // Update cached data
      queryClient.invalidateQueries({ queryKey: ['/api/games/my-history'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      
      toast({
        title: "Bet Placed Successfully!",
        description: `Your bet of ₹${(betAmount/100).toFixed(2)} has been placed. Good luck!`,
        variant: "default",
      });
      
      onClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to place bet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPending(false);
    }
  };

  const potentialWin = calculatePotentialWin();

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <Card className="bg-gray-900 text-white border-gray-800 w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Place your bet</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
          </div>
          <CardDescription className="text-gray-400">
            {match.teamA} vs {match.teamB} | {formattedDate}, {formattedTime}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Button
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center justify-center ${
                prediction === 'team_a' 
                  ? 'bg-indigo-900/50 border-indigo-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              }`}
              onClick={() => handlePredictionSelect('team_a')}
            >
              <span className="font-medium">{match.teamA}</span>
              <span className="text-xl font-bold text-indigo-400 mt-1">
                {(match.oddTeamA / 100).toFixed(2)}x
              </span>
            </Button>
            <Button
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center justify-center ${
                prediction === 'draw' 
                  ? 'bg-indigo-900/50 border-indigo-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              }`}
              onClick={() => handlePredictionSelect('draw')}
            >
              <span className="font-medium">Draw</span>
              <span className="text-xl font-bold text-indigo-400 mt-1">
                {(match.oddDraw ? match.oddDraw / 100 : 3).toFixed(2)}x
              </span>
            </Button>
            <Button
              variant="outline"
              className={`p-4 h-auto flex flex-col items-center justify-center ${
                prediction === 'team_b' 
                  ? 'bg-indigo-900/50 border-indigo-500' 
                  : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
              }`}
              onClick={() => handlePredictionSelect('team_b')}
            >
              <span className="font-medium">{match.teamB}</span>
              <span className="text-xl font-bold text-indigo-400 mt-1">
                {(match.oddTeamB / 100).toFixed(2)}x
              </span>
            </Button>
          </div>
          <div className="mt-4">
            <label className="text-sm text-gray-400 mb-2 block">Bet Amount</label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <Button 
                variant="outline" 
                className={`${betAmount === 10000 ? 'bg-indigo-900/50 border-indigo-500' : ''}`}
                onClick={() => handleBetAmountSelect(10000)}
              >
                ₹100
              </Button>
              <Button 
                variant="outline" 
                className={`${betAmount === 50000 ? 'bg-indigo-900/50 border-indigo-500' : ''}`}
                onClick={() => handleBetAmountSelect(50000)}
              >
                ₹500
              </Button>
              <Button 
                variant="outline" 
                className={`${betAmount === 100000 ? 'bg-indigo-900/50 border-indigo-500' : ''}`}
                onClick={() => handleBetAmountSelect(100000)}
              >
                ₹1,000
              </Button>
              <Button 
                variant="outline" 
                className={`${betAmount === 500000 ? 'bg-indigo-900/50 border-indigo-500' : ''}`}
                onClick={() => handleBetAmountSelect(500000)}
              >
                ₹5,000
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="h-9 w-12 p-0"
                onClick={() => {
                  if (betAmount > 0) {
                    handleBetAmountSelect(Math.max(0, betAmount - 5000));
                  }
                }}
              >
                -
              </Button>
              <div className="flex-1 relative">
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="Custom amount"
                  className="text-center pr-16"
                  value={betAmount > 0 ? (betAmount / 100).toString() : ''}
                  onChange={(e) => {
                    // Only allow numbers and decimal point
                    const value = e.target.value.replace(/[^0-9.]/g, '');
                    if (value === '' || value === '.') {
                      handleBetAmountSelect(0);
                    } else {
                      handleBetAmountSelect(Math.max(0, parseFloat(value) * 100));
                    }
                  }}
                />
                <span className="absolute right-2 top-[9px] text-gray-400">₹</span>
              </div>
              <Button
                variant="outline"
                className="h-9 w-12 p-0"
                onClick={() => {
                  handleBetAmountSelect(betAmount + 5000);
                }}
              >
                +
              </Button>
              <Button
                variant="outline"
                className="h-9 px-2"
                onClick={() => {
                  if (user && user.balance > 0) {
                    handleBetAmountSelect(user.balance);
                  }
                }}
              >
                MAX
              </Button>
            </div>
          </div>
          <div className="p-4 bg-gray-800 rounded-md mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Potential win:</span>
              <span className="font-bold text-indigo-400">₹{(potentialWin/100).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-400">Your balance:</span>
              <span className="font-medium text-gray-300">₹{user ? (user.balance/100).toFixed(2) : '0.00'}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700"
            onClick={handlePlaceBet}
            disabled={!prediction || betAmount <= 0 || isPending}
          >
            {isPending ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : 'Place Bet'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function MatchCard({ match }: { match: TeamMatch }) {
  const [isOpen, setIsOpen] = useState(false);
  const [, setLocation] = useLocation();

  const matchTime = new Date(match.matchTime);
  const formattedDate = format(matchTime, 'MMM dd, yyyy');
  const formattedTime = format(matchTime, 'h:mm a');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-600 hover:bg-green-700">Open</Badge>;
      case 'closed':
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Closed</Badge>;
      case 'resulted':
        return <Badge className="bg-blue-600 hover:bg-blue-700">Resulted</Badge>;
      default:
        return <Badge className="bg-gray-600 hover:bg-gray-700">{status}</Badge>;
    }
  };

  const getResultText = (result: string) => {
    if (result === 'pending') return 'Pending';
    if (result === 'team_a') return `${match.teamA} Won`;
    if (result === 'team_b') return `${match.teamB} Won`;
    if (result === 'draw') return 'Match Drawn';
    return result;
  };

  // Get correct icon for category
  const getCategoryIcon = () => {
    switch (match.category) {
      case 'cricket':
        return <GiCricketBat className="h-5 w-5 mr-2 text-indigo-400" />;
      case 'football':
        return <IoFootball className="h-5 w-5 mr-2 text-indigo-400" />;
      case 'basketball':
        return <IoBasketball className="h-5 w-5 mr-2 text-indigo-400" />; 
      default:
        return <Trophy className="h-5 w-5 mr-2 text-indigo-400" />;
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 overflow-hidden h-full flex flex-col">
      {match.coverImage && (
        <div className="relative w-full h-32 overflow-hidden">
          <img 
            src={match.coverImage} 
            alt={`${match.teamA} vs ${match.teamB}`} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent"></div>
          <div className="absolute top-2 right-2">
            {getStatusBadge(match.status)}
          </div>
        </div>
      )}
      <CardHeader className={`pb-3 ${match.coverImage ? 'pt-3' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            {getCategoryIcon()}
            <CardTitle className="text-lg text-white">{match.teamA} vs {match.teamB}</CardTitle>
          </div>
          {!match.coverImage && getStatusBadge(match.status)}
        </div>
        <CardDescription className="text-gray-400">
          {match.description || `${match.category.charAt(0).toUpperCase() + match.category.slice(1)} Match`}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-gray-300">
            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm">{formattedDate}</span>
          </div>
          <div className="flex items-center text-gray-300">
            <Clock className="h-4 w-4 mr-2 text-gray-500" />
            <span className="text-sm">{formattedTime}</span>
          </div>
        </div>
        
        {match.status === 'resulted' && (
          <div className="mb-4 p-2 bg-gray-800 rounded-md">
            <p className="text-center font-medium">
              Result: <span className="text-indigo-400">{getResultText(match.result)}</span>
            </p>
          </div>
        )}
        
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-gray-800 p-3 rounded-md">
            <p className="text-sm text-gray-400">{match.teamA}</p>
            <p className="text-xl font-bold text-indigo-400">{(match.oddTeamA / 100).toFixed(2)}x</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-md">
            <p className="text-sm text-gray-400">Draw</p>
            <p className="text-xl font-bold text-indigo-400">{(match.oddDraw ? match.oddDraw / 100 : 3).toFixed(2)}x</p>
          </div>
          <div className="bg-gray-800 p-3 rounded-md">
            <p className="text-sm text-gray-400">{match.teamB}</p>
            <p className="text-xl font-bold text-indigo-400">{(match.oddTeamB / 100).toFixed(2)}x</p>
          </div>
        </div>
      </CardContent>
      <Separator className="bg-gray-800" />
      <CardFooter className="pt-4 pb-4">
        {match.status === 'open' ? (
          <Button 
            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white"
            onClick={() => setIsOpen(true)}
          >
            Place Bet
          </Button>
        ) : (
          <Button className="w-full" variant="outline" disabled>
            Betting Closed
          </Button>
        )}
      </CardFooter>
      
      {isOpen && (
        <TeamMatchBetting match={match} onClose={() => setIsOpen(false)} />
      )}
    </Card>
  );
}