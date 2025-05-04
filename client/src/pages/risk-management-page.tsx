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
  matchId?: number;     // Added to track which match this team belongs to
  matchName?: string;   // Added to show match name
  opponentTeam?: string; // Added to show opponent team
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
      // If no cricket toss data, show demo data if in development
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            teamName: "India",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0,
            matchId: 1,
            matchName: "India vs Australia",
            opponentTeam: "Australia"
          },
          {
            teamName: "Australia",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0,
            matchId: 1,
            matchName: "India vs Australia",
            opponentTeam: "India"
          }
        ];
      }
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
      // If no sports data, show demo data if in development
      if (process.env.NODE_ENV === 'development') {
        return [
          {
            teamName: "Mumbai Indians",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0,
            matchId: 1,
            matchName: "Mumbai Indians vs Chennai Super Kings",
            opponentTeam: "Chennai Super Kings"
          },
          {
            teamName: "Chennai Super Kings",
            totalBets: 0,
            totalAmount: 0,
            potentialWinAmount: 0,
            uniqueUsers: 0,
            matchId: 1,
            matchName: "Mumbai Indians vs Chennai Super Kings",
            opponentTeam: "Mumbai Indians"
          }
        ];
      }
      return [];
    }
    
    // Enhanced teams with match information and opponents
    const enhancedTeams: TeamBettingStats[] = [];
    
    sportsStats.forEach(match => {
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
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
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
                data.map((item, index) => {
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
              {data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-4">
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
                data.map((item, index) => {
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
                            <BarChart className="mr-2 h-4 w-4 text-primary" />
                            {item.matchName || "Sports Match"}
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
          <CardFooter className="flex justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing top 100 results sorted by {sortColumn === 'totalBets' ? 'number of bets' : 
                sortColumn === 'totalAmount' ? 'bet amount' : 
                sortColumn === 'potentialWinAmount' ? 'potential win amount' : 
                sortColumn === 'uniqueUsers' ? 'unique users' :
                sortColumn === 'gameMode' ? 'game mode' :
                'number'}
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