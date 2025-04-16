import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
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
    <DashboardLayout title="Royal Coin Toss">
      {/* Balance and Stats Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 space-y-4 lg:space-y-0">
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
          <BalanceCard balance={user?.balance || 0} />
          <StatsCard winRate={stats?.winRate || 0} totalBets={stats?.totalBets || 0} />
        </div>
      </div>
      
      {/* Coin Toss Game */}
      <CoinFlipGame />
    </DashboardLayout>
  );
}
