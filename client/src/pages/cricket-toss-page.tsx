import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { GiCricketBat } from "react-icons/gi";
import Sidebar from '@/components/sidebar';
import MobileNav from '@/components/mobile-nav';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import CricketTossGame from '@/components/cricket-toss-game';

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
      type: 'cricket_toss_game',
      data: game
    })),
    ...teamMatches.map(match => ({
      type: 'team_match',
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="upcoming" className="flex items-center justify-center">
            <Calendar className="h-4 w-4 mr-2" />
            Upcoming Matches
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
          ) : matches.filter(match => match.status === 'open').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches
                .filter(match => match.status === 'open')
                .map((match) => (
                  <CricketTossCard key={match.id} match={match} />
                ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No upcoming cricket matches available right now.</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for new matches.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="live" className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center p-10">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : matches.filter(match => new Date(match.matchTime) <= new Date() && match.status === 'open').length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches
                .filter(match => new Date(match.matchTime) <= new Date() && match.status === 'open')
                .map((match) => (
                  <CricketTossCard key={match.id} match={match} />
                ))}
            </div>
          ) : (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6 text-center">
                <p className="text-gray-400">No live cricket matches available right now.</p>
                <p className="text-sm text-gray-500 mt-2">Check back later for live matches.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CricketTossCard({ match }: { match: TeamMatch }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const matchTime = new Date(match.matchTime);
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
          <Badge className="absolute top-2 right-2 bg-indigo-600">Toss Game</Badge>
        </div>
        <CardContent className="p-4">
          <div className="flex flex-col space-y-2">
            <h3 className="font-bold text-xl line-clamp-1">{match.teamA} vs {match.teamB}</h3>
            
            <div className="text-gray-400 text-sm flex items-center">
              <Calendar className="h-4 w-4 mr-1" /> 
              {formattedDate}
              <span className="mx-2">•</span>
              <Clock className="h-4 w-4 mr-1" /> 
              {formattedTime}
            </div>
            
            <div className="flex justify-between mt-3">
              <div className="text-center flex-1 border-r border-gray-800">
                <div className="text-gray-400 text-xs mb-1">{match.teamA}</div>
                <div className="font-bold text-indigo-400">{(match.oddTeamA / 100).toFixed(2)}x</div>
              </div>
              <div className="text-center flex-1">
                <div className="text-gray-400 text-xs mb-1">{match.teamB}</div>
                <div className="font-bold text-indigo-400">{(match.oddTeamB / 100).toFixed(2)}x</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {isDialogOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
          <CricketTossGame 
            match={match} 
            onClose={() => setIsDialogOpen(false)} 
          />
        </div>
      )}
    </>
  );
}