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

  // Extract cricket toss data (simplified mock for now)
  const processCricketTossData = () => {
    // This would be replaced with real API data
    return [
      {
        teamName: "India",
        totalBets: 145,
        totalAmount: 145000,
        potentialWinAmount: 261000,
        uniqueUsers: 85
      },
      {
        teamName: "Australia",
        totalBets: 120,
        totalAmount: 120000,
        potentialWinAmount: 216000,
        uniqueUsers: 72
      },
      {
        teamName: "England",
        totalBets: 110,
        totalAmount: 110000,
        potentialWinAmount: 198000,
        uniqueUsers: 65
      },
      {
        teamName: "New Zealand",
        totalBets: 92,
        totalAmount: 92000,
        potentialWinAmount: 165600,
        uniqueUsers: 54
      },
      {
        teamName: "South Africa",
        totalBets: 88,
        totalAmount: 88000,
        potentialWinAmount: 158400,
        uniqueUsers: 51
      }
    ].filter(team => {
      if (!searchTerm) return true;
      return team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => {
      const aValue = a[sortColumn as keyof TeamBettingStats];
      const bValue = b[sortColumn as keyof TeamBettingStats];
      
      if (sortDirection === 'asc') {
        return (aValue as number) - (bValue as number);
      } else {
        return (bValue as number) - (aValue as number);
      }
    });
  };

  // Extract sports match data (simplified mock for now)
  const processSportsData = () => {
    // This would be replaced with real API data
    return [
      {
        teamName: "Mumbai Indians",
        totalBets: 178,
        totalAmount: 178000,
        potentialWinAmount: 320400,
        uniqueUsers: 95
      },
      {
        teamName: "Chennai Super Kings",
        totalBets: 165,
        totalAmount: 165000,
        potentialWinAmount: 297000,
        uniqueUsers: 89
      },
      {
        teamName: "Royal Challengers Bangalore",
        totalBets: 142,
        totalAmount: 142000,
        potentialWinAmount: 255600,
        uniqueUsers: 78
      },
      {
        teamName: "Kolkata Knight Riders",
        totalBets: 136,
        totalAmount: 136000,
        potentialWinAmount: 244800,
        uniqueUsers: 74
      },
      {
        teamName: "Delhi Capitals",
        totalBets: 125,
        totalAmount: 125000,
        potentialWinAmount: 225000,
        uniqueUsers: 68
      }
    ].filter(team => {
      if (!searchTerm) return true;
      return team.teamName.toLowerCase().includes(searchTerm.toLowerCase());
    }).sort((a, b) => {
      const aValue = a[sortColumn as keyof TeamBettingStats];
      const bValue = b[sortColumn as keyof TeamBettingStats];
      
      if (sortDirection === 'asc') {
        return (aValue as number) - (bValue as number);
      } else {
        return (bValue as number) - (aValue as number);
      }
    });
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
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level
                  let riskLevel = "Low";
                  let riskColor = "bg-green-100 text-green-800";
                  
                  if (item.potentialWinAmount > 250000) {
                    riskLevel = "High";
                    riskColor = "bg-red-100 text-red-800";
                  } else if (item.potentialWinAmount > 150000) {
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
    } else {
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
                    No data available
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level
                  let riskLevel = "Low";
                  let riskColor = "bg-green-100 text-green-800";
                  
                  if (item.potentialWinAmount > 300000) {
                    riskLevel = "High";
                    riskColor = "bg-red-100 text-red-800";
                  } else if (item.potentialWinAmount > 200000) {
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Jantri Risk Management</h1>
        <p className="text-muted-foreground">
          Monitor betting patterns and identify high-risk bets for your assigned users
        </p>
      </div>
      
      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border border-primary/10 shadow-md bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Active Bets</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalBets}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                <Calculator className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-primary">
              <Activity className="h-4 w-4 mr-1" />
              <span className="font-medium">Active betting activity</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-green-500/10 shadow-md bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bet Amount</p>
                <p className="text-2xl font-bold text-foreground">{formatAmount(summary.totalAmount)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center text-green-500">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-500">
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="font-medium">Total wagers placed</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-red-500/10 shadow-md bg-gradient-to-br from-red-500/5 to-red-500/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Potential Payout</p>
                <p className="text-2xl font-bold text-foreground">{formatAmount(summary.totalPotentialWin)}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-500">
              <ShieldAlert className="h-4 w-4 mr-1" />
              <span className="font-medium">Maximum liability</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border border-blue-500/10 shadow-md bg-gradient-to-br from-blue-500/5 to-blue-500/10">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalUniqueUsers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500">
                <Users className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-blue-500">
              <Info className="h-4 w-4 mr-1" />
              <span className="font-medium">Distinct players betting</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle>Betting Analysis</CardTitle>
              <CardDescription>
                Top 100 most betted items with their betting statistics
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search..."
                  className="pl-8 w-full"
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="satamatka" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="satamatka">Satamatka</TabsTrigger>
              <TabsTrigger value="cricket">Cricket Toss</TabsTrigger>
              <TabsTrigger value="sports">Sports Match</TabsTrigger>
            </TabsList>
            <TabsContent value="satamatka">
              {renderTable()}
            </TabsContent>
            <TabsContent value="cricket">
              {renderTable()}
            </TabsContent>
            <TabsContent value="sports">
              {renderTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t px-6 py-3">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <BarChart className="h-4 w-4" />
              <span>Only showing data for users assigned to you</span>
            </div>
            <div>
              Updated {new Date().toLocaleTimeString()}
            </div>
          </div>
        </CardFooter>
      </Card>
    </DashboardLayout>
  );
}