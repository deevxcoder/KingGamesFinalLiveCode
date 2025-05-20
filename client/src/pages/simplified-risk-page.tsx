import React, { useState } from "react";
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

export default function SimplifiedRiskPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const [activeTab, setActiveTab] = useState('market-game');
  const [userInfo, setUserInfo] = useState<UserInfo>({});
  const [marketInfo, setMarketInfo] = useState<MarketInfo>({});
  const [betTypeFilter, setBetTypeFilter] = useState<string>('all');
  const [marketFilter, setMarketFilter] = useState<number | 'all'>('all');
  const [viewMode, setViewMode] = useState<'regular' | 'odd-even' | 'harf'>('regular');
  
  // Risk level threshold configuration
  const [riskThresholds, setRiskThresholds] = useState({
    high: 1000,
    medium: 500,
    low: 100
  });
  
  // Whether risk configuration dialog is open
  const [riskConfigOpen, setRiskConfigOpen] = useState(false);
  
  // Form for risk threshold configuration
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
  React.useEffect(() => {
    if (data?.userInfo) {
      setUserInfo(data.userInfo);
    }
  }, [data]);
  
  // Use real market names from the API
  React.useEffect(() => {
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

  // Helper function for risk level badge
  const getRiskLevelBadge = (level: string) => {
    if (level === 'high') return <Badge variant="destructive">High</Badge>;
    if (level === 'medium') return <Badge variant="outline" className="bg-orange-500 text-white border-orange-600">Medium</Badge>;
    if (level === 'low') return <Badge variant="outline" className="bg-blue-500 text-white border-blue-600">Low</Badge>;
    return null;
  };

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
                      <CardTitle className="text-sm font-medium">
                        Active Satamatka Bets
                      </CardTitle>
                      <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{marketGameData.activeBets}</div>
                      <p className="text-xs text-muted-foreground">
                        From {marketGameData.totalBets} total bets
                      </p>
                      <div className="mt-3">
                        <Progress 
                          value={marketGameData.totalBets > 0 ? (marketGameData.activeBets / marketGameData.totalBets) * 100 : 0} 
                          className="h-2" 
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        High Risk Bets
                      </CardTitle>
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{marketGameData.highRiskBets}</div>
                      <p className="text-xs text-muted-foreground">
                        Require immediate attention
                      </p>
                      <div className="mt-3">
                        <Progress 
                          value={marketGameData.activeBets > 0 ? (marketGameData.highRiskBets / marketGameData.activeBets) * 100 : 0} 
                          className="h-2 bg-red-200" 
                        />
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Current Exposure
                      </CardTitle>
                      <Target className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">₹{(marketGameData.exposureAmount / 100).toFixed(2)}</div>
                      <p className="text-xs text-muted-foreground">
                        {marketGameData.exposureAmount > 0 ? "Potential liability" : "Profitable position"}
                      </p>
                      <div className="mt-3">
                        {marketGameData.potentialLiability > 0 ? (
                          <div className="flex items-center space-x-2">
                            <TrendingDown className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-500">Max Liability: ₹{(marketGameData.potentialLiability / 100).toFixed(2)}</span>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <TrendingUp className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-500">Min Profit: ₹{(marketGameData.potentialProfit / 100).toFixed(2)}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Bettor Distribution
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {Object.keys(data.detailedData.userExposure).length}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Players with active bets
                      </p>
                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs">
                            Markets: {Object.keys(data.detailedData.marketExposure).length}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Jantri Risk Analysis</CardTitle>
                    <CardDescription>
                      View and analyze bets by number, market, and player
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 mb-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold w-24">Market:</span>
                          <select 
                            className="p-2 border rounded-md w-48 bg-background"
                            value={marketFilter === 'all' ? 'all' : marketFilter.toString()}
                            onChange={(e) => setMarketFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))}
                          >
                            <option value="all">All Markets</option>
                            {Object.entries(marketInfo).map(([id, market]) => (
                              <option key={id} value={id}>
                                {market.name} ({market.type})
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {/* View Selector */}
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold w-24">View Mode:</span>
                          <div className="flex items-center space-x-2">
                            <Badge 
                              className={`cursor-pointer px-3 py-1 ${viewMode === 'regular' && betTypeFilter === 'all' ? 'bg-primary' : 'bg-slate-700'}`}
                              onClick={() => {
                                setViewMode('regular');
                                setBetTypeFilter('all');
                              }}
                            >
                              All Numbers
                            </Badge>
                            <Badge 
                              className={`cursor-pointer px-3 py-1 ${viewMode === 'regular' && betTypeFilter === 'jodi' ? 'bg-primary' : 'bg-slate-700'}`}
                              onClick={() => {
                                setViewMode('regular');
                                setBetTypeFilter('jodi');
                              }}
                            >
                              Jodi Only
                            </Badge>
                            <Badge 
                              className={`cursor-pointer px-3 py-1 ${viewMode === 'odd-even' ? 'bg-primary' : 'bg-slate-700'}`}
                              onClick={() => setViewMode('odd-even')}
                            >
                              Odd/Even
                            </Badge>
                            <Badge 
                              className={`cursor-pointer px-3 py-1 ${viewMode === 'harf' ? 'bg-primary' : 'bg-slate-700'}`}
                              onClick={() => setViewMode('harf')}
                            >
                              Harf (A0-B9)
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
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-2 text-xs" 
                            onClick={() => setRiskConfigOpen(true)}
                          >
                            Configure Risk Levels
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <ScrollArea className="h-[600px]">
                      {viewMode === 'odd-even' ? (
                        <div className="p-4">
                          <h3 className="text-lg font-bold mb-4">Odd/Even Risk Management</h3>
                          <div className="grid grid-cols-2 gap-6">
                            {/* Odd Numbers Section */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Odd Numbers</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  // Filter games for odd numbers
                                  const oddGames = data.detailedData.gameData.filter(game => {
                                    if (game.gameType !== 'satamatka') return false;
                                    if (game.result && game.result !== 'pending') return false;
                                    if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                    
                                    // Check if prediction is an odd number (last digit is odd)
                                    const num = parseInt(game.prediction, 10);
                                    return !isNaN(num) && num % 2 !== 0;
                                  });
                                  
                                  // Calculate totals
                                  const totalBets = oddGames.length;
                                  const totalBetAmount = oddGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                  const potentialWin = oddGames.reduce((sum, game) => sum + ((game.betAmount || 0) * 90), 0);
                                  
                                  // Define risk level
                                  let riskLevel = 'none';
                                  if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                                  else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                                  else if (totalBetAmount > 0) riskLevel = 'low';
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex justify-between">
                                        <span className="font-medium">Active Bets:</span>
                                        <span>{totalBets}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">Total Bet Amount:</span>
                                        <span>₹{(totalBetAmount / 100).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">Potential Win:</span>
                                        <span>₹{(potentialWin / 100).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Risk Level:</span>
                                        <span>{getRiskLevelBadge(riskLevel)}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                            
                            {/* Even Numbers Section */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Even Numbers</CardTitle>
                              </CardHeader>
                              <CardContent>
                                {(() => {
                                  // Filter games for even numbers
                                  const evenGames = data.detailedData.gameData.filter(game => {
                                    if (game.gameType !== 'satamatka') return false;
                                    if (game.result && game.result !== 'pending') return false;
                                    if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                    
                                    // Check if prediction is an even number (last digit is even)
                                    const num = parseInt(game.prediction, 10);
                                    return !isNaN(num) && num % 2 === 0;
                                  });
                                  
                                  // Calculate totals
                                  const totalBets = evenGames.length;
                                  const totalBetAmount = evenGames.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                  const potentialWin = evenGames.reduce((sum, game) => sum + ((game.betAmount || 0) * 90), 0);
                                  
                                  // Define risk level
                                  let riskLevel = 'none';
                                  if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                                  else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                                  else if (totalBetAmount > 0) riskLevel = 'low';
                                  
                                  return (
                                    <div className="space-y-4">
                                      <div className="flex justify-between">
                                        <span className="font-medium">Active Bets:</span>
                                        <span>{totalBets}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">Total Bet Amount:</span>
                                        <span>₹{(totalBetAmount / 100).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="font-medium">Potential Win:</span>
                                        <span>₹{(potentialWin / 100).toFixed(2)}</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="font-medium">Risk Level:</span>
                                        <span>{getRiskLevelBadge(riskLevel)}</span>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ) : viewMode === 'harf' ? (
                        <div className="p-4">
                          <h3 className="text-lg font-bold mb-4">Harf Risk Management</h3>
                          <div className="grid grid-cols-2 gap-6 mb-8">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Left Digit (A0-A9)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-5 gap-4">
                                  {Array.from({ length: 10 }, (_, i) => {
                                    const digit = i.toString();
                                    
                                    // Filter games for this left digit
                                    const gamesForLeftDigit = data.detailedData.gameData.filter(game => {
                                      if (game.gameType !== 'satamatka') return false;
                                      if (game.result && game.result !== 'pending') return false;
                                      if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                      
                                      // For left digit, the game prediction should match the first character of the two-digit number
                                      return game.prediction && game.prediction.length === 2 && game.prediction[0] === digit;
                                    });
                                    
                                    // Calculate totals
                                    const totalBets = gamesForLeftDigit.length;
                                    const totalBetAmount = gamesForLeftDigit.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                    const potentialWin = gamesForLeftDigit.reduce((sum, game) => sum + ((game.betAmount || 0) * 90), 0);
                                    
                                    // Define risk level
                                    let riskLevel = 'none';
                                    if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                                    else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                                    else if (totalBetAmount > 0) riskLevel = 'low';
                                    
                                    return (
                                      <Card key={`left-${digit}`} className={
                                        riskLevel === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                        riskLevel === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                        riskLevel === 'low' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                                      }>
                                        <CardHeader className="p-3 pb-0">
                                          <CardTitle className="text-base text-center">A{digit}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 text-sm">
                                          <div className="space-y-1">
                                            <div className="flex justify-between">
                                              <span>Bets:</span>
                                              <span>{totalBets}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Amount:</span>
                                              <span>₹{(totalBetAmount / 100).toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Win:</span>
                                              <span>₹{(potentialWin / 100).toFixed(0)}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-base">Right Digit (B0-B9)</CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-5 gap-4">
                                  {Array.from({ length: 10 }, (_, i) => {
                                    const digit = i.toString();
                                    
                                    // Filter games for this right digit
                                    const gamesForRightDigit = data.detailedData.gameData.filter(game => {
                                      if (game.gameType !== 'satamatka') return false;
                                      if (game.result && game.result !== 'pending') return false;
                                      if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                      
                                      // For right digit, the game prediction should match the second character of the two-digit number
                                      return game.prediction && game.prediction.length === 2 && game.prediction[1] === digit;
                                    });
                                    
                                    // Calculate totals
                                    const totalBets = gamesForRightDigit.length;
                                    const totalBetAmount = gamesForRightDigit.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                                    const potentialWin = gamesForRightDigit.reduce((sum, game) => sum + ((game.betAmount || 0) * 90), 0);
                                    
                                    // Define risk level
                                    let riskLevel = 'none';
                                    if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                                    else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                                    else if (totalBetAmount > 0) riskLevel = 'low';
                                    
                                    return (
                                      <Card key={`right-${digit}`} className={
                                        riskLevel === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                                        riskLevel === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                        riskLevel === 'low' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
                                      }>
                                        <CardHeader className="p-3 pb-0">
                                          <CardTitle className="text-base text-center">B{digit}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-3 text-sm">
                                          <div className="space-y-1">
                                            <div className="flex justify-between">
                                              <span>Bets:</span>
                                              <span>{totalBets}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Amount:</span>
                                              <span>₹{(totalBetAmount / 100).toFixed(0)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span>Win:</span>
                                              <span>₹{(potentialWin / 100).toFixed(0)}</span>
                                            </div>
                                          </div>
                                        </CardContent>
                                      </Card>
                                    );
                                  })}
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      ) : (
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
                              
                              // Filter games for this number
                              const gamesForNumber = data.detailedData.gameData.filter(game => {
                                if (game.gameType !== 'satamatka') return false;
                                if (game.result && game.result !== 'pending') return false;
                                if (marketFilter !== 'all' && game.marketId !== marketFilter) return false;
                                if (betTypeFilter !== 'all' && game.prediction !== betTypeFilter && game.prediction !== num) return false;
                                
                                // Match exact number predictions (jodi format - 00 to 99)
                                return game.prediction === num;
                              });
                              
                              // Calculate total bet amount for this number
                              const totalBetAmount = gamesForNumber.reduce((sum, game) => sum + (game.betAmount || 0), 0);
                              
                              // Calculate potential win amount (90x for Jodi)
                              const potentialWin = gamesForNumber.reduce((sum, game) => sum + ((game.betAmount || 0) * 90), 0);
                              
                              // Get bet types for this number
                              const betTypes = Array.from(new Set(gamesForNumber.map(game => 
                                game.gameMode || "Jodi"
                              ))).join(', ');
                              
                              // Define the risk level based on bet amount using configurable thresholds
                              let riskLevel = 'none';
                              if (totalBetAmount > riskThresholds.high) riskLevel = 'high';
                              else if (totalBetAmount > riskThresholds.medium) riskLevel = 'medium';
                              else if (totalBetAmount > 0) riskLevel = 'low';
                              
                              // Skip rows with no bets
                              if (gamesForNumber.length === 0) {
                                return null;
                              }
                              
                              return (
                                <TableRow 
                                  key={num}
                                  className={
                                    riskLevel === 'high' ? 'bg-red-50 dark:bg-red-900/20' :
                                    riskLevel === 'medium' ? 'bg-orange-50 dark:bg-orange-900/20' :
                                    riskLevel === 'low' ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                                  }
                                >
                                  <TableCell className="font-medium">{num}</TableCell>
                                  <TableCell>{gamesForNumber.length}</TableCell>
                                  <TableCell>₹{(totalBetAmount / 100).toFixed(2)}</TableCell>
                                  <TableCell>₹{(potentialWin / 100).toFixed(2)}</TableCell>
                                  <TableCell>{betTypes}</TableCell>
                                  <TableCell>
                                    {Array.from(new Set(gamesForNumber.map(game => {
                                      const marketId = game.marketId?.toString();
                                      return marketId && marketInfo[marketId] 
                                        ? marketInfo[marketId].name 
                                        : 'Unknown';
                                    }))).join(', ')}
                                  </TableCell>
                                  <TableCell>
                                    {getRiskLevelBadge(riskLevel)}
                                  </TableCell>
                                  <TableCell>
                                    {Array.from(new Set(gamesForNumber.map(game => {
                                      const userId = game.userId?.toString();
                                      return userId && userInfo[userId] 
                                        ? userInfo[userId].username 
                                        : 'Unknown';
                                    }))).join(', ')}
                                  </TableCell>
                                </TableRow>
                              );
                            }).filter(Boolean)}
                          </TableBody>
                        </Table>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="cricket-toss" className="mt-0">
            {cricketTossData ? (
              <div>Cricket toss risk management data would go here</div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Cricket Toss Risk Management</CardTitle>
                  <CardDescription>No cricket toss data available</CardDescription>
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