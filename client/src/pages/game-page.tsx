import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import CoinFlipGame from "@/components/coin-flip-game";

export default function GamePage() {
  return (
    <DashboardLayout title="Royal Coin Toss">
      {/* Coin Toss Game */}
      <CoinFlipGame />
    </DashboardLayout>
  );
}
