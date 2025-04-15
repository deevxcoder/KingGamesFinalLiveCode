import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import GameCard from "@/components/game-card";
import RecentWinners from "@/components/recent-winners";
import RecentResults from "@/components/recent-results";
import BalanceCard from "@/components/balance-card";
import StatsCard from "@/components/stats-card";
import GameHistoryTable from "@/components/game-history-table";
import { Button } from "@/components/ui/button";
import { Play, Dice1, Trophy, Calendar, BarChart2, TrendingUp } from "lucide-react";
import { useLocation } from "wouter";

// Sample game cards data - in real app this would come from API
const gameCards = [
  {
    id: "coinflip",
    title: "Coin Flip",
    description: "Classic heads or tails betting with 50/50 odds for instant wins.",
    imageBg: "linear-gradient(to right, #1e293b, #3b5cb8)",
    path: "/play",
    popularity: "high" as const,
    winRate: 50
  },
  {
    id: "marketgame",
    title: "Market Game",
    description: "Strategic market betting game with multiple betting options.",
    imageBg: "linear-gradient(to right, #1a1d30, #4e3a9a)",
    path: "/markets",
    popularity: "medium" as const,
    winRate: 36
  }
];

// Sample market results data - in real app this would come from API
const sampleMarketResults = [
  {
    id: 1,
    name: "Mumbai Main",
    type: "day",
    openTime: "2023-04-14T10:00:00Z",
    closeTime: "2023-04-14T18:00:00Z",
    openResult: "234",
    closeResult: "567",
    status: "resulted",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Delhi Express",
    type: "morning",
    openTime: "2023-04-14T09:30:00Z",
    closeTime: "2023-04-14T13:30:00Z",
    openResult: "456",
    closeResult: "789",
    status: "resulted",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

// Sample recent winners data
const sampleRecentWinners = [
  {
    id: 1,
    username: "lucky777",
    game: "Coin Flip",
    amount: 5000,
    payout: 9500,
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 2,
    username: "betmaster",
    game: "Market Game",
    amount: 10000,
    payout: 50000,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  }
];

export default function HomePage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Fetch user statistics
  const { data: stats = { winRate: 0, totalBets: 0 } } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Fetch recent games for the user
  const { data: recentGames = [] } = useQuery({
    queryKey: ["/api/games/my-history"],
    enabled: !!user,
  });

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const canManageUsers = isAdmin || isSubadmin;

  return (
    <DashboardLayout title="Dashboard">
      {/* Welcome message */}
      <div className="mb-6">
        <p className="text-slate-400">
          Welcome back, <span className="font-medium text-slate-300">{user?.username}</span>!
        </p>
      </div>
      
      {/* Balance and Stats Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
          <BalanceCard balance={user?.balance || 0} />
          <StatsCard winRate={stats?.winRate || 0} totalBets={stats?.totalBets || 0} />
        </div>
        
        {/* Admin/Subadmin Controls - Only visible to admin/subadmin */}
        {canManageUsers && (
          <div className="flex flex-wrap gap-2">
            <Button 
              className="bg-gradient-to-r from-violet-700 to-indigo-600 hover:from-violet-600 hover:to-indigo-500"
              onClick={() => setLocation("/users")}
            >
              Manage Users
            </Button>
            {isAdmin && (
              <Button 
                variant="outline"
                className="border-slate-700 text-teal-300 hover:bg-slate-800 hover:text-teal-200"
                onClick={() => setLocation("/subadmins")}
              >
                Manage Subadmins
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Featured Games Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center text-slate-200">
            <Play className="h-5 w-5 mr-2 text-blue-500" />
            Featured Games
          </h2>
          <Button 
            variant="ghost" 
            className="text-blue-400 hover:text-blue-300 text-sm hover:bg-slate-800/60"
            onClick={() => setLocation("/games")}
          >
            View All
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {gameCards.map((game) => (
            <GameCard 
              key={game.id}
              id={game.id}
              title={game.title}
              description={game.description}
              imageBg={game.imageBg}
              path={game.path}
              popularity={game.popularity}
              winRate={game.winRate}
            />
          ))}
        </div>
      </div>
      
      {/* Recent Activity Section - Two column layout on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Games */}
        <GameHistoryTable games={recentGames} />
        
        {/* Right column - winners and results */}
        <div className="space-y-6">
          <RecentWinners winners={sampleRecentWinners} />
          <RecentResults results={sampleMarketResults} />
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button 
          className="py-8 text-lg bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500"
          onClick={() => setLocation("/play")}
        >
          <Dice1 className="h-5 w-5 mr-2" />
          Play Games
        </Button>
        
        <Button 
          variant="outline"
          className="py-8 text-lg border-slate-700 text-cyan-300 hover:bg-slate-800/50 hover:text-cyan-200"
          onClick={() => setLocation("/markets")}
        >
          <Calendar className="h-5 w-5 mr-2" />
          Markets
        </Button>
        
        <Button 
          variant="outline"
          className="py-8 text-lg border-slate-700 text-emerald-300 hover:bg-slate-800/50 hover:text-emerald-200"
          onClick={() => setLocation("/game-history")}
        >
          <BarChart2 className="h-5 w-5 mr-2" />
          Game History
        </Button>
        
        <Button 
          variant="outline"
          className="py-8 text-lg border-slate-700 text-amber-300 hover:bg-slate-800/50 hover:text-amber-200"
          onClick={() => setLocation("/leaderboard")}
        >
          <Trophy className="h-5 w-5 mr-2" />
          Leaderboard
        </Button>
      </div>
    </DashboardLayout>
  );
}
