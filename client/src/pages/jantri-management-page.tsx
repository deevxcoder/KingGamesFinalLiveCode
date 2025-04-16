import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import DashboardLayout from "@/components/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Calculator,
  Users,
  DollarSign,
  BarChart3,
  ArrowUpRight,
  Clock,
  GamepadIcon,
  TrendingUp,
  AlertTriangle,
  Filter
} from "lucide-react";

interface BettingStats {
  number: string;
  totalBets: number;
  totalAmount: number;
  potentialWinAmount: number;
  uniqueUsers: number;
}

interface JantriGameStats {
  marketId: number;
  marketName: string;
  numbers: BettingStats[];
}

export default function JantriManagementPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  const isAdmin = user?.role === "admin";
  const isSubadmin = user?.role === "subadmin";
  
  // Function to generate all numbers from 00 to 99
  const generateAllNumbers = (): string[] => {
    const numbers: string[] = [];
    for (let i = 0; i < 100; i++) {
      numbers.push(i.toString().padStart(2, '0'));
    }
    return numbers;
  };
  
  const allNumbers = generateAllNumbers();
  
  // Query for getting jantri statistics
  const { data: jantriStats, isLoading } = useQuery<JantriGameStats[]>({
    queryKey: ["/api/jantri/stats", isAdmin ? "admin" : "subadmin"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user && (isAdmin || isSubadmin),
  });
  
  // Find stats for a selected number
  const getStatsForNumber = (number: string): BettingStats | undefined => {
    if (!jantriStats || jantriStats.length === 0) return undefined;
    
    // If we're on the "all" tab, combine stats from all markets
    if (activeTab === "all") {
      let totalBets = 0;
      let totalAmount = 0;
      let potentialWinAmount = 0;
      let uniqueUsers = new Set<number>();
      
      jantriStats.forEach(market => {
        const numberStats = market.numbers.find(n => n.number === number);
        if (numberStats) {
          totalBets += numberStats.totalBets;
          totalAmount += numberStats.totalAmount;
          potentialWinAmount += numberStats.potentialWinAmount;
          // Note: this is a simplified approach, as we don't have user IDs here
          uniqueUsers.add(numberStats.uniqueUsers);
        }
      });
      
      return {
        number,
        totalBets,
        totalAmount,
        potentialWinAmount,
        uniqueUsers: uniqueUsers.size
      };
    }
    
    // Otherwise, find stats for the specific market
    const marketId = parseInt(activeTab);
    const market = jantriStats.find(m => m.marketId === marketId);
    if (!market) return undefined;
    
    return market.numbers.find(n => n.number === number);
  };
  
  // Generate placeholder or real stats for demonstration
  const getPlaceholderStats = (): JantriGameStats[] => {
    const mockMarkets = [
      { id: 1, name: "Dishawar Morning" },
      { id: 2, name: "Gali" },
      { id: 3, name: "Mumbai" }
    ];
    
    return mockMarkets.map(market => ({
      marketId: market.id,
      marketName: market.name,
      numbers: allNumbers.map(num => ({
        number: num,
        totalBets: 0,
        totalAmount: 0,
        potentialWinAmount: 0,
        uniqueUsers: 0
      }))
    }));
  };
  
  // Use real data if available, otherwise use placeholder data
  const displayStats = jantriStats || getPlaceholderStats();
  
  // Get selected number stats
  const selectedNumberStats = selectedNumber ? getStatsForNumber(selectedNumber) : undefined;
  
  // Number of columns to display per row based on screen size
  const columnsPerRow = isMobile ? 5 : 10;
  
  // Create rows of numbers
  const numberRows: string[][] = [];
  for (let i = 0; i < allNumbers.length; i += columnsPerRow) {
    numberRows.push(allNumbers.slice(i, i + columnsPerRow));
  }
  
  // Game types for filtering
  const gameTypes = ["All Games", "Jodi", "Harf", "Crossing", "Odd-Even"];
  const [activeGameType, setActiveGameType] = useState("All Games");
  
  // Calculate overall stats for all numbers
  const calculateOverallStats = () => {
    if (!jantriStats || jantriStats.length === 0) {
      return {
        totalActiveBets: 0,
        totalActiveUsers: 0,
        totalBetAmount: 0,
        totalPotentialWin: 0
      };
    }
    
    let totalActiveBets = 0;
    let totalBetAmount = 0;
    let totalPotentialWin = 0;
    const uniqueUsers = new Set<number>();
    
    jantriStats.forEach(market => {
      market.numbers.forEach(numStats => {
        if (numStats.totalBets > 0) {
          totalActiveBets += numStats.totalBets;
          totalBetAmount += numStats.totalAmount;
          totalPotentialWin += numStats.potentialWinAmount;
          uniqueUsers.add(numStats.uniqueUsers);
        }
      });
    });
    
    return {
      totalActiveBets,
      totalActiveUsers: uniqueUsers.size,
      totalBetAmount,
      totalPotentialWin
    };
  };
  
  const overallStats = calculateOverallStats();
  
  return (
    <DashboardLayout title="Jantri Management">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Jantri Management</h1>
        <p className="text-muted-foreground">
          View betting statistics for each number across all markets
        </p>
      </div>
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Active Bets</p>
                <p className="text-2xl font-bold">{overallStats.totalActiveBets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <Calculator className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">Active betting activity</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Active Users</p>
                <p className="text-2xl font-bold">{overallStats.totalActiveUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">Unique players with active bets</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bet Amount</p>
                <p className="text-2xl font-bold">₹{(overallStats.totalBetAmount / 100).toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">Total amount at stake</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Potential Payout</p>
                <p className="text-2xl font-bold text-amber-500">₹{(overallStats.totalPotentialWin / 100).toFixed(2)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                <ArrowUpRight className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-amber-500">
              <AlertTriangle className="h-4 w-4 mr-1" />
              <span className="font-medium">Maximum potential payouts</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Game Type Filter */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by Game Type:</span>
        </div>
        <Select value={activeGameType} onValueChange={setActiveGameType}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Game Type" />
          </SelectTrigger>
          <SelectContent>
            {gameTypes.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">All Markets</TabsTrigger>
          {displayStats.map(market => (
            <TabsTrigger key={market.marketId} value={market.marketId.toString()}>
              {market.marketName}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>All Markets Overview</CardTitle>
              <CardDescription>
                Select a number to view detailed statistics across all markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Display grid of numbers - always scrollable for consistency */}
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-2">
                  {numberRows.map((row, rowIndex) => (
                    <div key={rowIndex} className="flex space-x-2">
                      {row.map(number => {
                        const stats = getStatsForNumber(number);
                        const hasBets = stats && stats.totalBets > 0;
                        
                        return (
                          <Button
                            key={number}
                            variant={selectedNumber === number ? "default" : "outline"}
                            className={`w-12 h-12 p-0 
                              ${hasBets ? "border-amber-500 hover:border-amber-600 bg-amber-500/10 hover:bg-amber-500/20" : ""} 
                              ${selectedNumber === number ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                            onClick={() => setSelectedNumber(number)}
                          >
                            <span className="font-bold">{number}</span>
                            {hasBets && (
                              <Badge 
                                variant="secondary" 
                                className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 text-xs bg-amber-500 text-white"
                              >
                                {stats.totalBets}
                              </Badge>
                            )}
                          </Button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {selectedNumber && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <span className="mr-2">Number {selectedNumber} Statistics</span>
                  {selectedNumberStats && selectedNumberStats.totalBets > 0 ? (
                    <Badge className="bg-green-500">Active Bets</Badge>
                  ) : (
                    <Badge variant="outline">No Bets</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Combined betting data across all markets
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-card p-4 rounded-lg border flex flex-col">
                      <span className="text-muted-foreground text-sm flex items-center mb-2">
                        <Users className="w-4 h-4 mr-1" /> Unique Players
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {selectedNumberStats?.uniqueUsers || 0}
                      </span>
                    </div>
                    
                    <div className="bg-card p-4 rounded-lg border flex flex-col">
                      <span className="text-muted-foreground text-sm flex items-center mb-2">
                        <Calculator className="w-4 h-4 mr-1" /> Total Bets
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        {selectedNumberStats?.totalBets || 0}
                      </span>
                    </div>
                    
                    <div className="bg-card p-4 rounded-lg border flex flex-col">
                      <span className="text-muted-foreground text-sm flex items-center mb-2">
                        <DollarSign className="w-4 h-4 mr-1" /> Total Amount
                      </span>
                      <span className="text-2xl font-bold text-primary">
                        ₹{((selectedNumberStats?.totalAmount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                    
                    <div className="bg-card p-4 rounded-lg border flex flex-col">
                      <span className="text-muted-foreground text-sm flex items-center mb-2">
                        <ArrowUpRight className="w-4 h-4 mr-1" /> Potential Payout
                      </span>
                      <span className="text-2xl font-bold text-amber-500">
                        ₹{((selectedNumberStats?.potentialWinAmount || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                
                {isAdmin && selectedNumberStats && selectedNumberStats.totalBets > 0 && (
                  <>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <h3 className="font-medium">Betting Players</h3>
                      <p className="text-sm text-muted-foreground">
                        Detailed player list is available in the full report
                      </p>
                      <Button variant="outline" className="flex items-center">
                        <BarChart3 className="w-4 h-4 mr-2" />
                        View Detailed Report
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Individual market tabs */}
        {displayStats.map(market => (
          <TabsContent key={market.marketId} value={market.marketId.toString()} className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{market.marketName}</CardTitle>
                  <Badge variant="outline" className="flex items-center">
                    <Clock className="w-4 h-4 mr-1" />
                    <span>Open</span>
                  </Badge>
                </div>
                <CardDescription>
                  Select a number to view detailed statistics for this market
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Display grid of numbers - always scrollable for consistency */}
                <ScrollArea className="h-[300px] rounded-md border p-4">
                  <div className="space-y-2">
                    {numberRows.map((row, rowIndex) => (
                      <div key={rowIndex} className="flex space-x-2">
                        {row.map(number => {
                          // Get stats specific to this market
                          const numberStats = market.numbers.find(n => n.number === number);
                          const hasBets = numberStats && numberStats.totalBets > 0;
                          
                          return (
                            <Button
                              key={number}
                              variant={selectedNumber === number ? "default" : "outline"}
                              className={`w-12 h-12 p-0 
                                ${hasBets ? "border-amber-500 hover:border-amber-600 bg-amber-500/10 hover:bg-amber-500/20" : ""} 
                                ${selectedNumber === number ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}`}
                              onClick={() => setSelectedNumber(number)}
                            >
                              <span className="font-bold">{number}</span>
                              {hasBets && (
                                <Badge 
                                  variant="secondary" 
                                  className="absolute -top-2 -right-2 w-6 h-6 flex items-center justify-center p-0 text-xs bg-amber-500 text-white"
                                >
                                  {numberStats.totalBets}
                                </Badge>
                              )}
                            </Button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {selectedNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <span className="mr-2">{market.marketName}: Number {selectedNumber}</span>
                    {/* Check if there are bets for this specific market and number */}
                    {(market.numbers.find(n => n.number === selectedNumber)?.totalBets ?? 0) > 0 ? (
                      <Badge className="bg-green-500">Active Bets</Badge>
                    ) : (
                      <Badge variant="outline">No Bets</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    Betting statistics for {selectedNumber} in {market.marketName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-card p-4 rounded-lg border flex flex-col">
                        <span className="text-muted-foreground text-sm flex items-center mb-2">
                          <Users className="w-4 h-4 mr-1" /> Unique Players
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {market.numbers.find(n => n.number === selectedNumber)?.uniqueUsers || 0}
                        </span>
                      </div>
                      
                      <div className="bg-card p-4 rounded-lg border flex flex-col">
                        <span className="text-muted-foreground text-sm flex items-center mb-2">
                          <Calculator className="w-4 h-4 mr-1" /> Total Bets
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          {market.numbers.find(n => n.number === selectedNumber)?.totalBets || 0}
                        </span>
                      </div>
                      
                      <div className="bg-card p-4 rounded-lg border flex flex-col">
                        <span className="text-muted-foreground text-sm flex items-center mb-2">
                          <DollarSign className="w-4 h-4 mr-1" /> Total Amount
                        </span>
                        <span className="text-2xl font-bold text-primary">
                          ₹{((market.numbers.find(n => n.number === selectedNumber)?.totalAmount || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                      
                      <div className="bg-card p-4 rounded-lg border flex flex-col">
                        <span className="text-muted-foreground text-sm flex items-center mb-2">
                          <ArrowUpRight className="w-4 h-4 mr-1" /> Potential Payout
                        </span>
                        <span className="text-2xl font-bold text-amber-500">
                          ₹{((market.numbers.find(n => n.number === selectedNumber)?.potentialWinAmount || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {isAdmin && (market.numbers.find(n => n.number === selectedNumber)?.totalBets ?? 0) > 0 && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-2">
                        <h3 className="font-medium">Betting Players</h3>
                        <p className="text-sm text-muted-foreground">
                          Detailed player list is available in the full report
                        </p>
                        <Button variant="outline" className="flex items-center">
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Detailed Report
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </DashboardLayout>
  );
}