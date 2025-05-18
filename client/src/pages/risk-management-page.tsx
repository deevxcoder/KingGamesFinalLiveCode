import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";
import DashboardLayout from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertCircle, 
  ArrowDownUp, 
  Filter, 
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Game type labels for display
const GAME_TYPE_LABELS = {
  'satamatka_jodi': 'Satamatka Jodi',
  'satamatka_harf': 'Satamatka Harf',
  'satamatka_crossing': 'Satamatka Crossing',
  'satamatka_odd_even': 'Satamatka Odd/Even',
  'cricket_toss': 'Cricket Toss'
};

// Risk level thresholds (in Rupees)
const RISK_LEVELS = {
  LOW: 1000,   // Risk below ₹1000 is considered low
  MEDIUM: 5000, // Risk between ₹1000 and ₹5000 is considered medium
  HIGH: 10000   // Risk above ₹5000 is considered high
};

// Type definitions
interface RiskData {
  gameType: string;
  marketId?: number;
  marketName?: string;
  matchId?: number;
  matchName?: string;
  totalBets: number;
  totalAmount: number;
  potentialLiability: number;
  highestBet: number;
  playerCount: number;
  riskLevel: 'low' | 'medium' | 'high';
  players: PlayerRisk[];
}

interface PlayerRisk {
  playerId: number;
  playerUsername: string;
  betAmount: number;
  potentialWin: number;
  gameType: string;
  prediction: string;
  assignedTo?: number;
}

