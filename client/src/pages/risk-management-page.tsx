import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Coins, 
  Users, 
  Search, 
  Filter, 
  AlertTriangle,
  TrendingUp,
  ChevronUp,
  Settings,
  ChevronDown,
  Dices,
  DollarSign,
  Calculator,
  ShieldAlert,
  Activity
} from "lucide-react";

// Define types for our data
interface BettingStats {
  number: string;
  totalBets: number;
  totalAmount: number;
  potentialWinAmount: number;
  uniqueUsers: number;
  gameMode?: string; // Add gameMode to identify bet type (jodi, harf, odd-even, crossing)
}

export default function RiskManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("satamatka");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("number");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // 'asc' for numbers to show 00-99
  const [betTypeFilter, setBetTypeFilter] = useState<string>("all"); // Filter for Satamatka bet types
  
  // Risk level threshold states
  const [lowRiskThreshold, setLowRiskThreshold] = useState<number>(5000);
  const [mediumRiskThreshold, setMediumRiskThreshold] = useState<number>(20000);
  const [highRiskThreshold, setHighRiskThreshold] = useState<number>(50000);
  const [showRiskSettings, setShowRiskSettings] = useState<boolean>(false);
  
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;

  // Early return if not admin or subadmin
  if (!isAdmin && !isSubadmin) {
    return (
      <DashboardLayout title="Access Denied">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Fetch jantri stats
  const { data: jantriStats, isLoading: satamatkaLoading, error: satamatkaError } = useQuery<BettingStats[]>({
    queryKey: ['/api/jantri/stats', activeTab === 'satamatka'],
    enabled: activeTab === 'satamatka',
  });
  
  // Fetch cricket toss stats
  const { data: cricketStats, isLoading: cricketLoading, error: cricketError } = useQuery<BettingStats[]>({
    queryKey: ['/api/cricket-toss-stats', activeTab === 'cricket'],
    enabled: activeTab === 'cricket',
  });
  
  // Format currency in rupees
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount / 100); // Convert from paisa to rupees
  };
  
  // Handle column sorting
  const handleSort = (columnName: string) => {
    if (sortColumn === columnName) {
      // If already sorting by this column, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Start with ascending sort for the new column
      setSortColumn(columnName);
      setSortDirection('asc');
    }
  };
  
  // Determine risk level based on potential win amount and thresholds
  const getRiskLevel = (potentialWinAmount: number) => {
    if (potentialWinAmount > highRiskThreshold * 100) {
      return 'high';
    } else if (potentialWinAmount > mediumRiskThreshold * 100) {
      return 'medium';
    } else if (potentialWinAmount > lowRiskThreshold * 100) {
      return 'low';
    } else {
      return 'minimal';
    }
  };
  
  // Get appropriate risk color for the badge
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return 'bg-red-500/20 text-red-600 hover:bg-red-500/30';
      case 'medium':
        return 'bg-orange-500/20 text-orange-600 hover:bg-orange-500/30';
      case 'low':
        return 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30';
      default:
        return 'bg-green-500/20 text-green-600 hover:bg-green-500/30';
    }
  };
  
  // Calculate summary statistics
  const calculateSummary = () => {
    let totalBets = 0;
    let totalAmount = 0;
    let totalPotentialWin = 0;
    let totalUniqueUsers = new Set();
    
    if (activeTab === 'satamatka') {
      if (!jantriStats) {
        return { totalBets: 0, totalAmount: 0, totalPotentialWin: 0, totalUniqueUsers: 0 };
      }
      
      jantriStats.forEach(item => {
        totalBets += item.totalBets;
        totalAmount += item.totalAmount;
        totalPotentialWin += item.potentialWinAmount;
        // Note: uniqueUsers count might be duplicated across different numbers
        totalUniqueUsers.add(item.uniqueUsers);
      });
    } 
    else if (activeTab === 'cricket') {
      if (!cricketStats) {
        return { totalBets: 0, totalAmount: 0, totalPotentialWin: 0, totalUniqueUsers: 0 };
      }
      
      cricketStats.forEach(item => {
        totalBets += item.totalBets;
        totalAmount += item.totalAmount;
        totalPotentialWin += item.potentialWinAmount;
        // Note: uniqueUsers count might be duplicated across different numbers
        totalUniqueUsers.add(item.uniqueUsers);
      });
    }
    
    // Ensure we don't have negative values
    totalBets = Math.max(0, totalBets);
    totalAmount = Math.max(0, totalAmount);
    totalPotentialWin = Math.max(0, totalPotentialWin);
    const uniqueUsersCount = totalUniqueUsers instanceof Set ? totalUniqueUsers.size : 0;
    
    return { totalBets, totalAmount, totalPotentialWin, totalUniqueUsers: uniqueUsersCount };
  };

  const summary = calculateSummary();

  // Render the table based on active tab
  const renderTable = () => {
    if (activeTab === 'satamatka') {
      if (satamatkaLoading) {
        return (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        );
      }
      
      if (satamatkaError) {
        return (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Error loading Satamatka statistics. Please try again later.</p>
          </div>
        );
      }
      
      if (!jantriStats || jantriStats.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Dices className="h-8 w-8 mb-2" />
            <p>No data available for Satamatka numbers</p>
          </div>
        );
      }
      
      // Process the data
      const filteredData = jantriStats
        .filter(item => {
          // Apply search filter
          if (searchTerm && !item.number.includes(searchTerm)) {
            return false;
          }
          
          // Apply bet type filter
          if (betTypeFilter !== 'all' && item.gameMode !== betTypeFilter) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => {
          // Custom sort based on column and direction
          if (sortColumn === 'number') {
            return sortDirection === 'asc' 
              ? a.number.localeCompare(b.number)
              : b.number.localeCompare(a.number);
          } else if (sortColumn === 'gameMode') {
            const aMode = a.gameMode || '';
            const bMode = b.gameMode || '';
            return sortDirection === 'asc' 
              ? aMode.localeCompare(bMode)
              : bMode.localeCompare(aMode);
          } else {
            // For numerical columns
            const aValue = a[sortColumn as keyof BettingStats] as number;
            const bValue = b[sortColumn as keyof BettingStats] as number;
            
            if (sortDirection === 'asc') {
              return aValue - bValue;
            } else {
              return bValue - aValue;
            }
          }
        })
        .slice(0, 100); // Get top 100 results
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center">
                    Number 
                    {sortColumn === 'number' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                {betTypeFilter === 'all' && (
                  <TableHead 
                    className="cursor-pointer hover:text-primary"
                    onClick={() => handleSort('gameMode')}
                  >
                    <div className="flex items-center">
                      Bet Type
                      {sortColumn === 'gameMode' && (
                        sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                      )}
                    </div>
                  </TableHead>
                )}
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('totalBets')}
                >
                  <div className="flex items-center">
                    Bets 
                    {sortColumn === 'totalBets' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center">
                    Amount 
                    {sortColumn === 'totalAmount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('potentialWinAmount')}
                >
                  <div className="flex items-center">
                    Potential Payout
                    {sortColumn === 'potentialWinAmount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('uniqueUsers')}
                >
                  <div className="flex items-center">
                    Players
                    {sortColumn === 'uniqueUsers' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => {
                const riskLevel = getRiskLevel(item.potentialWinAmount);
                const riskColor = getRiskColor(riskLevel);
                
                return (
                  <TableRow key={`${item.number}-${item.gameMode}`}>
                    <TableCell className="font-medium">{item.number}</TableCell>
                    {betTypeFilter === 'all' && (
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.gameMode || 'standard'}
                        </Badge>
                      </TableCell>
                    )}
                    <TableCell>{item.totalBets}</TableCell>
                    <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                    <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                    <TableCell>{item.uniqueUsers}</TableCell>
                    <TableCell>
                      <Badge className={riskColor}>{riskLevel}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      );
    } 
    else if (activeTab === 'cricket') {
      if (cricketLoading) {
        return (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        );
      }
      
      if (cricketError) {
        return (
          <div className="flex flex-col items-center justify-center py-8 text-red-500">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p>Error loading Cricket Toss statistics. Please try again later.</p>
          </div>
        );
      }
      
      if (!cricketStats || cricketStats.length === 0) {
        return (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Activity className="h-8 w-8 mb-2" />
            <p>No data available for Cricket Toss games</p>
          </div>
        );
      }
      
      // Process the data
      const filteredData = cricketStats
        .filter(item => {
          // Apply search filter
          if (searchTerm && !item.number.includes(searchTerm)) {
            return false;
          }
          
          return true;
        })
        .sort((a, b) => {
          // Custom sort based on column and direction
          if (sortColumn === 'number') {
            return sortDirection === 'asc' 
              ? a.number.localeCompare(b.number)
              : b.number.localeCompare(a.number);
          } else {
            // For numerical columns
            const aValue = a[sortColumn as keyof BettingStats] as number;
            const bValue = b[sortColumn as keyof BettingStats] as number;
            
            if (sortDirection === 'asc') {
              return aValue - bValue;
            } else {
              return bValue - aValue;
            }
          }
        })
        .slice(0, 100); // Get top 100 results
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center">
                    Match/Outcome
                    {sortColumn === 'number' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('totalBets')}
                >
                  <div className="flex items-center">
                    Bets 
                    {sortColumn === 'totalBets' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('totalAmount')}
                >
                  <div className="flex items-center">
                    Amount 
                    {sortColumn === 'totalAmount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('potentialWinAmount')}
                >
                  <div className="flex items-center">
                    Potential Payout
                    {sortColumn === 'potentialWinAmount' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('uniqueUsers')}
                >
                  <div className="flex items-center">
                    Players
                    {sortColumn === 'uniqueUsers' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => {
                const riskLevel = getRiskLevel(item.potentialWinAmount);
                const riskColor = getRiskColor(riskLevel);
                
                return (
                  <TableRow key={item.number}>
                    <TableCell className="font-medium">{item.number}</TableCell>
                    <TableCell>{item.totalBets}</TableCell>
                    <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                    <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                    <TableCell>{item.uniqueUsers}</TableCell>
                    <TableCell>
                      <Badge className={riskColor}>{riskLevel}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>
      );
    }
  };

  return (
    <DashboardLayout title="Risk Management">
      <div className="space-y-6">
        {/* Summary statistics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Coins className="h-5 w-5 mr-2 text-amber-500" />
                Total Bets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBets}</div>
              <p className="text-sm text-muted-foreground">
                Active betting positions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-500" />
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.totalAmount)}</div>
              <p className="text-sm text-muted-foreground">
                Current betting volume
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-blue-500" />
                Potential Payout
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.totalPotentialWin)}</div>
              <p className="text-sm text-muted-foreground">
                Maximum potential liability
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                <Users className="h-5 w-5 mr-2 text-purple-500" />
                Active Players
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUniqueUsers}</div>
              <p className="text-sm text-muted-foreground">
                Players with active bets
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Risk Settings */}
        {showRiskSettings && (
          <Card className="mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center">
                <ShieldAlert className="h-5 w-5 mr-2 text-yellow-500" />
                Risk Threshold Settings
              </CardTitle>
              <CardDescription>
                Adjust the thresholds used to determine risk levels
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="low-risk">Low Risk Threshold (₹)</Label>
                  <span className="text-sm text-muted-foreground">{lowRiskThreshold}</span>
                </div>
                <Slider
                  id="low-risk"
                  min={1000}
                  max={20000}
                  step={1000}
                  value={[lowRiskThreshold]}
                  onValueChange={(value) => setLowRiskThreshold(value[0])}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground">
                  Amounts above this threshold will be marked as low risk. Default: ₹5,000
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="medium-risk">Medium Risk Threshold (₹)</Label>
                  <span className="text-sm text-muted-foreground">{mediumRiskThreshold}</span>
                </div>
                <Slider
                  id="medium-risk"
                  min={5000}
                  max={50000}
                  step={1000}
                  value={[mediumRiskThreshold]}
                  onValueChange={(value) => setMediumRiskThreshold(value[0])}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground">
                  Amounts above this threshold will be marked as medium risk. Default: ₹20,000
                </p>
              </div>
              
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="high-risk">High Risk Threshold (₹)</Label>
                  <span className="text-sm text-muted-foreground">{highRiskThreshold}</span>
                </div>
                <Slider
                  id="high-risk"
                  min={20000}
                  max={100000}
                  step={5000}
                  value={[highRiskThreshold]}
                  onValueChange={(value) => setHighRiskThreshold(value[0])}
                  className="py-4"
                />
                <p className="text-xs text-muted-foreground">
                  Amounts above this threshold will be marked as high risk. Default: ₹50,000
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2 text-primary" />
                  Betting Activity Monitor
                </CardTitle>
                <CardDescription>
                  Track betting patterns and identify high-risk positions
                </CardDescription>
              </div>
              
              <Button 
                variant="outline"
                size="sm"
                onClick={() => setShowRiskSettings(!showRiskSettings)}
                className="ml-2 gap-1"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Risk Settings</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="satamatka" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="satamatka" className="flex items-center space-x-2">
                  <Dices className="h-4 w-4" /> 
                  <span>Satamatka</span>
                </TabsTrigger>
                <TabsTrigger value="cricket" className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" /> 
                  <span>Cricket Toss</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="satamatka" className="mt-4">
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by number"
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  
                  <div className="flex-1 flex gap-2">
                    <div className="relative w-full sm:w-48">
                      <Filter className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Select 
                        value={betTypeFilter}
                        onValueChange={setBetTypeFilter}
                      >
                        <SelectTrigger className="pl-8">
                          <SelectValue placeholder="Filter by type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Bet Types</SelectItem>
                          <SelectItem value="jodi">Jodi</SelectItem>
                          <SelectItem value="harf">Harf</SelectItem>
                          <SelectItem value="odd-even">Odd-Even</SelectItem>
                          <SelectItem value="crossing">Crossing</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {renderTable()}
              </TabsContent>
              <TabsContent value="cricket" className="mt-4">
                {renderTable()}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 border-t px-6 py-4">
            <p className="text-sm text-muted-foreground order-2 sm:order-1">
              Showing top 100 results sorted by {sortColumn === 'totalBets' ? 'number of bets' : 
                sortColumn === 'totalAmount' ? 'bet amount' : 
                sortColumn === 'potentialWinAmount' ? 'potential win amount' : 
                sortColumn === 'uniqueUsers' ? 'unique users' :
                sortColumn === 'gameMode' ? 'game mode' :
                'number'}
            </p>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-yellow-600" />
              <span className="text-sm text-muted-foreground">High risk items require attention</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}