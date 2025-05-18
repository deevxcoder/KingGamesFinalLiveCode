import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import DashboardLayout from "@/components/dashboard-layout";
import { 
  Card,
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Activity,
  TrendingDown,
  TrendingUp,
  Users,
  Target,
  Loader2
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

interface RiskSummary {
  totalBetAmount: number;
  potentialLiability: number;
  potentialProfit: number;
  exposureAmount: number;
  activeBets: number;
  totalBets: number;
  highRiskBets: number;
  gameType: string;
  gameTypeFormatted: string;
}

interface DetailedRiskData {
  userExposure: { [userId: number]: number };
  marketExposure: { [marketId: number]: number };
  gameData: any[];
}

interface RiskManagementData {
  summaries: RiskSummary[];
  detailedData: DetailedRiskData;
  message?: string;
}

// Interface for user info to display names instead of IDs
interface UserInfo {
  [userId: string]: { username: string };
}

// Interface for market info to display names instead of IDs
interface MarketInfo {
  [marketId: string]: { name: string; type: string };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-1/4" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-6">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    </div>
  );
}

export default function RiskManagementPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const [activeTab, setActiveTab] = useState('market-game');
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [marketInfo, setMarketInfo] = useState<MarketInfo>({});
  // Add state for bet type filtering
  const [betTypeFilter, setBetTypeFilter] = useState<string>('all');

  // Get the appropriate API endpoint based on user role
  const endpoint = isAdmin ? '/api/risk/admin' : '/api/risk/subadmin';

  // Fetch risk management data
  const { data, isLoading, error } = useQuery<RiskManagementData>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await apiRequest('GET', endpoint);
      const data = await response.json();
      return data as RiskManagementData;
    },
    refetchInterval: 60000 // Refetch every minute to keep data fresh
  });
  
  // Fetch user names
  useEffect(() => {
    if (data?.detailedData?.userExposure) {
      const userIds = Object.keys(data.detailedData.userExposure);
      if (userIds.length > 0) {
        // Mock user data until API endpoint is implemented
        const mockUserInfo: UserInfo = {};
        userIds.forEach((id) => {
          mockUserInfo[id] = { username: `Player ${id}` };
        });
        setUserInfo(mockUserInfo);
      }
    }
  }, [data]);
  
  // Fetch market names
  useEffect(() => {
    if (data?.detailedData?.marketExposure) {
      const marketIds = Object.keys(data.detailedData.marketExposure);
      if (marketIds.length > 0) {
        // Mock market data until API endpoint is implemented
        const mockMarketInfo: MarketInfo = {};
        marketIds.forEach((id) => {
          mockMarketInfo[id] = { 
            name: `Market ${id}`,
            type: 'dishawar'
          };
        });
        setMarketInfo(mockMarketInfo);
      }
    }
  }, [data]);

  function getTotalExposure(summaries: RiskSummary[]): number {
    return summaries.reduce((total, summary) => total + summary.exposureAmount, 0);
  }
  
  function getTotalActiveBets(summaries: RiskSummary[]): number {
    return summaries.reduce((total, summary) => total + summary.activeBets, 0);
  }
  
  function getTotalPotentialProfit(summaries: RiskSummary[]): number {
    return summaries.reduce((total, summary) => total + summary.potentialProfit, 0);
  }
  
  function getTotalHighRiskBets(summaries: RiskSummary[]): number {
    return summaries.reduce((total, summary) => total + summary.highRiskBets, 0);
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Jantri Management" activeTab="risk-management">
        <div className="p-6">
          <LoadingSkeleton />
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Jantri Management" activeTab="risk-management">
        <div className="p-6">
          <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <CardHeader>
              <CardTitle className="text-red-700 dark:text-red-300 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2" />
                Error Loading Jantri Management Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>There was a problem loading the jantri management data. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  if (!data || !data.summaries || data.summaries.length === 0) {
    return (
      <DashboardLayout title="Jantri Management" activeTab="risk-management">
        <div className="p-6">
          <Card>
            <CardHeader>
              <CardTitle>Jantri Management</CardTitle>
              <CardDescription>No game data available</CardDescription>
            </CardHeader>
            <CardContent>
              <p>There's currently no data to display. This may be because there are no active games or bets in the system.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // Find data for specific game types
  const marketGameData = data.summaries.find(summary => summary.gameType === 'satamatka');
  const cricketTossData = data.summaries.find(summary => summary.gameType === 'cricket_toss');

  return (
    <DashboardLayout title="Jantri Management" activeTab="risk-management">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              {isAdmin ? 'Platform-wide Jantri Analysis' : 'Jantri Analysis for Your Players'}
            </h2>
            <p className="text-muted-foreground">
              Monitor and manage Satamatka numbers with comprehensive betting data
            </p>
          </div>
        </div>

        <Separator />

        {/* Risk Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{getTotalExposure(data.summaries).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Maximum potential liability
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Bets</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalActiveBets(data.summaries)}</div>
              <p className="text-xs text-muted-foreground">
                Total ongoing bets
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{getTotalPotentialProfit(data.summaries).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Expected house edge
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Risk Bets</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getTotalHighRiskBets(data.summaries)}</div>
              <p className="text-xs text-muted-foreground">
                Bets over ₹1000
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Analysis Tabs */}
        <Tabs defaultValue="market-game" className="w-full" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="market-game">Market Game Risk</TabsTrigger>
            <TabsTrigger value="cricket-toss">Cricket Toss Risk</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market-game" className="mt-0">
            {marketGameData && (
              <GameTypeRiskPanel 
                data={marketGameData} 
                detailedData={data.detailedData}
                gameType="satamatka"
                userInfo={userInfo}
                marketInfo={marketInfo}
              />
            )}
          </TabsContent>
          
          <TabsContent value="cricket-toss" className="mt-0">
            {cricketTossData && (
              <GameTypeRiskPanel 
                data={cricketTossData} 
                detailedData={data.detailedData}
                gameType="cricket_toss"
                userInfo={userInfo}
                marketInfo={marketInfo}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

interface RiskPanelProps {
  data: RiskSummary;
  detailedData: DetailedRiskData;
  gameType: string;
  userInfo: UserInfo;
  marketInfo: MarketInfo;
}

function GameTypeRiskPanel({ data, detailedData, gameType, userInfo, marketInfo }: RiskPanelProps) {
  // Filter game data by type
  const gameData = detailedData.gameData.filter(game => game.gameType === gameType);
  
  // Calculate current risk level (0-100)
  const riskPercentage = calculateRiskLevel(data);
  
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bet Amount</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.totalBetAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Liability</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.potentialLiability.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maximum Exposure</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{data.exposureAmount.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
            <Activity className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getRiskLevelText(riskPercentage)}</div>
            <Progress className="mt-2" value={riskPercentage} />
          </CardContent>
        </Card>
      </div>
      
      {/* Market Exposure Section - only for Satamatka */}
      {gameType === 'satamatka' && Object.keys(detailedData.marketExposure).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Market Exposure</CardTitle>
            <CardDescription>Exposure amount by market</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Market</TableHead>
                    <TableHead>Exposure Amount</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(detailedData.marketExposure).map(([marketId, amount]) => (
                    <TableRow key={marketId}>
                      <TableCell>
                        {marketInfo[marketId] ? marketInfo[marketId].name : `Market ${marketId}`}
                      </TableCell>
                      <TableCell>₹{amount.toFixed(2)}</TableCell>
                      <TableCell>
                        <RiskBadge amount={amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {/* User Exposure Section */}
      {Object.keys(detailedData.userExposure).length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>User Exposure</CardTitle>
            <CardDescription>Exposure amount by user</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Exposure Amount</TableHead>
                    <TableHead>Risk Level</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(detailedData.userExposure)
                    .sort((a, b) => Number(b[1]) - Number(a[1])) // Sort by exposure amount descending
                    .map(([userId, amount]) => {
                      // Only include users with bets of this game type
                      const userGames = gameData.filter(game => game.userId === Number(userId));
                      if (userGames.length === 0) return null;
                      
                      return (
                        <TableRow key={userId}>
                          <TableCell>
                            {userInfo[userId] ? userInfo[userId].username : `User ${userId}`}
                          </TableCell>
                          <TableCell>₹{amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <RiskBadge amount={amount} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
      
      {/* Recent Bets Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Active Bets</CardTitle>
          <CardDescription>Most recent unresolved bets</CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Bet Amount</TableHead>
                  <TableHead>Potential Payout</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameData
                  .filter(game => !game.result) // Only active bets
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // Sort by date
                  .slice(0, 10) // Only show top 10
                  .map(game => (
                    <TableRow key={game.id}>
                      <TableCell>
                        {userInfo[game.userId] ? userInfo[game.userId].username : `User ${game.userId}`}
                      </TableCell>
                      <TableCell>₹{game.betAmount.toFixed(2)}</TableCell>
                      <TableCell>₹{(game.betAmount * 0.9).toFixed(2)}</TableCell>
                      <TableCell>{formatDate(game.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                {gameData.filter(game => !game.result).length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-4">No active bets found</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function RiskBadge({ amount }: { amount: number }) {
  if (amount > 5000) {
    return <Badge className="bg-red-500">High</Badge>;
  } else if (amount > 1000) {
    return <Badge className="bg-orange-500">Medium</Badge>;
  } else {
    return <Badge className="bg-green-500">Low</Badge>;
  }
}

function formatDate(dateString: string | null) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function calculateRiskLevel(data: RiskSummary): number {
  // Calculate a risk level based on various factors
  const exposureRatio = data.exposureAmount / Math.max(data.totalBetAmount, 1);
  const highRiskRatio = data.highRiskBets / Math.max(data.activeBets, 1);
  
  // Combine factors to get a risk percentage (0-100)
  let riskScore = exposureRatio * 50 + highRiskRatio * 50;
  
  // Cap at 100%
  return Math.min(Math.max(riskScore, 0), 100);
}

function getRiskLevelText(riskPercentage: number): string {
  if (riskPercentage > 75) {
    return 'Critical';
  } else if (riskPercentage > 50) {
    return 'High';
  } else if (riskPercentage > 25) {
    return 'Medium';
  } else {
    return 'Low';
  }
}