export default function RiskManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("marketGames");
  const [filterGameType, setFilterGameType] = useState<string | null>(null);
  const [filterRiskLevel, setFilterRiskLevel] = useState<string | null>(null);
  const isAdmin = user?.role === "admin";

  // Query for risk data - separate queries for each game type
  const { data: marketRiskData = [], isLoading: isLoadingMarketRisk } = useQuery<RiskData[]>({
    queryKey: ["/api/risk/satamatka"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
  
  const { data: cricketTossRiskData = [], isLoading: isLoadingCricketTossRisk } = useQuery<RiskData[]>({
    queryKey: ["/api/risk/cricket-toss"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });

  // Handle data loading errors
  const isLoading = isLoadingMarketRisk || isLoadingCricketTossRisk;
  
  // Filter data based on selected filters
  const filterData = (data: RiskData[]) => {
    return data.filter((item) => {
      if (filterGameType && !item.gameType.includes(filterGameType)) {
        return false;
      }
      if (filterRiskLevel) {
        if (filterRiskLevel === 'low' && item.riskLevel !== 'low') return false;
        if (filterRiskLevel === 'medium' && item.riskLevel !== 'medium') return false;
        if (filterRiskLevel === 'high' && item.riskLevel !== 'high') return false;
      }
      return true;
    });
  };

  // Filter market risk data
  const filteredMarketRiskData = filterData(marketRiskData);

  // Filter cricket toss risk data
  const filteredCricketTossRiskData = filterData(cricketTossRiskData);

  // Handle risk level display
  const getRiskLevelBadge = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <Badge variant="outline" className="bg-emerald-950/40 border-emerald-700 text-emerald-400">Low Risk</Badge>;
      case 'medium':
        return <Badge variant="outline" className="bg-amber-950/40 border-amber-700 text-amber-400">Medium Risk</Badge>;
      case 'high':
        return <Badge variant="outline" className="bg-rose-950/40 border-rose-700 text-rose-400">High Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  // Manual refresh function
  const refreshData = () => {
    if (activeTab === "marketGames") {
      // Invalidate market risk query
    } else {
      // Invalidate cricket toss risk query
    }
  };

  return (
    <DashboardLayout title="Risk Management">
      <div className="flex flex-col space-y-4">
        {/* Header with filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
            Risk Management Dashboard
          </h1>
          
          <div className="flex flex-wrap gap-2">
            {/* Game Type Filter */}
            <Select 
              onValueChange={(value) => setFilterGameType(value === "all" ? null : value)}
              defaultValue="all"
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Game Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Game Types</SelectItem>
                <SelectItem value="satamatka">Satamatka</SelectItem>
                <SelectItem value="cricket_toss">Cricket Toss</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Risk Level Filter */}
            <Select 
              onValueChange={(value) => setFilterRiskLevel(value === "all" ? null : value)}
              defaultValue="all"
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risk Levels</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Refresh Button */}
            <Button 
              variant="outline" 
              size="icon"
              onClick={refreshData}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Tabs for different game types */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="marketGames">
              Satamatka Games
            </TabsTrigger>
            <TabsTrigger value="cricketToss">
              Cricket Toss
            </TabsTrigger>
          </TabsList>
          
          {/* Satamatka Games Tab */}
          <TabsContent value="marketGames">
            <Card>
              <CardHeader>
                <CardTitle>Satamatka Markets Risk Analysis</CardTitle>
                <CardDescription>
                  Manage risk and exposure for all Satamatka market games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingMarketRisk ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredMarketRiskData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Accordion type="single" collapsible className="w-full">
                      {filteredMarketRiskData.map((riskItem, index) => (
                        <AccordionItem key={`${riskItem.gameType}-${riskItem.marketId}-${index}`} value={`${riskItem.gameType}-${riskItem.marketId}-${index}`}>
                          <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-md">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{riskItem.marketName || `Market #${riskItem.marketId}`}</span>
                                <Badge variant="outline" className="bg-indigo-950/40 border-indigo-700 text-indigo-300">
                                  {GAME_TYPE_LABELS[riskItem.gameType as keyof typeof GAME_TYPE_LABELS] || riskItem.gameType}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                {getRiskLevelBadge(riskItem.riskLevel)}
                                <span className="text-amber-500 font-mono">₹{(riskItem.potentialLiability / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-2">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Total Bets</div>
                                  <div className="text-xl font-semibold">{riskItem.totalBets}</div>
                                </div>
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                                  <div className="text-xl font-semibold">₹{(riskItem.totalAmount / 100).toFixed(2)}</div>
                                </div>
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Player Count</div>
                                  <div className="text-xl font-semibold">{riskItem.playerCount}</div>
                                </div>
                              </div>
                              
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Player</TableHead>
                                      <TableHead>Prediction</TableHead>
                                      <TableHead>Bet Amount</TableHead>
                                      <TableHead>Potential Win</TableHead>
                                      <TableHead>Risk Level</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {riskItem.players.map((player, playerIndex) => {
                                      // Calculate risk level for this player
                                      let playerRiskLevel = 'low';
                                      if (player.potentialWin > RISK_LEVELS.MEDIUM * 100) {
                                        playerRiskLevel = 'high';
                                      } else if (player.potentialWin > RISK_LEVELS.LOW * 100) {
                                        playerRiskLevel = 'medium';
                                      }
                                      
                                      return (
                                        <TableRow key={`${player.playerId}-${playerIndex}`}>
                                          <TableCell className="font-medium">{player.playerUsername}</TableCell>
                                          <TableCell>{player.prediction}</TableCell>
                                          <TableCell>₹{(player.betAmount / 100).toFixed(2)}</TableCell>
                                          <TableCell className="text-amber-500 font-mono">
                                            ₹{(player.potentialWin / 100).toFixed(2)}
                                          </TableCell>
                                          <TableCell>{getRiskLevelBadge(playerRiskLevel)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active risk data found for Satamatka games.</p>
                    <p className="text-sm text-muted-foreground mt-1">Players need to place bets for risk data to appear.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Cricket Toss Tab */}
          <TabsContent value="cricketToss">
            <Card>
              <CardHeader>
                <CardTitle>Cricket Toss Games Risk Analysis</CardTitle>
                <CardDescription>
                  Manage risk and exposure for all Cricket Toss games
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingCricketTossRisk ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : filteredCricketTossRiskData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Accordion type="single" collapsible className="w-full">
                      {filteredCricketTossRiskData.map((riskItem, index) => (
                        <AccordionItem key={`${riskItem.gameType}-${riskItem.matchId}-${index}`} value={`${riskItem.gameType}-${riskItem.matchId}-${index}`}>
                          <AccordionTrigger className="hover:bg-muted/50 px-4 py-2 rounded-md">
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{riskItem.matchName || `Match #${riskItem.matchId}`}</span>
                                <Badge variant="outline" className="bg-emerald-950/40 border-emerald-700 text-emerald-300">
                                  Cricket Toss
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                {getRiskLevelBadge(riskItem.riskLevel)}
                                <span className="text-amber-500 font-mono">₹{(riskItem.potentialLiability / 100).toFixed(2)}</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-2">
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Total Bets</div>
                                  <div className="text-xl font-semibold">{riskItem.totalBets}</div>
                                </div>
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                                  <div className="text-xl font-semibold">₹{(riskItem.totalAmount / 100).toFixed(2)}</div>
                                </div>
                                <div className="bg-card/40 p-3 rounded-md border border-border">
                                  <div className="text-sm text-muted-foreground mb-1">Player Count</div>
                                  <div className="text-xl font-semibold">{riskItem.playerCount}</div>
                                </div>
                              </div>
                              
                              <div className="rounded-md border">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Player</TableHead>
                                      <TableHead>Prediction</TableHead>
                                      <TableHead>Bet Amount</TableHead>
                                      <TableHead>Potential Win</TableHead>
                                      <TableHead>Risk Level</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {riskItem.players.map((player, playerIndex) => {
                                      // Calculate risk level for this player
                                      let playerRiskLevel = 'low';
                                      if (player.potentialWin > RISK_LEVELS.MEDIUM * 100) {
                                        playerRiskLevel = 'high';
                                      } else if (player.potentialWin > RISK_LEVELS.LOW * 100) {
                                        playerRiskLevel = 'medium';
                                      }
                                      
                                      return (
                                        <TableRow key={`${player.playerId}-${playerIndex}`}>
                                          <TableCell className="font-medium">{player.playerUsername}</TableCell>
                                          <TableCell>{player.prediction}</TableCell>
                                          <TableCell>₹{(player.betAmount / 100).toFixed(2)}</TableCell>
                                          <TableCell className="text-amber-500 font-mono">
                                            ₹{(player.potentialWin / 100).toFixed(2)}
                                          </TableCell>
                                          <TableCell>{getRiskLevelBadge(playerRiskLevel)}</TableCell>
                                        </TableRow>
                                      );
                                    })}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      ))}
                    </Accordion>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">No active risk data found for Cricket Toss games.</p>
                    <p className="text-sm text-muted-foreground mt-1">Players need to place bets for risk data to appear.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        {/* Risk Management Tips */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
                      Risk Management Tips
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="w-80">Important information to help you manage risk effectively.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500 mt-0.5" />
                <div>
                  <p className="font-medium">Low Risk (Green)</p>
                  <p className="text-sm text-muted-foreground">Potential liabilities under ₹1,000. Regular monitoring is sufficient.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ArrowDownUp className="h-5 w-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Medium Risk (Yellow)</p>
                  <p className="text-sm text-muted-foreground">Potential liabilities between ₹1,000 and ₹5,000. Consider hedging strategies.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <TrendingDown className="h-5 w-5 text-rose-500 mt-0.5" />
                <div>
                  <p className="font-medium">High Risk (Red)</p>
                  <p className="text-sm text-muted-foreground">Potential liabilities above ₹5,000. Immediate action recommended - consider limiting further bets.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}