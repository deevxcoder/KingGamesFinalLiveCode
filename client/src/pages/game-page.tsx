import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import CoinFlipGame from "@/components/coin-flip-game";
import BalanceCard from "@/components/balance-card";
import StatsCard from "@/components/stats-card";
import { useQuery } from "@tanstack/react-query";

export default function GamePage() {
  const { user } = useAuth();
  
  // Fetch user statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          
          {/* Balance and Stats Bar */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
              <BalanceCard balance={user?.balance || 0} />
              <StatsCard winRate={stats?.winRate || 0} totalBets={stats?.totalBets || 0} />
            </div>
          </div>
          
          {/* Coin Toss Game */}
          <CoinFlipGame />
          
        </div>
      </main>
    </div>
  );
}
