import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import GameHistoryTable from "@/components/game-history-table";
import StatsCard from "@/components/stats-card";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Interface for stats data
interface UserStats {
  totalBets: number;
  winRate: number;
}

export default function GameHistoryPage() {
  const { user } = useAuth();
  
  // Fetch user statistics
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Import Game type from the game-history-table component
  type Game = React.ComponentProps<typeof GameHistoryTable>['games'][number];

  // Fetch all games for the user
  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/my-history"],
    enabled: !!user,
  });

  return (
    <DashboardLayout title="Game History">
      <Card className="mb-6">
        <CardHeader>
          <CardDescription>
            View your comprehensive betting history and results from all games
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
    </DashboardLayout>
  );
}
