import { useState, useEffect } from "react";
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
import { formatDistance } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowDown, 
  ArrowUp, 
  Coins, 
  Users, 
  Search, 
  Filter, 
  AlertTriangle,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Dices,
  DollarSign,
  Calculator,
  Info,
  BarChart,
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

interface JantriGameStats {
  marketId: number;
  marketName: string;
  numbers: BettingStats[];
}

interface TeamBettingStats {
  teamName: string;
  totalBets: number;
  totalAmount: number;
  potentialWinAmount: number;
  uniqueUsers: number;
}

interface TeamMatchStats {
  matchId: number;
  matchName: string;
  teams: TeamBettingStats[];
}

export default function RiskManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("satamatka");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortColumn, setSortColumn] = useState("totalAmount");
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [betTypeFilter, setBetTypeFilter] = useState<string>("all"); // Filter for Satamatka bet types
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

  // Query for jantri statistics (Satamatka)
  const { data: jantriStats, isLoading: jantriLoading } = useQuery<JantriGameStats[]>({
    queryKey: ["/api/jantri/stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
  });

  // Query for cricket toss statistics
  const { data: cricketTossStats, isLoading: cricketLoading } = useQuery<TeamMatchStats[]>({
    queryKey: ["/api/cricket-toss/stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
  });

  // Query for sports match statistics
  const { data: sportsStats, isLoading: sportsLoading } = useQuery<TeamMatchStats[]>({
    queryKey: ["/api/sports/stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
  });

  // Function to format currency amounts
  const formatAmount = (amount: number) => {
    return "₹" + (amount / 100).toFixed(2);
  };

  // Process and flatten the numbers data from all markets for table display
  const processJantriData = () => {
    if (!jantriStats || jantriStats.length === 0) return [];
    
    // Combine all numbers from all markets
    const combinedData: Record<string, BettingStats> = {};
    
    jantriStats.forEach(market => {
      market.numbers.forEach(numStat => {
        if (!combinedData[numStat.number]) {
          combinedData[numStat.number] = { ...numStat };
        } else {
          combinedData[numStat.number].totalBets += numStat.totalBets;
          combinedData[numStat.number].totalAmount += numStat.totalAmount;
          combinedData[numStat.number].potentialWinAmount += numStat.potentialWinAmount;
          combinedData[numStat.number].uniqueUsers += numStat.uniqueUsers;
        }
      });
    });
    
    // Convert to array and sort
    return Object.values(combinedData)
      .filter(stat => {
        // Filter by search term if present
        if (!searchTerm) return true;
        return stat.number.includes(searchTerm);
      })
      .sort((a, b) => {
        // Sort based on the selected column
        const aValue = a[sortColumn as keyof BettingStats];
        const bValue = b[sortColumn as keyof BettingStats];
        
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      })
      .slice(0, 100); // Get top 100 results
  };

  // Process cricket toss data from API
  const processCricketTossData = () => {
    if (!cricketTossStats || cricketTossStats.length === 0) {
      // If no cricket toss data, show demo data if in development
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            teamName: "India",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0
          },
          {
            teamName: "Australia",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0
          }
        ];
      }
      return [];
    }
    
    // Flatten all teams from all matches
    const allTeams: TeamBettingStats[] = [];
    
    cricketTossStats.forEach(match => {
      match.teams.forEach(team => {
        allTeams.push(team);
      });
    });
    
    // Filter and sort the teams
    return allTeams
      .filter(team => {
        if (!searchTerm) return true;
        return team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const aValue = a[sortColumn as keyof TeamBettingStats];
        const bValue = b[sortColumn as keyof TeamBettingStats];
        
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      })
      .slice(0, 100); // Get top 100 results
  };

  // Process sports match data from API
  const processSportsData = () => {
    if (!sportsStats || sportsStats.length === 0) {
      // If no sports data, show demo data if in development
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            teamName: "Mumbai Indians",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0
          },
          {
            teamName: "Chennai Super Kings",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0
          }
        ];
      }
      return [];
    }
    
    // Flatten all teams from all matches
    const allTeams: TeamBettingStats[] = [];
    
    sportsStats.forEach(match => {
      match.teams.forEach(team => {
        allTeams.push(team);
      });
    });
    
    // Filter and sort the teams
    return allTeams
      .filter(team => {
        if (!searchTerm) return true;
        return team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
      })
      .sort((a, b) => {
        const aValue = a[sortColumn as keyof TeamBettingStats];
        const bValue = b[sortColumn as keyof TeamBettingStats];
        
        if (sortDirection === 'asc') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      })
      .slice(0, 100); // Get top 100 results
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Calculate summary statistics
  const calculateSummary = () => {
    let totalBets = 0;
    let totalAmount = 0;
    let totalPotentialWin = 0;
    let totalUniqueUsers = 0;
    
    if (activeTab === "satamatka") {
      const data = processJantriData();
      data.forEach(item => {
        totalBets += item.totalBets;
        totalAmount += item.totalAmount;
        totalPotentialWin += item.potentialWinAmount;
        totalUniqueUsers += item.uniqueUsers;
      });
    } else if (activeTab === "cricket") {
      const data = processCricketTossData();
      data.forEach(item => {
        totalBets += item.totalBets;
        totalAmount += item.totalAmount;
        totalPotentialWin += item.potentialWinAmount;
        totalUniqueUsers += item.uniqueUsers;
      });
    } else if (activeTab === "sports") {
      const data = processSportsData();
      data.forEach(item => {
        totalBets += item.totalBets;
        totalAmount += item.totalAmount;
        totalPotentialWin += item.potentialWinAmount;
        totalUniqueUsers += item.uniqueUsers;
      });
    }
    
    return { totalBets, totalAmount, totalPotentialWin, totalUniqueUsers };
  };

  const summary = calculateSummary();

  // Render the table based on active tab
  const renderTable = () => {
    if (activeTab === "satamatka") {
      const data = processJantriData();
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[80px]">Number</TableHead>
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
                    Potential Win 
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
                    Users 
                    {sortColumn === 'uniqueUsers' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {jantriLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      "No data available"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level
                  let riskLevel = "Low";
                  let riskColor = "bg-green-100 text-green-800";
                  
                  if (item.potentialWinAmount > 50000) {
                    riskLevel = "High";
                    riskColor = "bg-red-100 text-red-800";
                  } else if (item.potentialWinAmount > 20000) {
                    riskLevel = "Medium";
                    riskColor = "bg-yellow-100 text-yellow-800";
                  }
                  
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
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      );
    } else if (activeTab === "cricket") {
      const data = processCricketTossData();
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Team</TableHead>
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
                    Potential Win 
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
                    Users 
                    {sortColumn === 'uniqueUsers' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {cricketLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      "No data available"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level
                  let riskLevel = "Low";
                  let riskColor = "bg-green-100 text-green-800";
                  
                  if (item.potentialWinAmount > 50000) {
                    riskLevel = "High";
                    riskColor = "bg-red-100 text-red-800";
                  } else if (item.potentialWinAmount > 20000) {
                    riskLevel = "Medium";
                    riskColor = "bg-yellow-100 text-yellow-800";
                  }
                  
                  return (
                    <TableRow key={item.teamName}>
                      <TableCell className="font-medium">{item.teamName}</TableCell>
                      <TableCell>{item.totalBets}</TableCell>
                      <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                      <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                      <TableCell>{item.uniqueUsers}</TableCell>
                      <TableCell>
                        <Badge className={riskColor}>{riskLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      );
    } else if (activeTab === "sports") {
      const data = processSportsData();
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead>Team</TableHead>
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
                    Potential Win 
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
                    Users 
                    {sortColumn === 'uniqueUsers' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    {sportsLoading ? (
                      <div className="flex justify-center items-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      "No data available"
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level
                  let riskLevel = "Low";
                  let riskColor = "bg-green-100 text-green-800";
                  
                  if (item.potentialWinAmount > 50000) {
                    riskLevel = "High";
                    riskColor = "bg-red-100 text-red-800";
                  } else if (item.potentialWinAmount > 20000) {
                    riskLevel = "Medium";
                    riskColor = "bg-yellow-100 text-yellow-800";
                  }
                  
                  return (
                    <TableRow key={item.teamName}>
                      <TableCell className="font-medium">{item.teamName}</TableCell>
                      <TableCell>{item.totalBets}</TableCell>
                      <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                      <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                      <TableCell>{item.uniqueUsers}</TableCell>
                      <TableCell>
                        <Badge className={riskColor}>{riskLevel}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
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
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bets
              </CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalBets}</div>
              <p className="text-xs text-muted-foreground">
                Across all {activeTab} games
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Bet Amount
              </CardTitle>
              <Coins className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatAmount(summary.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                Across all {activeTab} games
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Potential Payout
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{formatAmount(summary.totalPotentialWin)}</div>
              <p className="text-xs text-muted-foreground">
                Maximum liability
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Players
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalUniqueUsers}</div>
              <p className="text-xs text-muted-foreground">
                Unique players with active bets
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Tabs for different game types */}
        <Card>
          <CardHeader>
            <div className="flex flex-row justify-between items-center">
              <CardTitle>Betting Analysis</CardTitle>
              <div className="flex space-x-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search..."
                    className="pl-8 w-[200px]"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
              </div>
            </div>
            <CardDescription>
              Monitor and analyze betting patterns to manage risk effectively.
              <div className="mt-2 flex space-x-4">
                <div className="flex items-center space-x-1">
                  <Badge className="bg-green-100 text-green-800">Low</Badge>
                  <span className="text-xs">Up to ₹200</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
                  <span className="text-xs">₹200-₹500</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge className="bg-red-100 text-red-800">High</Badge>
                  <span className="text-xs">Over ₹500</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="satamatka" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="satamatka" className="flex items-center space-x-2">
                  <Dices className="h-4 w-4" /> 
                  <span>Satamatka</span>
                </TabsTrigger>
                <TabsTrigger value="cricket" className="flex items-center space-x-2">
                  <Activity className="h-4 w-4" /> 
                  <span>Cricket Toss</span>
                </TabsTrigger>
                <TabsTrigger value="sports" className="flex items-center space-x-2">
                  <BarChart className="h-4 w-4" /> 
                  <span>Sports</span>
                </TabsTrigger>
              </TabsList>
              <TabsContent value="satamatka" className="mt-4">
                {renderTable()}
              </TabsContent>
              <TabsContent value="cricket" className="mt-4">
                {renderTable()}
              </TabsContent>
              <TabsContent value="sports" className="mt-4">
                {renderTable()}
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing top 100 results by {sortColumn === 'totalBets' ? 'number of bets' : 
                sortColumn === 'totalAmount' ? 'bet amount' : 
                sortColumn === 'potentialWinAmount' ? 'potential win amount' : 
                'unique users'}
            </p>
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <span className="text-sm text-muted-foreground">High risk items require attention</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}