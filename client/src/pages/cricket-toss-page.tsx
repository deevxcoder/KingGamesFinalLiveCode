import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Wallet, LogOut, User as UserIcon } from "lucide-react";
import { GiCricketBat } from "react-icons/gi";
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import CricketTossGame from '@/components/cricket-toss-game';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useLocation } from 'wouter';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

// Type for standalone Cricket Toss Game
type CricketTossGame = {
  id: number;
  userId: number;
  gameType: string;
  betAmount: number;
  prediction: string;
  result: string | null;
  payout: number;
  createdAt: string | null;
  gameData: {
    teamA: string;
    teamB: string;
    description: string;
    tossTime: string;
    oddTeamA: number;
    oddTeamB: number;
    imageUrl?: string;
    status: string;
  };
};

// Type for Team Match (backward compatibility)
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

export default function CricketTossPage() {
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
                Cricket Toss
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
            <CricketTossMatches />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}

function CricketTossMatches() {
  const { toast } = useToast();

  // Query for standalone cricket toss games (new API)
  const { data: cricketTossGames = [], isLoading: isLoadingTossGames, error: tossGamesError } = useQuery<CricketTossGame[]>({
    queryKey: ['/api/cricket-toss-games'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/cricket-toss-games');
        if (!response.ok) {
          throw new Error('Failed to fetch cricket toss games');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching cricket toss games:', error);
        return [];
      }
    },
  });

  // For backward compatibility - query for cricket team matches
  const { data: teamMatches = [], isLoading: isLoadingTeamMatches, error: teamMatchesError } = useQuery<TeamMatch[]>({
    queryKey: ['/api/team-matches/category', 'cricket'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/team-matches/category/cricket');
        if (!response.ok) {
          throw new Error('Failed to fetch team matches');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching team matches:', error);
        return [];
      }
    },
  });

  // Combine both data sources for the UI
  const allGames = [
    ...cricketTossGames.map(game => ({
      id: game.id,
      type: 'cricket_toss_game' as const,
      data: game
    })),
    ...teamMatches.map(match => ({
      id: match.id,
      type: 'team_match' as const,
      data: match
    }))
  ];
  
  const isLoading = isLoadingTossGames || isLoadingTeamMatches;
  
  // Show error toast if both queries failed
  if (tossGamesError && teamMatchesError) {
    toast({
      title: "Error",
      description: "Failed to load cricket games. Please try again.",
      variant: "destructive",
    });
  }

  // Helper function to get combined open games
  const getOpenGames = () => {
    const openTossGames = cricketTossGames.filter(game => 
      (game.gameData?.status === 'open')
    );
    
    const openTeamMatches = teamMatches.filter(match => 
      match.status === 'open' && match.category === 'cricket'
    );
    
    return [
      ...openTossGames.map(game => ({
        id: game.id,
        type: 'cricket_toss_game' as const,
        data: game
      })),
      ...openTeamMatches.map(match => ({
        id: match.id,
        type: 'team_match' as const,
        data: match
      }))
    ];
  };
  
  // Helper function to get combined live games
  const getLiveGames = () => {
    const now = new Date();
    
    const liveTossGames = cricketTossGames.filter(game => {
      const tossTime = new Date(game.gameData.tossTime);
      return game.gameData?.status === 'open' && tossTime <= now;
    });
    
    const liveTeamMatches = teamMatches.filter(match => {
      const matchTime = new Date(match.matchTime);
      return match.status === 'open' && matchTime <= now && match.category === 'cricket';
    });
    
    return [
      ...liveTossGames.map(game => ({
        id: game.id,
        type: 'cricket_toss_game' as const,
        data: game
      })),
      ...liveTeamMatches.map(match => ({
        id: match.id,
        type: 'team_match' as const,
        data: match
      }))
    ];
  };

  const openGames = getOpenGames();
  const liveGames = getLiveGames();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="upcoming" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming Games
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            Live Now
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : openGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {openGames.map((game) => (
                <CricketTossCard 
                  key={`${game.type}-${game.id}`}
                  game={game}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No upcoming cricket games available right now.</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for new games.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="live" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : liveGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveGames.map((game) => (
                <CricketTossCard 
                  key={`${game.type}-${game.id}`}
                  game={game}
                />
              ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No live cricket games available right now.</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for live games.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

type GameItem = {
  id: number;
  type: 'cricket_toss_game' | 'team_match';
  data: CricketTossGame | TeamMatch;
};

function CricketTossCard({ game }: { game: GameItem }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Helper function to get data based on game type
  const getTeamA = () => {
    if (game.type === 'cricket_toss_game') {
      return (game.data as CricketTossGame).gameData.teamA;
    } else {
      return (game.data as TeamMatch).teamA;
    }
  };
  
  const getTeamB = () => {
    if (game.type === 'cricket_toss_game') {
      return (game.data as CricketTossGame).gameData.teamB;
    } else {
      return (game.data as TeamMatch).teamB;
    }
  };
  
  const getOddTeamA = () => {
    if (game.type === 'cricket_toss_game') {
      return (game.data as CricketTossGame).gameData.oddTeamA;
    } else {
      return (game.data as TeamMatch).oddTeamA;
    }
  };
  
  const getOddTeamB = () => {
    if (game.type === 'cricket_toss_game') {
      return (game.data as CricketTossGame).gameData.oddTeamB;
    } else {
      return (game.data as TeamMatch).oddTeamB;
    }
  };
  
  const getTime = () => {
    if (game.type === 'cricket_toss_game') {
      return new Date((game.data as CricketTossGame).gameData.tossTime);
    } else {
      return new Date((game.data as TeamMatch).matchTime);
    }
  };
  
  const matchTime = getTime();
  const formattedDate = format(matchTime, 'MMM dd, yyyy');
  const formattedTime = format(matchTime, 'h:mm a');
  
  return (
    <>
      <Card 
        className="bg-gray-900 border-gray-800 overflow-hidden hover:shadow-md hover:shadow-indigo-900/20 transition-shadow cursor-pointer"
        onClick={() => setIsDialogOpen(true)}
      >
        <div className="relative">
          <div className="bg-gradient-to-r from-indigo-800 to-violet-800 h-20 flex items-center justify-center">
            <GiCricketBat className="h-12 w-12 text-white/50" />
          </div>
          <Badge className="absolute top-2 right-2 bg-indigo-600">
            {game.type === 'cricket_toss_game' ? 'Standalone Toss' : 'Team Toss'}
          </Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-2">
            <h3 className="font-bold text-xl line-clamp-1">{getTeamA()} vs {getTeamB()}</h3>
            
            <div className="text-gray-400 text-sm flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 
              {formattedDate}
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" /> 
              {formattedTime}
            </div>
            
            <div className="flex justify-between mt-3">
              <div className="text-center flex-1 border-r border-gray-800">
                <div className="text-gray-400 text-xs mb-1">{getTeamA()}</div>
                <div className="font-bold text-indigo-400">{(getOddTeamA() / 100).toFixed(2)}x</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-gray-400 text-xs mb-1">{getTeamB()}</div>
                <div className="font-bold text-indigo-400">{(getOddTeamB() / 100).toFixed(2)}x</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <CricketTossGame 
            match={game.data} 
            onClose={() => setIsDialogOpen(false)} 
          />
        </div>
      )}
    </>
  );
}