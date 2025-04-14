import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import Sidebar from "@/components/sidebar";
import GameHistoryTable from "@/components/game-history-table";
import StatsCard from "@/components/stats-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function GameHistoryPage() {
  const { user } = useAuth();
  
  // Fetch user statistics
  const { data: stats } = useQuery({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Fetch all games for the user
  const { data: games = [], isLoading } = useQuery({
    queryKey: ["/api/games/my-history"],
    enabled: !!user,
  });

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Game History</CardTitle>
              <CardDescription>
                View your coin toss game history and betting results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <StatsCard winRate={stats?.winRate || 0} totalBets={stats?.totalBets || 0} showFullWidth />
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <GameHistoryTable games={games} showFullHistory />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
