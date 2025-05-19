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
  userInfo: { [userId: string]: { username: string } };
  marketInfo: { [marketId: string]: { name: string; type: string } };
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
  
  // Use real user names from the API
  useEffect(() => {
    if (data?.userInfo) {
      setUserInfo(data.userInfo);
    }
  }, [data]);
  
  // Use real market names from the API
  useEffect(() => {
    if (data?.marketInfo) {
      setMarketInfo(data.marketInfo);
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
        <Tabs defaultValue="market-game" className="w-full mt-6" onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="market-game">Satamatka Analysis</TabsTrigger>
            <TabsTrigger value="cricket-toss">Cricket Toss Risk</TabsTrigger>
          </TabsList>
          
          <TabsContent value="market-game" className="mt-0">
            
            {marketGameData && (
              <>
                {/* Stats Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bet Amount</CardTitle>
                      <Target className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(marketGameData.totalBetAmount/100).toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Potential Liability</CardTitle>
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(marketGameData.potentialLiability / 100).toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Maximum Exposure</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(marketGameData.exposureAmount / 100).toFixed(2)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
                      <Activity className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{getRiskLevelText(calculateRiskLevel(marketGameData))}</div>
                      <Progress className="mt-2" value={calculateRiskLevel(marketGameData)} />
                    </CardContent>
                  </Card>
                </div>
                
                {/* Grid view showing all numbers from 00-99 */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Satamatka Numbers (00-99)</CardTitle>
                    <CardDescription>Comprehensive view of all numbers with active bets</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex items-center">
                      <div className="mr-8 flex items-center space-x-2">
                        <span className="font-semibold">Filter:</span>
                        <Badge 
                          className={`cursor-pointer px-3 py-1 ${betTypeFilter === 'all' ? 'bg-primary' : 'bg-slate-700'}`}
                          onClick={() => setBetTypeFilter('all')}
                        >
                          All Types
                        </Badge>
                        <Badge 
                          className={`cursor-pointer px-3 py-1 ${betTypeFilter === 'jodi' ? 'bg-primary' : 'bg-slate-700'}`}
                          onClick={() => setBetTypeFilter('jodi')}
                        >
                          Jodi
                        </Badge>
                        <Badge 
                          className={`cursor-pointer px-3 py-1 ${betTypeFilter === 'harf' ? 'bg-primary' : 'bg-slate-700'}`}
                          onClick={() => setBetTypeFilter('harf')}
                        >
                          Harf
                        </Badge>
                        <Badge 
                          className={`cursor-pointer px-3 py-1 ${betTypeFilter === 'crossing' ? 'bg-primary' : 'bg-slate-700'}`}
                          onClick={() => setBetTypeFilter('crossing')}
                        >
                          Crossing
                        </Badge>
                        <Badge 
                          className={`cursor-pointer px-3 py-1 ${betTypeFilter === 'oddeven' ? 'bg-primary' : 'bg-slate-700'}`}
                          onClick={() => setBetTypeFilter('oddeven')}
                        >
                          Odd/Even
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-xs">High Risk</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="text-xs">Medium Risk</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="text-xs">Low Risk</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-slate-500"></span>
                          <span className="text-xs">No Bets</span>
                        </div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-[80px]">Number</TableHead>
                            <TableHead className="w-[100px]">Active Bets</TableHead>
                            <TableHead className="w-[150px]">Bet Amount</TableHead>
                            <TableHead className="w-[150px]">Potential Win</TableHead>
                            <TableHead>Bet Types</TableHead>
                            <TableHead className="w-[120px]">Market</TableHead>
                            <TableHead className="w-[100px]">Risk Level</TableHead>
                            <TableHead className="w-[200px]">Player Details</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Array.from({ length: 100 }, (_, i) => {
                            // Format number as two digits (e.g., 00, 01, ..., 99)
                            const num = i.toString().padStart(2, '0');
                            
                            // Get all games for this number filtered by the selected bet type
                            const gamesForNumber = data.detailedData.gameData.filter(game => {
                              // Check if this is a Satamatka game
                              if (game.gameType !== 'satamatka') return false;
                              
                              // Only include active bets (result is null or pending)
                              if (game.result && game.result !== 'pending') return false;
                              
                              // Check if the bet type matches our filter (if specific filter selected)
                              if (betTypeFilter !== 'all' && betTypeFilter !== game.prediction) return false;
                              
                              // Check if the number matches the prediction directly
                              // This handles number predictions like "01", "02", etc.
                              if (game.prediction === num) return true;
                              
                              // Look for pattern where prediction is a type and value is stored elsewhere
                              const specialBetTypes = ['jodi', 'harf', 'crossing', 'oddeven'];
                              if (specialBetTypes.includes(game.prediction)) {
                                // Check in game value - commonly used structure
                                if (game.value === num) return true;
                                
                                // Check in gameData object variations
                                if (game.gameData?.number === num) return true;
                                if (game.gameData?.selectedNumber === num) return true;
                              }
                              
                              // Check special patterns like 'L1' or 'R2' (left/right digit bets)
                              if (game.prediction?.startsWith('L') && num.endsWith(game.prediction.slice(1))) return true;
                              if (game.prediction?.startsWith('R') && num.startsWith(game.prediction.slice(1))) return true;
                              
                              // Log game data for debugging
                              console.log('Game data for debugging:', game);
                              
                              return false;
                            });
                            
                            // Calculate total bet amount for this number
                            const totalBetAmount = gamesForNumber.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                            
                            // Calculate potential win amount (using 90x for jodi, 9x for others as a simplified calculation)
                            const potentialWin = gamesForNumber.reduce((sum, game) => {
                              // Use the proper multipliers divided by 100 to match platform rules
                              let multiplier = 0.9; // Default
                              
                              // Check different game predictions and apply the appropriate multiplier
                              if (game.prediction === 'jodi') multiplier = 0.9; // 90/100
                              else if (game.prediction === 'harf' || game.prediction === 'crossing') multiplier = 0.09; // 9/100
                              else if (game.prediction === 'oddeven') multiplier = 0.019; // 1.9/100
                              
                              return sum + ((game.betAmount || 0) * multiplier);
                            }, 0);
                            
                            // Get markets for this number
                            const marketSet = new Set();
                            gamesForNumber.forEach(game => {
                              if (game.marketId) {
                                marketSet.add(marketInfo[game.marketId]?.name || `Market ${game.marketId}`);
                              }
                            });
                            const markets = Array.from(marketSet);
                            
                            // Define the risk level based on bet amount
                            let riskLevel = 'none';
                            if (totalBetAmount > 1000) riskLevel = 'high';
                            else if (totalBetAmount > 500) riskLevel = 'medium';
                            else if (totalBetAmount > 0) riskLevel = 'low';
                            
                            // Get bet types for this number
                            const betTypeSet = new Set();
                            gamesForNumber.forEach(game => {
                              if (game.prediction) {
                                betTypeSet.add(game.prediction);
                              }
                            });
                            const betTypes = Array.from(betTypeSet);
                            
                            return (
                              <TableRow 
                                key={num}
                                className={
                                  riskLevel === 'high' 
                                    ? 'bg-red-500/10'
                                    : riskLevel === 'medium'
                                      ? 'bg-orange-500/10'
                                      : riskLevel === 'low'
                                        ? 'bg-blue-500/10'
                                        : ''
                                }
                              >
                                <TableCell className="font-bold text-center">{num}</TableCell>
                                <TableCell>{gamesForNumber.length}</TableCell>
                                <TableCell>
                                  {totalBetAmount > 0 
                                    ? `₹${totalBetAmount.toFixed(2)}` 
                                    : <span className="text-muted-foreground">No bets</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {potentialWin > 0 
                                    ? `₹${potentialWin.toFixed(2)}` 
                                    : <span className="text-muted-foreground">-</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {betTypes.length > 0 
                                    ? betTypes.map((type, idx) => (
                                        <Badge key={idx} className="mr-1 mb-1 bg-slate-700">
                                          {type}
                                        </Badge>
                                      ))
                                    : <span className="text-muted-foreground">-</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {markets.length > 0 
                                    ? markets.join(', ') 
                                    : <span className="text-muted-foreground">-</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {totalBetAmount > 0 ? (
                                    <Badge
                                      className={
                                        riskLevel === 'high'
                                          ? 'bg-red-500'
                                          : riskLevel === 'medium'
                                            ? 'bg-orange-500'
                                            : 'bg-blue-500'
                                      }
                                    >
                                      {riskLevel === 'high' ? 'High' : riskLevel === 'medium' ? 'Medium' : 'Low'}
                                    </Badge>
                                  ) : (
                                    <span className="text-muted-foreground">None</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="max-h-[150px] overflow-y-auto pr-2">
                                    {gamesForNumber.map((game, idx) => {
                                      const userId = game.userId;
                                      const username = userInfo[userId]?.username || `User ${userId}`;
                                      
                                      // Calculate potential win based on game type
                                      let multiplier = 0.9; // Default for jodi
                                      if (game.prediction === 'harf' || game.prediction === 'crossing') multiplier = 0.09;
                                      else if (game.prediction === 'oddeven') multiplier = 0.019;
                                      
                                      const potentialWin = (game.betAmount || 0) * multiplier;
                                      
                                      return (
                                        <div key={idx} className="mb-2 p-2 border border-slate-700 rounded-md bg-slate-800/50">
                                          <div className="font-medium text-amber-400">{username}</div>
                                          <div className="grid grid-cols-2 gap-1 text-xs">
                                            <div className="text-slate-300">Bet: ₹{((game.betAmount || 0)/100).toFixed(2)}</div>
                                            <div className="text-green-400">Win: ₹{potentialWin.toFixed(2)}</div>
                                            <div className="text-slate-400">{game.prediction || 'unknown'}</div>
                                            <div className="text-slate-400">
                                              {game.marketId ? 
                                                (marketInfo[game.marketId]?.name || `Market ${game.marketId}`) : 
                                                'Unknown Market'}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {gamesForNumber.length === 0 && (
                                      <span className="text-muted-foreground">No player data</span>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Number-specific analysis when a filtered bet type is selected */}
                {betTypeFilter !== 'all' && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Jantri Number Analysis - {betTypeFilter.charAt(0).toUpperCase() + betTypeFilter.slice(1)} Bets</CardTitle>
                      <CardDescription>Comprehensive data for current {betTypeFilter} bets</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Number</TableHead>
                              <TableHead>Bet Amount</TableHead>
                              <TableHead>Potential Win</TableHead>
                              <TableHead>Risk Level</TableHead>
                              <TableHead>Market</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.detailedData.gameData
                              .filter(game => 
                                game.gameType === 'satamatka' && 
                                !game.result && 
                                game.prediction === betTypeFilter
                              )
                              .map((game, idx) => (
                                <TableRow key={game.id || idx}>
                                  <TableCell>{game.gameData?.number || 'Unknown'}</TableCell>
                                  <TableCell>₹{game.betAmount?.toFixed(2) || 0}</TableCell>
                                  <TableCell>₹{((game.betAmount || 0) * 0.9).toFixed(2)}</TableCell>
                                  <TableCell><RiskBadge amount={game.betAmount || 0} /></TableCell>
                                  <TableCell>
                                    {game.marketId ? (marketInfo[game.marketId]?.name || `Market ${game.marketId}`) : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {data.detailedData.gameData.filter(game => 
                              game.gameType === 'satamatka' && 
                              !game.result && 
                              game.prediction === betTypeFilter
                            ).length === 0 && (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center py-4">No active {betTypeFilter} bets found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
                
                <GameTypeRiskPanel 
                  data={marketGameData} 
                  detailedData={data.detailedData}
                  gameType="satamatka"
                  userInfo={userInfo}
                  marketInfo={marketInfo}
                  betTypeFilter={betTypeFilter}
                />
              </>
            )}
          </TabsContent>
          
          <TabsContent value="cricket-toss" className="mt-0">
            {cricketTossData ? (
              <>
                {/* Cricket Risk Overview Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Cricket Bets</CardTitle>
                      <Activity className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cricketTossData.activeBets}</div>
                      <p className="text-xs text-muted-foreground">
                        Active cricket toss bets
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Bet Amount</CardTitle>
                      <Target className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{cricketTossData.totalBetAmount.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Total cricket toss wagers
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Potential Liability</CardTitle>
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{cricketTossData.potentialLiability.toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Maximum potential payout
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">High Risk Bets</CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{cricketTossData.highRiskBets}</div>
                      <p className="text-xs text-muted-foreground">
                        Bets over ₹1000
                      </p>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Cricket Match Risk Analysis */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Cricket Toss Risk - Match Analysis</CardTitle>
                    <CardDescription>Detailed risk assessment for each cricket match</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Match</TableHead>
                            <TableHead>Team A</TableHead>
                            <TableHead>Team A Bets</TableHead>
                            <TableHead>Team B</TableHead>
                            <TableHead>Team B Bets</TableHead>
                            <TableHead>Total Amount</TableHead>
                            <TableHead>Potential Win</TableHead>
                            <TableHead>Risk Level</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Get cricket toss games
                            const cricketGames = data.detailedData.gameData.filter(game => 
                              game.gameType === 'cricket_toss' && !game.result
                            );
                            
                            // Group games by match id
                            const matchGroups: Record<string, any[]> = cricketGames.reduce((acc: Record<string, any[]>, game: any) => {
                              const matchId = game.matchId;
                              if (!acc[matchId]) {
                                acc[matchId] = [];
                              }
                              acc[matchId].push(game);
                              return acc;
                            }, {});
                            
                            // If no matches, show a message
                            if (Object.keys(matchGroups).length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={8} className="text-center py-4">
                                    No active cricket toss bets found
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            
                            // For each match, calculate team bets
                            return Object.entries(matchGroups).map(([matchId, games]) => {
                              // Get match data (mocked)
                              const matchName = `Match ${matchId}`;
                              const teamA = "Team A";
                              const teamB = "Team B";
                              
                              // Calculate team bets
                              const teamABets = games.filter(game => game.prediction === 'team_a');
                              const teamBBets = games.filter(game => game.prediction === 'team_b');
                              
                              // Calculate bet amounts
                              const teamAAmount = teamABets.reduce((sum: number, game: any) => sum + (game.betAmount || 0), 0);
                              const teamBAmount = teamBBets.reduce((sum: number, game: any) => sum + (game.betAmount || 0), 0);
                              const totalAmount = teamAAmount + teamBAmount;
                              
                              // Calculate potential win (using 1.9x multiplier)
                              const potentialWin = Math.max(teamAAmount, teamBAmount) * 0.9;
                              
                              // Determine risk level
                              const riskLevel = 
                                totalAmount > 5000 ? 'high' : 
                                totalAmount > 1000 ? 'medium' : 
                                'low';
                              
                              return (
                                <TableRow key={matchId}>
                                  <TableCell>{matchName}</TableCell>
                                  <TableCell>{teamA}</TableCell>
                                  <TableCell>
                                    <div>Count: {teamABets.length}</div>
                                    <div className="text-green-400">₹{teamAAmount.toFixed(2)}</div>
                                  </TableCell>
                                  <TableCell>{teamB}</TableCell>
                                  <TableCell>
                                    <div>Count: {teamBBets.length}</div>
                                    <div className="text-green-400">₹{teamBAmount.toFixed(2)}</div>
                                  </TableCell>
                                  <TableCell className="text-green-400">₹{totalAmount.toFixed(2)}</TableCell>
                                  <TableCell className="text-amber-400">₹{potentialWin.toFixed(2)}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      className={
                                        riskLevel === 'high' ? 'bg-red-500' : 
                                        riskLevel === 'medium' ? 'bg-orange-500' : 
                                        'bg-blue-500'
                                      }
                                    >
                                      {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Cricket Toss User Details */}
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Cricket Toss User Bets</CardTitle>
                    <CardDescription>Active bets per user on cricket toss games</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[350px]">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Match</TableHead>
                            <TableHead>Team Selection</TableHead>
                            <TableHead>Bet Amount</TableHead>
                            <TableHead>Potential Win</TableHead>
                            <TableHead>Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(() => {
                            // Get cricket toss games
                            const cricketGames = data.detailedData.gameData.filter(game => 
                              game.gameType === 'cricket_toss' && !game.result
                            );
                            
                            // If no games, show message
                            if (cricketGames.length === 0) {
                              return (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-4">
                                    No active cricket toss bets found
                                  </TableCell>
                                </TableRow>
                              );
                            }
                            
                            // Sort by date
                            const sortedGames = [...cricketGames].sort(
                              (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                            );
                            
                            // Map games to rows
                            return sortedGames.map((game, idx) => {
                              const user = userInfo[game.userId] ? userInfo[game.userId].username : `User ${game.userId}`;
                              const matchName = `Match ${game.matchId}`;
                              const teamSelection = game.prediction === 'team_a' ? 'Team A' : 'Team B';
                              const potentialWin = (game.betAmount || 0) * 0.9;
                              
                              return (
                                <TableRow key={game.id || idx}>
                                  <TableCell>{user}</TableCell>
                                  <TableCell>{matchName}</TableCell>
                                  <TableCell>{teamSelection}</TableCell>
                                  <TableCell className="text-green-400">₹{(game.betAmount || 0).toFixed(2)}</TableCell>
                                  <TableCell className="text-amber-400">₹{potentialWin.toFixed(2)}</TableCell>
                                  <TableCell>{formatDate(game.createdAt)}</TableCell>
                                </TableRow>
                              );
                            });
                          })()}
                        </TableBody>
                      </Table>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Cricket Toss Risk Analysis</CardTitle>
                  <CardDescription>No cricket toss games available</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>There are currently no active cricket toss games in the system.</p>
                </CardContent>
              </Card>
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
  betTypeFilter?: string;
}

function GameTypeRiskPanel({ data, detailedData, gameType, userInfo, marketInfo, betTypeFilter = 'all' }: RiskPanelProps) {
  // Filter game data by type and bet type if filter is active
  const gameData = detailedData.gameData.filter(game => 
    game.gameType === gameType && 
    (betTypeFilter === 'all' || game.prediction === betTypeFilter)
  );
  
  // Calculate current risk level (0-100)
  const riskPercentage = calculateRiskLevel(data);
  
  return (
    <div className="space-y-4">
      
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
                      <TableCell>₹{(game.betAmount * 0.009).toFixed(2)}</TableCell>
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