import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import GameCard from "@/components/game-card";
import GameIconCard from "@/components/game-icon-card";
import RecentWinners from "@/components/recent-winners";
import RecentResults from "@/components/recent-results";
import BalanceCard from "@/components/balance-card";
import StatsCard from "@/components/stats-card";
import DashboardStatsCard from "@/components/dashboard-stats-card";
import PromoSlider from "@/components/promo-slider";
import GameHistoryTable from "@/components/game-history-table";
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Dice1, 
  Trophy, 
  Calendar, 
  BarChart2, 
  TrendingUp,
  Users,
  ShieldCheck,
  Target,
  Gamepad,
  Coins,
  Club,
  Award,
  DollarSign,
  BarChart, 
  Activity,
  Settings
} from "lucide-react";
import { useLocation } from "wouter";

// Sample game cards data - in real app this would come from API
const gameCards = [
  {
    id: "marketgame",
    title: "Market Game",
    description: "Strategic market betting game with multiple betting options.",
    imageBg: "linear-gradient(to right, #1a1d30, #4e3a9a)",
    path: "/markets",
    popularity: "high" as const,
    winRate: 40,
    gameType: "market" as const // Using game type for automatic image selection
  },
  {
    id: "crickettoss",
    title: "Cricket Toss",
    description: "Predict the cricket match toss outcome for quick wins.",
    imageBg: "linear-gradient(to right, #1e3a30, #2a8062)",
    path: "/cricket-toss",
    popularity: "high" as const,
    winRate: 50,
    gameType: "cricket" as const // Using game type for automatic image selection
  },
  {
    id: "sportsbetting",
    title: "Sports Betting",
    description: "Bet on your favorite cricket teams and matches.",
    imageBg: "linear-gradient(to right, #2d2339, #784cb3)",
    path: "/sports",
    popularity: "medium" as const,
    winRate: 36,
    gameType: "sports" as const // Using game type for automatic image selection
  },
  {
    id: "coinflip",
    title: "Coin Flip",
    description: "Classic heads or tails betting with 50/50 odds for instant wins.",
    imageBg: "linear-gradient(to right, #1e293b, #3b5cb8)",
    path: "/coinflip",
    popularity: "high" as const,
    winRate: 50,
    gameType: "coinflip" as const // Using game type for automatic image selection
  }
];

// Sample market results data - in real app this would come from API
const sampleMarketResults = [
  {
    id: 1,
    name: "Dishawar Market",
    type: "dishawar",
    openTime: "2023-04-14T10:00:00Z",
    closeTime: "2023-04-14T18:00:00Z",
    openResult: "34",
    closeResult: null,
    status: "resulted",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Gali Market",
    type: "gali",
    openTime: "2023-04-14T09:30:00Z",
    closeTime: "2023-04-14T13:30:00Z",
    openResult: "56",
    closeResult: null,
    status: "resulted",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  }
];

// We'll fetch real winners data from the API

