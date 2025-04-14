import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import CoinFlipGame from "@/components/coin-flip-game";
import BalanceCard from "@/components/balance-card";
import StatsCard from "@/components/stats-card";
import GameHistoryTable from "@/components/game-history-table";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

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
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          
          {/* Welcome Title */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, <span className="font-medium">{user?.username}</span>!
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
              <div className="flex space-x-2">
                <Button 
                  className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-600"
                  onClick={() => setLocation("/users")}
                >
                  Manage Users
                </Button>
                {isAdmin && (
                  <Button 
                    variant="outline"
                    onClick={() => setLocation("/subadmins")}
                  >
                    Manage Subadmins
                  </Button>
                )}
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <Button 
              className="py-10 text-xl bg-gradient-to-r from-primary/90 to-blue-500/90 hover:from-primary hover:to-blue-600"
              onClick={() => setLocation("/play")}
            >
              Play Coin Toss Game
            </Button>
            
            <Button 
              variant="outline"
              className="py-10 text-xl border-primary/30 hover:bg-primary/5"
              onClick={() => setLocation("/")}
            >
              Back to Home Page
            </Button>
          </div>
          
          {/* Recent Games History */}
          <GameHistoryTable games={recentGames || []} />
          
        </div>
      </main>
    </div>
  );
}
