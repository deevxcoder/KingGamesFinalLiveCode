import React, { useState, useEffect } from "react";
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
  Settings,
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
  matchId?: number;      // Added to track which match this team belongs to
  matchName?: string;    // Added to show match name
  opponentTeam?: string; // Added to show opponent team
  isDraw?: boolean;      // Flag to identify if this is a draw option
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

  // Query for jantri statistics (Satamatka)
  const { data: jantriStats, isLoading: jantriLoading, error: jantriError } = useQuery<JantriGameStats[]>({
    queryKey: ["/api/jantri/stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Query for cricket toss statistics
  const { data: cricketTossStats, isLoading: cricketLoading, error: cricketError } = useQuery<TeamMatchStats[]>({
    queryKey: ["/api/cricket-toss-stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Query for sports match statistics
  const { data: sportsStats, isLoading: sportsLoading, error: sportsError } = useQuery<TeamMatchStats[]>({
    queryKey: ["/api/sports/stats", isAdmin ? "admin" : `subadmin-${user?.id}`],
    enabled: !!user && (isAdmin || isSubadmin),
    retry: 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false
  });

  // Function to format currency amounts
  const formatAmount = (amount: number) => {
    return "₹" + (amount / 100).toFixed(2);
  };
  
  // Function to determine risk level based on potential win amount
  const calculateRiskLevel = (potentialWinAmount: number) => {
    let riskLevel = "None";
    let riskColor = "bg-gray-100 text-gray-800";
    
    if (potentialWinAmount > highRiskThreshold) {
      riskLevel = "High";
      riskColor = "bg-red-100 text-red-800";
    } else if (potentialWinAmount > mediumRiskThreshold) {
      riskLevel = "Medium";
      riskColor = "bg-yellow-100 text-yellow-800";
    } else if (potentialWinAmount > lowRiskThreshold) {
      riskLevel = "Low";
      riskColor = "bg-green-100 text-green-800";
    }
    
    return { riskLevel, riskColor };
  };

  // Process and flatten the numbers data from all markets for table display
  const processJantriData = () => {
    if (!jantriStats || jantriStats.length === 0) return [];
    
    // Combine all numbers from all markets
    const combinedData: Record<string, BettingStats> = {};
    
    // If we're showing a specific bet type and should display all numbers 00-99
    if (betTypeFilter !== "all") {
      // Create a map of all numbers 00-99 with the selected bet type
      for (let i = 0; i < 100; i++) {
        const numberStr = i.toString().padStart(2, "0");
        combinedData[numberStr] = {
          number: numberStr,
          totalBets: 0,
          totalAmount: 0,
          potentialWinAmount: 0,
          uniqueUsers: 0,
          gameMode: betTypeFilter // Set the game mode to the selected filter
        };
      }
    }
    
    jantriStats.forEach(market => {
      market.numbers.forEach(numStat => {
        const number = numStat.number;
        const gameMode = numStat.gameMode;
        
        // If filtering by bet type, only consider stats for the selected bet type
        if (betTypeFilter !== "all" && gameMode !== betTypeFilter) {
          return; // Skip this entry if it doesn't match the filter
        }
        
        if (!combinedData[number]) {
          combinedData[number] = { ...numStat };
        } else {
          // For "all" filter, accumulate stats across bet types
          if (betTypeFilter === "all") {
            // Add values to existing stats
            combinedData[number].totalBets += numStat.totalBets;
            combinedData[number].totalAmount += numStat.totalAmount;
            combinedData[number].potentialWinAmount += numStat.potentialWinAmount;
            combinedData[number].uniqueUsers += numStat.uniqueUsers;
            
            // Update gameMode if this entry has more bets for this number than the existing one
            if (numStat.totalBets > combinedData[number].totalBets && gameMode) {
              combinedData[number].gameMode = gameMode;
            }
          } else if (gameMode === betTypeFilter) {
            // For specific bet type, only accumulate matching bet type stats
            combinedData[number].totalBets += numStat.totalBets;
            combinedData[number].totalAmount += numStat.totalAmount;
            combinedData[number].potentialWinAmount += numStat.potentialWinAmount;
            combinedData[number].uniqueUsers += numStat.uniqueUsers;
          }
        }
      });
    });
    
    // Convert to array and apply search filter
    return Object.values(combinedData)
      .filter(stat => {
        // Filter by search term if present
        if (!searchTerm) return true;
        return stat.number.includes(searchTerm);
      })
      .sort((a, b) => {
        // Handle different types of sorting based on the column
        if (sortColumn === "number") {
          // If sorting by number, always sort numbers from 00 to 99
          return a.number.localeCompare(b.number);
        } else if (sortColumn === "gameMode") {
          // For gameMode, we need to use string comparison
          const aMode = a.gameMode || "";
          const bMode = b.gameMode || "";
          
          if (sortDirection === 'asc') {
            return aMode.localeCompare(bMode);
          } else {
            return bMode.localeCompare(aMode);
          }
        } else {
          // For numerical columns, use numeric comparison
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
  };

  // Process cricket toss data from API
  const processCricketTossData = () => {
    if (!cricketTossStats || cricketTossStats.length === 0) {
      // Return empty array when no data is available
      return [];
    }
    
    // Enhanced teams with match information and opponents
    const enhancedTeams: TeamBettingStats[] = [];
    
    cricketTossStats.forEach(match => {
      // Skip if there are not exactly 2 teams in a match
      if (match.teams.length !== 2) return;
      
      // Prepare both teams with match information and their opponent
      const team1 = {
        ...match.teams[0],
        matchId: match.matchId,
        matchName: match.matchName,
        opponentTeam: match.teams[1].teamName
      };
      
      const team2 = {
        ...match.teams[1],
        matchId: match.matchId,
        matchName: match.matchName,
        opponentTeam: match.teams[0].teamName
      };
      
      enhancedTeams.push(team1, team2);
    });
    
    // Filter and sort the teams
    return enhancedTeams
      .filter(team => {
        if (!searchTerm) return true;
        
        // Search by team name, match name, or opponent
        return (
          team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.matchName && team.matchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (team.opponentTeam && team.opponentTeam.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
      .sort((a, b) => {
        // First sort by matchId to group teams from the same match
        if (sortColumn !== 'matchId' && a.matchId !== b.matchId) {
          return a.matchId! - b.matchId!;
        }
        
        // Then apply the selected sorting
        if (sortColumn === 'teamName' || sortColumn === 'opponentTeam' || sortColumn === 'matchName') {
          const aStr = String(a[sortColumn as keyof TeamBettingStats] || '');
          const bStr = String(b[sortColumn as keyof TeamBettingStats] || '');
          return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        } else {
          const aValue = a[sortColumn as keyof TeamBettingStats] as number;
          const bValue = b[sortColumn as keyof TeamBettingStats] as number;
          
          if (sortDirection === 'asc') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
        }
      })
      .slice(0, 100); // Get top 100 results
  };

  // Process sports match data from API
  const processSportsData = () => {
    if (!sportsStats || sportsStats.length === 0) {
      // Return empty array when no data is available
      return [];
    }
    
    // Enhanced teams with match information and opponents
    const enhancedTeams: TeamBettingStats[] = [];
    
    sportsStats.forEach(match => {
      // Skip if there are not exactly 2 teams in a match
      if (match.teams.length < 2) return;
      
      // Prepare both teams with match information and their opponent
      const team1 = {
        ...match.teams[0],
        matchId: match.matchId,
        matchName: match.matchName,
        opponentTeam: match.teams[1].teamName
      };
      
      const team2 = {
        ...match.teams[1],
        matchId: match.matchId,
        matchName: match.matchName,
        opponentTeam: match.teams[0].teamName
      };
      
      // Add a draw option for sports matches
      const drawOption: TeamBettingStats = {
        teamName: "Draw",
        totalBets: match.teams.length > 2 ? (match.teams[2]?.totalBets || 0) : 0,
        totalAmount: match.teams.length > 2 ? (match.teams[2]?.totalAmount || 0) : 0,
        potentialWinAmount: match.teams.length > 2 ? (match.teams[2]?.potentialWinAmount || 0) : 0,
        uniqueUsers: match.teams.length > 2 ? (match.teams[2]?.uniqueUsers || 0) : 0,
        matchId: match.matchId,
        matchName: match.matchName,
        isDraw: true
      };
      
      enhancedTeams.push(team1, team2, drawOption);
    });
    
    // Filter and sort the teams
    return enhancedTeams
      .filter(team => {
        if (!searchTerm) return true;
        
        // Search by team name, match name, or opponent
        return (
          team.teamName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (team.matchName && team.matchName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (team.opponentTeam && team.opponentTeam.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      })
      .sort((a, b) => {
        // First sort by matchId to group teams from the same match
        if (sortColumn !== 'matchId' && a.matchId !== b.matchId) {
          return a.matchId! - b.matchId!;
        }
        
        // Then apply the selected sorting
        if (sortColumn === 'teamName' || sortColumn === 'opponentTeam' || sortColumn === 'matchName') {
          const aStr = String(a[sortColumn as keyof TeamBettingStats] || '');
          const bStr = String(b[sortColumn as keyof TeamBettingStats] || '');
          return sortDirection === 'asc' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
        } else {
          const aValue = a[sortColumn as keyof TeamBettingStats] as number;
          const bValue = b[sortColumn as keyof TeamBettingStats] as number;
          
          if (sortDirection === 'asc') {
            return aValue - bValue;
          } else {
            return bValue - aValue;
          }
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
      // For Satamatka, loop through all markets to get the raw data
      // This ensures we include all potential payouts even with filters
      if (jantriStats && jantriStats.length > 0) {
        jantriStats.forEach(market => {
          market.numbers.forEach(numStat => {
            totalBets += numStat.totalBets;
            totalAmount += numStat.totalAmount;
            totalPotentialWin += numStat.potentialWinAmount;
            
            // We don't add uniqueUsers directly as they could be duplicated
            // across numbers, so we handle this separately
          });
          
          // Add unique users from the market-level data
          // This is more accurate than summing per-number unique users
          totalUniqueUsers = Math.max(totalUniqueUsers, market.totalUniqueUsers || 0);
        });
      } else {
        // Fallback to the processed data if needed
        const data = processJantriData();
        data.forEach(item => {
          totalBets += item.totalBets;
          totalAmount += item.totalAmount;
          totalPotentialWin += item.potentialWinAmount;
          totalUniqueUsers += item.uniqueUsers;
        });
      }
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
    
    // Ensure we don't have negative values
    totalBets = Math.max(0, totalBets);
    totalAmount = Math.max(0, totalAmount);
    totalPotentialWin = Math.max(0, totalPotentialWin);
    totalUniqueUsers = Math.max(0, totalUniqueUsers);
    
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
                <TableHead 
                  className="w-[80px] cursor-pointer hover:text-primary"
                  onClick={() => handleSort('number')}
                >
                  <div className="flex items-center">
                    Number
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
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('gameMode')}
                >
                  <div className="flex items-center">
                    {betTypeFilter === "all" ? "All Bet Types" : (
                      <div className="flex items-center">
                        <span className="capitalize">{betTypeFilter}</span>
                        <Filter className="ml-1 h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    {sortColumn === 'gameMode' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead>Risk Level</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jantriLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : jantriError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-red-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      <p>Error loading Satamatka statistics. Please try again later.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4">
                    No data available for Satamatka games
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item) => {
                  // Calculate risk level using our helper function
                  const { riskLevel, riskColor } = calculateRiskLevel(item.potentialWinAmount);
                  
                  return (
                    <TableRow key={item.number}>
                      <TableCell className="font-medium">{item.number}</TableCell>
                      <TableCell>{item.totalBets}</TableCell>
                      <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                      <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                      <TableCell>{item.uniqueUsers}</TableCell>
                      <TableCell>
                        {betTypeFilter === "all" ? (
                          // When all bet types are shown, display "All" for combined data
                          <Badge variant="outline">
                            All
                          </Badge>
                        ) : (
                          // When a specific bet type is selected, show that type consistently
                          <Badge variant="outline" className="capitalize">
                            {betTypeFilter}
                          </Badge>
                        )}
                      </TableCell>
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
      let currentMatchId: number | null = null;
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('teamName')}
                >
                  <div className="flex items-center">
                    Team
                    {sortColumn === 'teamName' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('opponentTeam')}
                >
                  <div className="flex items-center">
                    Opponent
                    {sortColumn === 'opponentTeam' && (
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
              {cricketLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : cricketError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-red-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      <p>Error loading Cricket Toss statistics. Please try again later.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No data available for Cricket Toss games
                  </TableCell>
                </TableRow>
              ) : (
                data.map((item, index) => {
                  // Calculate risk level using shared function
                  const { riskLevel, riskColor } = calculateRiskLevel(item.potentialWinAmount);
                  
                  // Determine if this is the start of a new match group
                  const isNewMatch = currentMatchId !== item.matchId;
                  currentMatchId = item.matchId || null;
                  
                  // Calculate if this is the second team in a match (for styling alternating teams)
                  const isSecondTeamInMatch = index % 2 === 1;
                  
                  // Use two separate returns to avoid fragment key issue
                  return isNewMatch ? (
                    <>
                      {/* Match header row */}
                      <TableRow 
                        key={`match-header-${item.matchId}`} 
                        className="bg-muted/30"
                      >
                        <TableCell colSpan={7} className="py-1">
                          <div className="text-sm font-medium flex items-center">
                            <Activity className="mr-2 h-4 w-4 text-primary" />
                            {item.matchName || "Cricket Toss Match"}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Team row with highlight for odd/even teams */}
                      <TableRow 
                        key={`${item.matchId}-${item.teamName}`}
                        className={isSecondTeamInMatch ? "bg-accent/10" : ""}
                      >
                        <TableCell className="font-medium">{item.teamName}</TableCell>
                        <TableCell>
                          {item.opponentTeam ? (
                            <Badge variant="outline">{item.opponentTeam}</Badge>
                          ) : "N/A"}
                        </TableCell>
                        <TableCell>{item.totalBets}</TableCell>
                        <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                        <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                        <TableCell>{item.uniqueUsers}</TableCell>
                        <TableCell>
                          <Badge className={riskColor}>{riskLevel}</Badge>
                        </TableCell>
                      </TableRow>
                    </>
                  ) : (
                    // Just the team row for subsequent teams in a match
                    <TableRow 
                      key={`${item.matchId}-${item.teamName}`}
                      className={isSecondTeamInMatch ? "bg-accent/10" : ""}
                    >
                      <TableCell className="font-medium">{item.teamName}</TableCell>
                      <TableCell>
                        {item.opponentTeam ? (
                          <Badge variant="outline">{item.opponentTeam}</Badge>
                        ) : "N/A"}
                      </TableCell>
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
      let currentMatchId: number | null = null;
      
      return (
        <ScrollArea className="h-[600px]">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('teamName')}
                >
                  <div className="flex items-center">
                    Team/Outcome
                    {sortColumn === 'teamName' && (
                      sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                    )}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:text-primary"
                  onClick={() => handleSort('opponentTeam')}
                >
                  <div className="flex items-center">
                    Opponent
                    {sortColumn === 'opponentTeam' && (
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
              {sportsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    <div className="flex justify-center items-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : sportsError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4 text-red-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-6 w-6" />
                      <p>Error loading Sports statistics. Please try again later.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
                    No data available for Sports matches
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {data.map((item, index) => {
                    // Calculate risk level using shared function
                    const { riskLevel, riskColor } = calculateRiskLevel(item.potentialWinAmount);
                    const isDrawOption = item.isDraw === true;
                    
                    // Determine if this is the start of a new match group
                    const isNewMatch = currentMatchId !== item.matchId;
                    currentMatchId = item.matchId || null;
                    
                    // Calculate if this is the second team in a match (for styling alternating teams)
                    const isSecondTeam = index % 2 === 1;
                    
                    if (isNewMatch) {
                      return (
                        <React.Fragment key={`match-group-${item.matchId}-${index}`}>
                          {/* Match header row */}
                          <TableRow 
                            key={`match-header-${item.matchId}`} 
                            className="bg-muted/30"
                          >
                            <TableCell colSpan={7} className="py-1">
                              <div className="text-sm font-medium flex items-center">
                                <BarChart className="mr-2 h-4 w-4 text-primary" />
                                {item.matchName || "Sports Match"}
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Team row with formatting based on whether it's a team or draw option */}
                          <TableRow 
                            key={`${item.matchId}-${item.teamName}`}
                            className={isDrawOption ? "bg-muted/20 border-t border-dashed border-muted" : ""}
                          >
                            <TableCell className="font-medium">
                              {isDrawOption ? (
                                <div className="flex items-center">
                                  <Badge variant="secondary" className="mr-2">Draw</Badge>
                                </div>
                              ) : (
                                item.teamName
                              )}
                            </TableCell>
                            <TableCell>
                              {isDrawOption ? (
                                <span className="text-sm text-muted-foreground">No Winner</span>
                              ) : item.opponentTeam ? (
                                <Badge variant="outline">{item.opponentTeam}</Badge>
                              ) : "N/A"}
                            </TableCell>
                            <TableCell>{item.totalBets}</TableCell>
                            <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                            <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                            <TableCell>{item.uniqueUsers}</TableCell>
                            <TableCell>
                              <Badge className={riskColor}>{riskLevel}</Badge>
                            </TableCell>
                          </TableRow>
                        </React.Fragment>
                      );
                    } else {
                      // For subsequent teams or draw options in a match
                      return (
                        <TableRow 
                          key={`${item.matchId}-${item.teamName}-${index}`}
                          className={isDrawOption 
                            ? "bg-muted/20 border-t border-dashed border-muted" 
                            : (isSecondTeam ? "bg-accent/10" : "")}
                        >
                          <TableCell className="font-medium">
                            {isDrawOption ? (
                              <div className="flex items-center">
                                <Badge variant="secondary" className="mr-2">Draw</Badge>
                              </div>
                            ) : (
                              item.teamName
                            )}
                          </TableCell>
                          <TableCell>
                            {isDrawOption ? (
                              <span className="text-sm text-muted-foreground">No Winner</span>
                            ) : item.opponentTeam ? (
                              <Badge variant="outline">{item.opponentTeam}</Badge>
                            ) : "N/A"}
                          </TableCell>
                          <TableCell>{item.totalBets}</TableCell>
                          <TableCell>{formatAmount(item.totalAmount)}</TableCell>
                          <TableCell>{formatAmount(item.potentialWinAmount)}</TableCell>
                          <TableCell>{item.uniqueUsers}</TableCell>
                          <TableCell>
                            <Badge className={riskColor}>{riskLevel}</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    }
                  })}
                </>
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
              <div className="mt-2 flex flex-col space-y-3">
                {/* Responsive risk indicator layout */}
                <div className="flex flex-wrap gap-2 mb-2">
                  <div className="flex items-center gap-1 mr-2">
                    <Badge className="bg-gray-100 text-gray-800 whitespace-nowrap">None</Badge>
                    <span className="text-xs whitespace-nowrap">Up to ₹{(lowRiskThreshold / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Badge className="bg-green-100 text-green-800 whitespace-nowrap">Low</Badge>
                    <span className="text-xs whitespace-nowrap">₹{(lowRiskThreshold / 100).toFixed(2)}-₹{(mediumRiskThreshold / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Badge className="bg-yellow-100 text-yellow-800 whitespace-nowrap">Medium</Badge>
                    <span className="text-xs whitespace-nowrap">₹{(mediumRiskThreshold / 100).toFixed(2)}-₹{(highRiskThreshold / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-1 mr-2">
                    <Badge className="bg-red-100 text-red-800 whitespace-nowrap">High</Badge>
                    <span className="text-xs whitespace-nowrap">Over ₹{(highRiskThreshold / 100).toFixed(2)}</span>
                  </div>
                </div>
                <div className="flex justify-end mt-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowRiskSettings(!showRiskSettings)}
                    className="text-xs flex items-center"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    {showRiskSettings ? "Hide Settings" : "Customize Thresholds"}
                  </Button>
                </div>
                
                {showRiskSettings && (
                  <div className="bg-muted/20 p-3 rounded-md space-y-3 mt-4">
                    <h4 className="text-sm font-medium mb-2">Risk Threshold Settings</h4>
                    
                    {/* Low Risk Threshold Slider */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-green-100 text-green-800 text-xs">Low</Badge> 
                        <Label htmlFor="low-threshold" className="text-xs">
                          Risk Threshold: <span className="font-semibold">₹{(lowRiskThreshold / 100).toFixed(2)}</span>
                        </Label>
                      </div>
                      <Slider 
                        id="low-threshold"
                        min={1000} 
                        max={mediumRiskThreshold - 1000} 
                        step={1000}
                        value={[lowRiskThreshold]} 
                        onValueChange={(values: number[]) => setLowRiskThreshold(values[0])}
                      />
                    </div>
                    
                    {/* Medium Risk Threshold Slider */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-yellow-100 text-yellow-800 text-xs">Medium</Badge>
                        <Label htmlFor="medium-threshold" className="text-xs">
                          Risk Threshold: <span className="font-semibold">₹{(mediumRiskThreshold / 100).toFixed(2)}</span>
                        </Label>
                      </div>
                      <Slider 
                        id="medium-threshold"
                        min={lowRiskThreshold + 1000} 
                        max={highRiskThreshold - 1000} 
                        step={1000}
                        value={[mediumRiskThreshold]} 
                        onValueChange={(values: number[]) => {
                          setMediumRiskThreshold(values[0]);
                          // Ensure lowRiskThreshold is at least 1000 less than mediumRiskThreshold
                          if (lowRiskThreshold > values[0] - 1000) {
                            setLowRiskThreshold(values[0] - 1000);
                          }
                        }}
                      />
                    </div>
                    
                    {/* High Risk Threshold Slider */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-red-100 text-red-800 text-xs">High</Badge>
                        <Label htmlFor="high-threshold" className="text-xs">
                          Risk Threshold: <span className="font-semibold">₹{(highRiskThreshold / 100).toFixed(2)}</span>
                        </Label>
                      </div>
                      <Slider 
                        id="high-threshold"
                        min={mediumRiskThreshold + 1000} 
                        max={200000} 
                        step={1000}
                        value={[highRiskThreshold]} 
                        onValueChange={(values: number[]) => {
                          setHighRiskThreshold(values[0]);
                          // Ensure mediumRiskThreshold is at least 1000 less than highRiskThreshold
                          if (mediumRiskThreshold > values[0] - 1000) {
                            setMediumRiskThreshold(values[0] - 1000);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}
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
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search numbers..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={handleSearchChange}
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      value={betTypeFilter}
                      onValueChange={(value) => setBetTypeFilter(value)}
                    >
                      <SelectTrigger>
                        <div className="flex items-center">
                          <Filter className="mr-2 h-4 w-4" />
                          <span>{betTypeFilter === "all" ? "All Bet Types" : 
                                 betTypeFilter === "jodi" ? "Jodi" :
                                 betTypeFilter === "harf" ? "Harf" :
                                 betTypeFilter === "odd_even" ? "Odd-Even" : 
                                 betTypeFilter === "crossing" ? "Crossing" : "All"}</span>
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Bet Types</SelectItem>
                        <SelectItem value="jodi">Jodi</SelectItem>
                        <SelectItem value="harf">Harf</SelectItem>
                        <SelectItem value="odd_even">Odd-Even</SelectItem>
                        <SelectItem value="crossing">Crossing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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