export default function HomePage() {
  const { user } = useAuth();
  const [_, setLocation] = useLocation();
  
  // Fetch user statistics
  const { data: stats = { winRate: 0, totalBets: 0 } } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Fetch recent games for the user
  const { data: recentGames = [] as any[] } = useQuery({
    queryKey: ["/api/games/my-history"],
    enabled: !!user,
  });
  
  // Fetch top winners from all games
  const { data: topWinners = [] as any } = useQuery({
    queryKey: ["/api/games/top-winners"],
    enabled: !!user,
  });
  
  // Define the interface for subadmin statistics
  interface SubadminStats {
    totalProfit: number;
    totalDeposits: number;
    totalUsers: number;
    activeUsers: number;
    recentGames: Array<{
      id: number;
      username: string;
      gameType: string;
      betAmount: number;
      result: 'win' | 'loss' | 'pending';
      createdAt: string;
    }>;
  }
  
  // Fetch subadmin statistics with proper typing
  const subadminStatsQuery = useQuery<SubadminStats>({
    queryKey: ["/api/subadmin/stats"],
    enabled: !!user && user.role === UserRole.SUBADMIN,
  });
  
  const subadminStats: SubadminStats = subadminStatsQuery.data || { 
    totalProfit: 0, 
    totalDeposits: 0, 
    totalUsers: 0, 
    activeUsers: 0, 
    recentGames: [] 
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const isPlayer = user?.role === UserRole.PLAYER;
  const canManageUsers = isAdmin || isSubadmin;
  const isAdminOrSubadmin = isAdmin || isSubadmin;

  return (
    <DashboardLayout title="Dashboard">
      {/* Balance Bar for Admin/Subadmin, Promo Slider for Players */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
        {isPlayer ? (
          // Promo Slider for Players
          <div className="w-full">
            <PromoSlider />
          </div>
        ) : (
          // Balance card for Admin/Subadmin
          <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
            <BalanceCard balance={user?.balance || 0} />
          </div>
        )}
        
        {/* Admin/Subadmin Controls - Only visible to admin/subadmin */}
        {canManageUsers && (
          <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
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
      
      {/* Subadmin Statistics Dashboard - Only visible to subadmins */}
      {isSubadmin && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center text-slate-200">
            <BarChart2 className="h-5 w-5 mr-2 text-blue-500" />
            Dashboard Statistics
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Profit Card */}
            <DashboardStatsCard 
              title="Total Profit" 
              value={`₹${subadminStats.totalProfit.toLocaleString()}`}
              icon={<TrendingUp className="h-5 w-5 text-emerald-400" />}
              trend="up"
              color="green"
            />
            
            {/* Total Deposits Card */}
            <DashboardStatsCard 
              title="Total Deposits" 
              value={`₹${subadminStats.totalDeposits.toLocaleString()}`}
              icon={<DollarSign className="h-5 w-5 text-blue-400" />}
              trend="up" 
              color="blue"
            />
            
            {/* Total Users Card */}
            <DashboardStatsCard 
              title="Total Users" 
              value={subadminStats.totalUsers.toString()}
              icon={<Users className="h-5 w-5 text-purple-400" />}
              trend="up"
              color="purple"
            />
            
            {/* Active Users Card */}
            <DashboardStatsCard 
              title="Active Users" 
              value={subadminStats.activeUsers.toString()}
              icon={<Activity className="h-5 w-5 text-amber-400" />}
              trend="neutral"
              color="amber"
            />
          </div>
          
          {/* Recent Games Section */}
          {subadminStats.recentGames && subadminStats.recentGames.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3 text-slate-200">Recent Game Activity</h3>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-800">
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Player</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Game</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Result</th>
                        <th className="py-3 px-4 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {subadminStats.recentGames.map((game, idx) => (
                        <tr key={game.id} className={idx % 2 === 0 ? 'bg-slate-800/30' : 'bg-slate-800/10'}>
                          <td className="py-3 px-4 text-sm text-slate-300">{game.username}</td>
                          <td className="py-3 px-4 text-sm text-slate-300 capitalize">
                            {game.gameType.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-4 text-sm">
                            <span className="font-medium text-emerald-400">₹{game.betAmount}</span>
                          </td>
                          <td className="py-3 px-4 text-sm">
                            {game.result === 'win' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/30 text-green-400">
                                Win
                              </span>
                            ) : game.result === 'loss' ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900/30 text-red-400">
                                Loss
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-700/50 text-slate-400">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-400">
                            {new Date(game.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Game Icon Cards - Only visible to players */}
      {isPlayer && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <GameIconCard
            id="market"
            title="Market Games"
            icon={Calendar}
            path="/markets"
            gradient="bg-gradient-to-r from-blue-700 to-cyan-600"
          />
          <GameIconCard
            id="sports"
            title="Sports Betting"
            icon={Trophy}
            path="/sports"
            gradient="bg-gradient-to-r from-purple-700 to-indigo-600"
          />
          <GameIconCard
            id="cricket"
            title="Cricket Toss"
            icon={Award}
            path="/cricket-toss"
            gradient="bg-gradient-to-r from-green-700 to-emerald-600"
          />
          <GameIconCard
            id="coinflip"
            title="Coin Flip"
            icon={Coins}
            path="/coinflip"
            gradient="bg-gradient-to-r from-amber-700 to-yellow-600"
          />
        </div>
      )}
      
      {/* Admin/Subadmin message */}
      {isAdminOrSubadmin && (
        <div className="mb-8 p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h2 className="text-xl font-bold mb-3 text-slate-200">{isAdmin ? 'Admin' : 'Subadmin'} Panel</h2>
          <p className="text-slate-400 mb-4">
            {isAdmin 
              ? "As an admin, you don't have permission to play games. Your role is to manage the platform, games, and users."
              : "As a subadmin, you don't have permission to play games. Your role is to manage users assigned to you, their risk management, and jantri settings."}
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {/* User Management */}
            <Button 
              className="py-6 bg-gradient-to-r from-violet-700 to-indigo-600 hover:from-violet-600 hover:to-indigo-500"
              onClick={() => setLocation("/users")}
            >
              <Users className="h-5 w-5 mr-2" />
              Manage Users
            </Button>
            
            {/* Subadmin Management - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-teal-300 hover:bg-slate-800 hover:text-teal-200"
                onClick={() => setLocation("/subadmins")}
              >
                <ShieldCheck className="h-5 w-5 mr-2" />
                Manage Subadmins
              </Button>
            )}
            
            {/* Risk Management - Admin and Subadmin */}
            {(isAdmin || isSubadmin) && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-blue-300 hover:bg-slate-800 hover:text-blue-200"
                onClick={() => setLocation("/risk-management")}
              >
                <BarChart2 className="h-5 w-5 mr-2" />
                Risk Management
              </Button>
            )}
            
            {/* Jantri Management - Admin and Subadmin */}
            {(isAdmin || isSubadmin) && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-rose-300 hover:bg-slate-800 hover:text-rose-200"
                onClick={() => setLocation("/manage-jantri")}
              >
                <Dice1 className="h-5 w-5 mr-2" />
                Jantri Management
              </Button>
            )}
            
            {/* Cricket Toss Management - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-cyan-300 hover:bg-slate-800 hover:text-cyan-200"
                onClick={() => setLocation("/manage-cricket-toss")}
              >
                <Activity className="h-5 w-5 mr-2" />
                Cricket Toss Management
              </Button>
            )}
            
            {/* Sports Management - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-indigo-300 hover:bg-slate-800 hover:text-indigo-200"
                onClick={() => setLocation("/manage-sports")}
              >
                <BarChart className="h-5 w-5 mr-2" />
                Sports Management
              </Button>
            )}
            
            {/* Market Management - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-emerald-300 hover:bg-slate-800 hover:text-emerald-200"
                onClick={() => setLocation("/manage-markets")}
              >
                <Target className="h-5 w-5 mr-2" />
                Manage Markets
              </Button>
            )}
            
            {/* Settings - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-amber-300 hover:bg-slate-800 hover:text-amber-200"
                onClick={() => setLocation("/settings")}
              >
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </Button>
            )}
            
            {/* Fund Management - Admin Only */}
            {isAdmin && (
              <Button 
                variant="outline"
                className="py-6 border-slate-700 text-green-300 hover:bg-slate-800 hover:text-green-200"
                onClick={() => setLocation("/fund-management")}
              >
                <DollarSign className="h-5 w-5 mr-2" />
                Fund Management
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Player Features - Only visible to players */}
      {isPlayer && (
        <>
          {/* Featured Games Section */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-bold flex items-center text-slate-200">
                <Play className="h-5 w-5 mr-2 text-blue-500" />
                Featured Games
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
                  gameType={game.gameType}
                />
              ))}
            </div>
            
            <div className="mt-4 text-center">
              <Button 
                variant="outline"
                className="border-slate-700 text-blue-300 hover:bg-slate-800 hover:text-blue-200"
                onClick={() => setLocation("/games")}
              >
                <Gamepad className="h-4 w-4 mr-2" />
                View All Games
              </Button>
            </div>
          </div>
          
          {/* Recent Activity Section - Two column layout on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Games */}
            <GameHistoryTable games={recentGames as any[]} />
            
            {/* Right column - winners and results */}
            <div className="space-y-6">
              <RecentWinners winners={topWinners} />
              {/* We'll implement real market results later */}
              <RecentResults results={[]} />
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Button 
              className="py-8 text-lg bg-gradient-to-r from-purple-700 to-fuchsia-600 hover:from-purple-600 hover:to-fuchsia-500"
              onClick={() => setLocation("/coinflip")}
            >
              <Dice1 className="h-5 w-5 mr-2" />
              Coin Flip
            </Button>
            
            <Button 
              variant="outline"
              className="py-8 text-lg border-slate-700 text-cyan-300 hover:bg-slate-800/50 hover:text-cyan-200"
              onClick={() => setLocation("/markets")}
            >
              <Calendar className="h-5 w-5 mr-2" />
              Market Games
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
        </>
      )}
    </DashboardLayout>
  );
}
