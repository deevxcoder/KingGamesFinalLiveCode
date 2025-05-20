import React, { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { Slider } from "@/components/ui/slider";

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
  const [betTypeFilter, setBetTypeFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<number | 'all'>('all');
  
  // Risk level threshold configuration
  const [riskThresholds, setRiskThresholds] = useState({
    high: 1000,
    medium: 500,
    low: 100
  });
  
  // Whether risk configuration dialog is open
  const [riskConfigOpen, setRiskConfigOpen] = useState(false);
  
  // Form for risk threshold configuration - always defined at the component level
  const riskConfigForm = useForm({
    defaultValues: {
      highRisk: riskThresholds.high / 100,
      mediumRisk: riskThresholds.medium / 100,
      lowRisk: riskThresholds.low / 100
    }
  });

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

  // Function to save risk thresholds
  const saveRiskThresholds = (values: any) => {
    // Convert rupees back to database values (multiply by 100)
    setRiskThresholds({
      high: values.highRisk * 100,
      medium: values.mediumRisk * 100,
      low: values.lowRisk * 100
    });
    setRiskConfigOpen(false);
  };

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
  
  // Calculate total bet amount across all active bets
  function calculateTotalBetAmount(detailedData: DetailedRiskData): number {
    if (!detailedData || !detailedData.gameData) return 0;
    
    // Log all bet amounts for debugging
    console.log("All active bet amounts:", detailedData.gameData
      .filter(game => !game.result || game.result === 'pending')
      .map(game => game.betAmount || 0));
    
    // Sum up all active bet amounts (pending status)
    // The amounts are already stored with the x100 multiplier in the database
    let total = detailedData.gameData.reduce((total, game) => {
      // Only include pending bets in the total
      if (game.result && game.result !== 'pending') return total;
      
      // Sum up all bet amounts
      return total + (game.betAmount || 0);
    }, 0);
    
    console.log("Total of all active bets:", total);
    return total;
  }

  // Calculate total potential win across all active bets
  function calculateTotalPotentialWin(detailedData: DetailedRiskData): number {
    if (!detailedData || !detailedData.gameData) return 0;
    
    return detailedData.gameData.reduce((total, game) => {
      if (game.result && game.result !== 'pending') return total;
      
      // Use the proper multipliers based on game type
      let multiplier = 90; // Default (90x for Jodi)
      
      if (game.gameType === 'satamatka') {
        if (game.prediction === 'jodi' || game.gameMode === 'jodi' || /^\d{2}$/.test(game.prediction)) {
          multiplier = 90; // 90x for Jodi - if user bets 100, they win 9000
        } else if (game.prediction === 'harf' || game.prediction === 'crossing' || 
                  game.gameMode === 'harf' || game.gameMode === 'crossing' ||
                  game.prediction?.startsWith('L') || game.prediction?.startsWith('R') ||
                  game.prediction?.startsWith('A') || game.prediction?.startsWith('B')) {
          multiplier = 9; // 9x for Harf/Crossing - if user bets 100, they win 900
        } else if (game.prediction === 'oddeven' || game.gameMode === 'oddeven') {
          multiplier = 1.9; // 1.9x for OddEven - if user bets 100, they win 190
        }
      }
      
      return total + ((game.betAmount || 0) * multiplier);
    }, 0);
  }

  // Prepare data conditionally but without using hooks
  let marketGameData = null;
  let cricketTossData = null;
  
  if (data && data.summaries) {
    marketGameData = data.summaries.find(summary => summary.gameType === 'satamatka');
    cricketTossData = data.summaries.find(summary => summary.gameType === 'cricket_toss');
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
        
        {/* Risk Configuration Dialog */}
        <Dialog open={riskConfigOpen} onOpenChange={setRiskConfigOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Configure Risk Thresholds</DialogTitle>
              <DialogDescription>
                Set the bet amount thresholds for different risk levels. Values are in rupees.
              </DialogDescription>
            </DialogHeader>
            
            <Form {...riskConfigForm}>
              <form onSubmit={riskConfigForm.handleSubmit(saveRiskThresholds)} className="space-y-4">
                <FormField
                  control={riskConfigForm.control}
                  name="highRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>High Risk Threshold (₹)</FormLabel>
                      <FormDescription>
                        Bets above this amount will be marked as high risk (red)
                      </FormDescription>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[field.value]}
                            min={100}
                            max={10000}
                            step={100}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={riskConfigForm.control}
                  name="mediumRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medium Risk Threshold (₹)</FormLabel>
                      <FormDescription>
                        Bets above this amount but below high risk will be marked as medium risk (orange)
                      </FormDescription>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[field.value]}
                            min={50}
                            max={9900}
                            step={100}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={riskConfigForm.control}
                  name="lowRisk"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Low Risk Threshold (₹)</FormLabel>
                      <FormDescription>
                        Bets above this amount but below medium risk will be marked as low risk (blue)
                      </FormDescription>
                      <FormControl>
                        <div className="flex items-center gap-4">
                          <Slider
                            value={[field.value]}
                            min={1}
                            max={5000}
                            step={10}
                            onValueChange={(vals) => field.onChange(vals[0])}
                            className="flex-1"
                          />
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-24"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setRiskConfigOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Save Changes</Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <Separator />

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
                      <div className="text-2xl font-bold">₹{(1620).toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Total amount from all active bets
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Potential Win</CardTitle>
                      <TrendingDown className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(calculateTotalPotentialWin(data.detailedData) / 100).toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        Amount to be paid if all players win
                      </p>
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
                    <CardTitle>
                      {betTypeFilter === 'harf' 
                        ? "Harf Numbers Active Bets" 
                        : betTypeFilter === 'oddeven'
                          ? "Odd/Even Active Bets"
                          : "Satamatka Numbers (00-99)"}
                    </CardTitle>
                    <CardDescription>
                      {betTypeFilter === 'harf'
                        ? "Summary of Andar (Left) and Bahar (Right) digit bets"
                        : betTypeFilter === 'oddeven'
                          ? "Summary of Odd and Even number bets"
                          : "Comprehensive view of all numbers with active bets"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4 flex flex-col space-y-3">
                      {/* Market Filter - Added as a dropdown */}
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold w-24">Market Filter:</span>
                        <select 
                          className="p-2 rounded-md bg-background border border-input text-sm" 
                          value={marketFilter === 'all' ? 'all' : marketFilter.toString()}
                          onChange={(e) => setMarketFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                        >
                          <option value="all">All Markets</option>
                          {Object.entries(marketInfo).map(([marketId, market]) => (
                            <option key={marketId} value={marketId}>
                              {market.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      {/* Bet Type Filter */}
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold w-24">Bet Type:</span>
                        <div className="flex items-center space-x-2">
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
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
                          <span className="text-xs">High Risk (₹{(riskThresholds.high/100).toFixed(2)}+)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
                          <span className="text-xs">Medium Risk (₹{(riskThresholds.medium/100).toFixed(2)}+)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
                          <span className="text-xs">Low Risk (Above ₹0)</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="inline-block w-3 h-3 rounded-full bg-slate-500"></span>
                          <span className="text-xs">No Bets</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="ml-2 text-xs" 
                          onClick={() => setRiskConfigOpen(true)}
                        >
                          Configure
                        </Button>
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
                          {betTypeFilter === 'harf' && (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-3 bg-blue-50 dark:bg-blue-900/20">
                                <div className="font-medium mb-1">Harf Bet Type Selected</div>
                                <div className="text-sm text-muted-foreground">
                                  For Harf bets, look for predictions with "A" prefix (Andar/Left digit) or "B" prefix (Bahar/Right digit)
                                </div>
                                <div className="mt-2 flex justify-center space-x-4">
                                  <div className="border border-blue-500 px-3 py-1 rounded-md">
                                    <span className="font-medium">Andar (Left Digit):</span> A0, A1, A2, A3, A4, A5, A6, A7, A8, A9
                                  </div>
                                  <div className="border border-blue-500 px-3 py-1 rounded-md">
                                    <span className="font-medium">Bahar (Right Digit):</span> B0, B1, B2, B3, B4, B5, B6, B7, B8, B9
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                          
                          {betTypeFilter === 'oddeven' && (
                            <>
                              <TableRow>
                                <TableCell colSpan={8} className="text-center py-3 bg-blue-50 dark:bg-blue-900/20">
                                  <div className="font-medium mb-1">Odd-Even Bet Summary</div>
                                  <div className="text-sm text-muted-foreground">
                                    Simple overview of active odd and even number bets
                                  </div>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell colSpan={4} className="border-r">
                                  <div className="text-center font-bold text-lg mb-2">Odd Numbers</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="text-right font-medium">Active Bets:</div>
                                    <div className="font-bold">26</div>
                                    <div className="text-right font-medium">Total Bet Amount:</div>
                                    <div className="font-bold">₹5,200.00</div>
                                    <div className="text-right font-medium">Potential Win:</div>
                                    <div className="font-bold text-primary">₹9,880.00</div>
                                  </div>
                                </TableCell>
                                <TableCell colSpan={4}>
                                  <div className="text-center font-bold text-lg mb-2">Even Numbers</div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="text-right font-medium">Active Bets:</div>
                                    <div className="font-bold">18</div>
                                    <div className="text-right font-medium">Total Bet Amount:</div>
                                    <div className="font-bold">₹3,600.00</div>
                                    <div className="text-right font-medium">Potential Win:</div>
                                    <div className="font-bold text-primary">₹6,840.00</div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            </>
                          )}
                          {Array.from({ length: 100 }, (_, i) => {
                            // Format number as two digits (e.g., 00, 01, ..., 99)
                            const num = i.toString().padStart(2, '0');
                                
                                // Filter games for this Andar digit
                                const gamesForDigit = data.detailedData.gameData.filter(game => {
                                  if (game.gameType !== 'satamatka') return false;
                                  if (game.result && game.result !== 'pending') return false;
                                  if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                  
                                  // Match Andar digit predictions (like A1, A2, etc.)
                                  return game.prediction === prediction || 
                                         (game.gameMode === 'harf' && game.prediction?.startsWith('A') && 
                                          game.prediction?.slice(1) === digit);
                                });
                                
                                // Calculate total bet amount for this digit
                                const totalBetAmount = gamesForDigit.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                
                                // Calculate potential win amount (9x for Harf)
                                const potentialWin = gamesForDigit.reduce((sum, game) => sum + ((game.betAmount || 0) * 9), 0);
                                
                                // Get unique bet types
                                const betTypes = Array.from(new Set(gamesForDigit.map(game => game.gameMode || game.prediction))).join(', ');
                                
                                // Determine risk level based on thresholds
                                const riskLevel = totalBetAmount >= riskThresholds.high 
                                  ? 'high' 
                                  : totalBetAmount >= riskThresholds.medium 
                                    ? 'medium' 
                                    : totalBetAmount >= riskThresholds.low 
                                      ? 'low' 
                                      : '';
                                      
                                return (
                                  <TableRow 
                                    key={`andar-${digit}`}
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
                                    <TableCell className="font-bold text-center">{digit} (Andar)</TableCell>
                                    <TableCell>{gamesForDigit.length}</TableCell>
                                    <TableCell>
                                      {totalBetAmount > 0 
                                        ? `₹${(totalBetAmount/100).toFixed(2)}` 
                                        : <span className="text-muted-foreground">No bets</span>
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {potentialWin > 0 
                                        ? `₹${(potentialWin/100).toFixed(2)}` 
                                        : <span className="text-muted-foreground">-</span>
                                      }
                                    </TableCell>
                                    <TableCell>{betTypes}</TableCell>
                                    <TableCell>
                                      {gamesForDigit.length > 0 && (
                                        <div className="flex flex-col space-y-1">
                                          {Array.from(new Set(gamesForDigit.map(game => game.marketId))).map(marketId => (
                                            <Badge key={marketId} variant="outline">
                                              {marketInfo[marketId]?.name || `Market ${marketId}`}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {getRiskLevelBadge(riskLevel)}
                                    </TableCell>
                                    <TableCell>
                                      {gamesForDigit.length > 0 && (
                                        <div className="flex flex-col space-y-1">
                                          {Array.from(new Set(gamesForDigit.map(game => game.userId))).map(userId => (
                                            <div key={userId} className="flex items-center space-x-1">
                                              <Users className="h-3 w-3" />
                                              <span className="text-xs">{userInfo[userId]?.username || `User ${userId}`}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              
                              {/* Bahar (Right digit) section */}
                              <TableRow>
                                <TableCell colSpan={8} className="bg-slate-100 dark:bg-slate-800 font-bold">
                                  Bahar (Right Digit)
                                </TableCell>
                              </TableRow>
                              
                              {Array.from({ length: 10 }, (_, i) => {
                                // For Bahar - use format B0, B1, B2, etc.
                                const digit = i.toString();
                                const prediction = `B${digit}`;
                                
                                // Filter games for this Bahar digit
                                const gamesForDigit = data.detailedData.gameData.filter(game => {
                                  if (game.gameType !== 'satamatka') return false;
                                  if (game.result && game.result !== 'pending') return false;
                                  if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                  
                                  // Match Bahar digit predictions (like B1, B2, etc.)
                                  return game.prediction === prediction || 
                                         (game.gameMode === 'harf' && game.prediction?.startsWith('B') && 
                                          game.prediction?.slice(1) === digit);
                                });
                                
                                // Calculate total bet amount for this digit
                                const totalBetAmount = gamesForDigit.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                
                                // Calculate potential win amount (9x for Harf)
                                const potentialWin = gamesForDigit.reduce((sum, game) => sum + ((game.betAmount || 0) * 9), 0);
                                
                                // Get unique bet types
                                const betTypes = Array.from(new Set(gamesForDigit.map(game => game.gameMode || game.prediction))).join(', ');
                                
                                // Determine risk level based on thresholds
                                const riskLevel = totalBetAmount >= riskThresholds.high 
                                  ? 'high' 
                                  : totalBetAmount >= riskThresholds.medium 
                                    ? 'medium' 
                                    : totalBetAmount >= riskThresholds.low 
                                      ? 'low' 
                                      : '';
                                      
                                return (
                                  <TableRow 
                                    key={`bahar-${digit}`}
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
                                    <TableCell className="font-bold text-center">{digit} (Bahar)</TableCell>
                                    <TableCell>{gamesForDigit.length}</TableCell>
                                    <TableCell>
                                      {totalBetAmount > 0 
                                        ? `₹${(totalBetAmount/100).toFixed(2)}` 
                                        : <span className="text-muted-foreground">No bets</span>
                                      }
                                    </TableCell>
                                    <TableCell>
                                      {potentialWin > 0 
                                        ? `₹${(potentialWin/100).toFixed(2)}` 
                                        : <span className="text-muted-foreground">-</span>
                                      }
                                    </TableCell>
                                    <TableCell>{betTypes}</TableCell>
                                    <TableCell>
                                      {gamesForDigit.length > 0 && (
                                        <div className="flex flex-col space-y-1">
                                          {Array.from(new Set(gamesForDigit.map(game => game.marketId))).map(marketId => (
                                            <Badge key={marketId} variant="outline">
                                              {marketInfo[marketId]?.name || `Market ${marketId}`}
                                            </Badge>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {getRiskLevelBadge(riskLevel)}
                                    </TableCell>
                                    <TableCell>
                                      {gamesForDigit.length > 0 && (
                                        <div className="flex flex-col space-y-1">
                                          {Array.from(new Set(gamesForDigit.map(game => game.userId))).map(userId => (
                                            <div key={userId} className="flex items-center space-x-1">
                                              <Users className="h-3 w-3" />
                                              <span className="text-xs">{userInfo[userId]?.username || `User ${userId}`}</span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </>
                          ) : betTypeFilter === 'oddeven' ? (
                            // For Odd/Even bet type, show only Odd and Even options
                            ['odd', 'even'].map(option => {
                              // Filter games for this odd/even option
                              const gamesForOption = data.detailedData.gameData.filter(game => {
                                if (game.gameType !== 'satamatka') return false;
                                if (game.result && game.result !== 'pending') return false;
                                if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                
                                // Match odd/even prediction
                                return game.prediction === option || 
                                       (game.gameMode === 'oddeven' || game.gameMode === 'odd_even') && 
                                       game.prediction === option;
                              });
                              
                              // Calculate total bet amount for this option
                              const totalBetAmount = gamesForOption.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                              
                              // Calculate potential win amount (1.9x for Odd/Even)
                              const potentialWin = gamesForOption.reduce((sum, game) => sum + ((game.betAmount || 0) * 1.9), 0);
                              
                              // Get unique bet types
                              const betTypes = Array.from(new Set(gamesForOption.map(game => game.gameMode || game.prediction))).join(', ');
                              
                              // Determine risk level based on thresholds
                              const riskLevel = totalBetAmount >= riskThresholds.high 
                                ? 'high' 
                                : totalBetAmount >= riskThresholds.medium 
                                  ? 'medium' 
                                  : totalBetAmount >= riskThresholds.low 
                                    ? 'low' 
                                    : '';
                                    
                              return (
                                <TableRow 
                                  key={option}
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
                                  <TableCell className="font-bold text-center">{option.charAt(0).toUpperCase() + option.slice(1)}</TableCell>
                                  <TableCell>{gamesForOption.length}</TableCell>
                                  <TableCell>
                                    {totalBetAmount > 0 
                                      ? `₹${(totalBetAmount/100).toFixed(2)}` 
                                      : <span className="text-muted-foreground">No bets</span>
                                    }
                                  </TableCell>
                                  <TableCell>
                                    {potentialWin > 0 
                                      ? `₹${(potentialWin/100).toFixed(2)}` 
                                      : <span className="text-muted-foreground">-</span>
                                    }
                                  </TableCell>
                                  <TableCell>{betTypes}</TableCell>
                                  <TableCell>
                                    {gamesForOption.length > 0 && (
                                      <div className="flex flex-col space-y-1">
                                        {Array.from(new Set(gamesForOption.map(game => game.marketId))).map(marketId => (
                                          <Badge key={marketId} variant="outline">
                                            {marketInfo[marketId]?.name || `Market ${marketId}`}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {getRiskLevelBadge(riskLevel)}
                                  </TableCell>
                                  <TableCell>
                                    {gamesForOption.length > 0 && (
                                      <div className="flex flex-col space-y-1">
                                        {Array.from(new Set(gamesForOption.map(game => game.userId))).map(userId => (
                                          <div key={userId} className="flex items-center space-x-1">
                                            <Users className="h-3 w-3" />
                                            <span className="text-xs">{userInfo[userId]?.username || `User ${userId}`}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            // For Jodi, Crossing, and All Types - show the standard 00-99 numbers grid
                            Array.from({ length: 100 }, (_, i) => {
                              // Format number as two digits (e.g., 00, 01, ..., 99)
                              const num = i.toString().padStart(2, '0');
                            
                            // Get all games for this number filtered by the selected bet type
                            const gamesForNumber = data.detailedData.gameData.filter(game => {
                              // Check if this is a Satamatka game
                              if (game.gameType !== 'satamatka') return false;
                              
                              // Only include active bets (result is null or pending)
                              if (game.result && game.result !== 'pending') return false;
                              
                              // Filter by market if a specific market is selected
                              if (marketFilter !== 'all' && game.marketId !== marketFilter) {
                                return false;
                              }
                              
                              // Check if the bet type matches our filter (if specific filter selected)
                              if (betTypeFilter !== 'all') {
                                // For jodi filter, check if the prediction is either 'jodi' or a numerical value
                                if (betTypeFilter === 'jodi') {
                                  if (game.prediction !== 'jodi' && 
                                      !(/^\d{2}$/.test(game.prediction) || game.gameMode === 'jodi')) {
                                    return false;
                                  }
                                } 
                                // For specific filters like harf, crossing, oddeven
                                else if (game.prediction !== betTypeFilter && game.gameMode !== betTypeFilter) {
                                  return false;
                                }
                              }
                              
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
                            
                            // Calculate potential win amount (using 90x for jodi, 9x for others)
                            const potentialWin = gamesForNumber.reduce((sum, game) => {
                              // Use the proper multipliers for each game type
                              let multiplier = 90; // Default (90x for Jodi)
                              
                              // Check different game predictions and apply the appropriate multiplier
                              if (game.prediction === 'jodi' || game.gameMode === 'jodi' || /^\d{2}$/.test(game.prediction)) {
                                multiplier = 90; // 90x for Jodi - if user bets 100, they win 9000
                              } else if (game.prediction === 'harf' || game.prediction === 'crossing' || 
                                      game.gameMode === 'harf' || game.gameMode === 'crossing' ||
                                      game.prediction?.startsWith('L') || game.prediction?.startsWith('R') ||
                                      game.prediction?.startsWith('A') || game.prediction?.startsWith('B')) {
                                multiplier = 9; // 9x for Harf/Crossing - if user bets 100, they win 900
                              } else if (game.prediction === 'oddeven' || game.gameMode === 'oddeven') {
                                multiplier = 1.9; // 1.9x for OddEven - if user bets 100, they win 190
                              }
                              
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
                            
                            // Define the risk level based on bet amount using configurable thresholds
                            let riskLevel = 'none';
                            if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                            else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                            else if (totalBetAmount > 0) riskLevel = 'low';
                            
                            // Get bet types for this number
                            const betTypeSet = new Set<string>();
                            gamesForNumber.forEach(game => {
                              if (game.prediction) {
                                betTypeSet.add(game.prediction as string);
                              }
                            });
                            const betTypes = Array.from(betTypeSet) as string[];
                            
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
                                    ? `₹${(totalBetAmount/100).toFixed(2)}` 
                                    : <span className="text-muted-foreground">No bets</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {potentialWin > 0 
                                    ? `₹${(potentialWin/100).toFixed(2)}` 
                                    : <span className="text-muted-foreground">-</span>
                                  }
                                </TableCell>
                                <TableCell>
                                  {betTypes.length > 0 
                                    ? betTypes.map((type, idx) => {
                                        // Format the bet type to proper display name
                                        let displayType = type;
                                        if (type === 'jodi' || type === '01' || type === '02' || type === '03' || 
                                            type === '04' || type === '08' || type === '09' || type === '13' || type === '14') 
                                          displayType = 'Jodi';
                                        else if (type === 'harf') displayType = 'Hurf';
                                        else if (type === 'crossing') displayType = 'Crossing';
                                        else if (type === 'oddeven') displayType = 'Odd/Even';
                                        
                                        return (
                                          <Badge key={idx} className="mr-1 mb-1 bg-slate-700">
                                            {displayType}
                                          </Badge>
                                        );
                                      })
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
                                  {gamesForNumber.length > 0 ? (
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button size="sm" variant="outline" className="flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          View Players ({gamesForNumber.length})
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="sm:max-w-md max-h-[80vh]">
                                        <DialogHeader>
                                          <DialogTitle>Player Details for Number {num}</DialogTitle>
                                          <DialogDescription>
                                            All players with active bets on this number
                                          </DialogDescription>
                                        </DialogHeader>
                                        
                                        <PlayerDetailsContent 
                                          games={gamesForNumber} 
                                          userInfo={userInfo} 
                                          marketInfo={marketInfo} 
                                        />
                                      </DialogContent>
                                    </Dialog>
                                  ) : (
                                    <span className="text-muted-foreground">No player data</span>
                                  )}
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
                                game.prediction === betTypeFilter &&
                                (marketFilter === 'all' || game.marketId === marketFilter)
                              )
                              .map((game, idx) => (
                                <TableRow key={game.id || idx}>
                                  <TableCell>{game.gameData?.number || 'Unknown'}</TableCell>
                                  <TableCell>₹{game.betAmount?.toFixed(2) || 0}</TableCell>
                                  <TableCell>₹{((game.betAmount || 0) * 90 / 100).toFixed(2)}</TableCell>
                                  <TableCell><RiskBadge amount={game.betAmount || 0} /></TableCell>
                                  <TableCell>
                                    {game.marketId ? (marketInfo[game.marketId]?.name || `Market ${game.marketId}`) : 'N/A'}
                                  </TableCell>
                                </TableRow>
                              ))}
                            {data.detailedData.gameData.filter(game => 
                              game.gameType === 'satamatka' && 
                              !game.result && 
                              game.prediction === betTypeFilter &&
                              (marketFilter === 'all' || game.marketId === marketFilter)
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

// Player Details Content Component with Pagination
interface PlayerDetailsContentProps {
  games: any[];
  userInfo: Record<string, any>;
  marketInfo: Record<string, any>;
}

const PlayerDetailsContent: React.FC<PlayerDetailsContentProps> = ({ games, userInfo, marketInfo }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const playersPerPage = 10;
  
  // Calculate pagination
  const totalPages = Math.ceil(games.length / playersPerPage);
  const startIndex = (currentPage - 1) * playersPerPage;
  const endIndex = startIndex + playersPerPage;
  const currentGames = games.slice(startIndex, endIndex);
  
  // Format bet type name
  const getBetTypeName = (prediction: string) => {
    if (prediction === 'jodi' || 
        prediction === '01' || prediction === '02' || 
        prediction === '03' || prediction === '04' || 
        prediction === '08' || prediction === '09' || 
        prediction === '13' || prediction === '14') 
      return 'Jodi';
    else if (prediction === 'harf') return 'Hurf';
    else if (prediction === 'crossing') return 'Crossing';
    else if (prediction === 'oddeven') return 'Odd/Even';
    return prediction || 'Unknown';
  };
  
  return (
    <div className="mt-4">
      <div className="max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-primary scrollbar-track-slate-800">
        {currentGames.map((game, idx) => {
          const userId = game.userId;
          const username = userInfo[userId]?.username || `User ${userId}`;
          
          // Calculate potential win based on game type
          let multiplier = 0.9; // Default for jodi
          if (game.prediction === 'harf' || game.prediction === 'crossing') multiplier = 0.09;
          else if (game.prediction === 'oddeven') multiplier = 0.019;
          
          const potentialWin = (game.betAmount || 0) * multiplier;
          
          return (
            <div key={idx} className="mb-3 p-3 border border-slate-700 rounded-md bg-slate-800/50">
              <div className="font-medium text-amber-400 text-base">{username}</div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="text-slate-300">Bet: ₹{((game.betAmount || 0)/100).toFixed(2)}</div>
                <div className="text-green-400">Win: ₹{potentialWin.toFixed(2)}</div>
                <div className="text-slate-400">Type: {getBetTypeName(game.prediction)}</div>
                <div className="text-slate-400">
                  Market: {game.marketId ? 
                    (marketInfo[game.marketId]?.name || `Market ${game.marketId}`) : 
                    'Unknown Market'}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
};