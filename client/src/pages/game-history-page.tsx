import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import GameHistoryTable from "@/components/game-history-table";
import StatsCard from "@/components/stats-card";
import { format, subDays, isWithinInterval, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Filter, X, Calendar, ArrowDownUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

// Interface for stats data
interface UserStats {
  totalBets: number;
  winRate: number;
}

// Define date range type
type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

export default function GameHistoryPage() {
  const { user } = useAuth();
  
  // Import Game type from the game-history-table component
  type Game = React.ComponentProps<typeof GameHistoryTable>['games'][number];
  
  // State for filters
  const [gameTypeFilter, setGameTypeFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);
  
  // Sort state
  const [sortBy, setSortBy] = useState<string>("newest");
  
  // Filter presets
  const [activePreset, setActivePreset] = useState<string>("all");
  
  // Fetch user statistics
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/users/stats"],
    enabled: !!user,
  });

  // Fetch all games for the user
  const { data: games = [], isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games/my-history"],
    enabled: !!user,
  });
  
  // Helper function to format game type
  const formatGameType = (gameType: string) => {
    switch(gameType) {
      case 'coin_flip': return 'Coin Flip';
      case 'satamatka': return 'Satamatka';
      case 'team_match': return 'Team Match';
      case 'cricket_toss': return 'Cricket Toss';
      default: return gameType.replace(/_/g, ' ');
    }
  };
  
  // Get unique game types from the data
  const gameTypes = [...new Set(games.map(game => game.gameType))];
  
  // Apply filters to games
  const filteredGames = games.filter(game => {
    // Game type filter
    if (gameTypeFilter !== "all" && game.gameType !== gameTypeFilter) return false;
    
    // Result filter (win/loss)
    if (resultFilter === "wins" && game.payout <= 0) return false;
    if (resultFilter === "losses" && game.payout > 0) return false;
    
    // Search filter - check prediction, result, market/match name
    if (searchTerm) {
      const marketName = 
        game.market?.name?.toLowerCase() || 
        game.match?.teamA?.toLowerCase() || 
        game.match?.teamB?.toLowerCase() || 
        game.gameData?.teamA?.toLowerCase() || 
        game.gameData?.teamB?.toLowerCase() || '';
      
      const searchLower = searchTerm.toLowerCase();
      const gameTypeMatches = formatGameType(game.gameType).toLowerCase().includes(searchLower);
      const predictionMatches = game.prediction.toLowerCase().includes(searchLower);
      const resultMatches = game.result?.toLowerCase()?.includes(searchLower);
      const marketMatches = marketName.includes(searchLower);
      
      if (!gameTypeMatches && !predictionMatches && !resultMatches && !marketMatches) return false;
    }
    
    // Date range filter
    if (dateRange.from && dateRange.to) {
      try {
        const gameDate = new Date(game.createdAt);
        // Set time to end of day for "to" date to include the entire day
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        
        if (!isWithinInterval(gameDate, { start: dateRange.from, end: toDate })) {
          return false;
        }
      } catch (e) {
        // If date parsing fails, include the game anyway
        console.error("Date parsing error:", e);
      }
    }
    
    return true;
  });
  
  // Sort the filtered games
  const sortedGames = [...filteredGames].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "amount-high":
        return b.betAmount - a.betAmount;
      case "amount-low":
        return a.betAmount - b.betAmount;
      case "profit-high":
        return (b.payout - b.betAmount) - (a.payout - a.betAmount);
      case "profit-low":
        return (a.payout - a.betAmount) - (b.payout - b.betAmount);
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  
  // Calculate pagination
  const totalPages = Math.ceil(sortedGames.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedGames = sortedGames.slice(startIndex, startIndex + itemsPerPage);
  
  // Effect to reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [gameTypeFilter, resultFilter, searchTerm, dateRange, sortBy]);
  
  // Handle preset filters
  const handlePresetChange = (preset: string) => {
    setActivePreset(preset);
    
    if (preset === "today") {
      const today = new Date();
      setDateRange({
        from: today,
        to: today
      });
      setGameTypeFilter("all");
      setResultFilter("all");
    } else if (preset === "yesterday") {
      const yesterday = subDays(new Date(), 1);
      setDateRange({
        from: yesterday,
        to: yesterday
      });
      setGameTypeFilter("all");
      setResultFilter("all");
    } else if (preset === "last7days") {
      setDateRange({
        from: subDays(new Date(), 7),
        to: new Date()
      });
      setGameTypeFilter("all");
      setResultFilter("all");
    } else if (preset === "last30days") {
      setDateRange({
        from: subDays(new Date(), 30),
        to: new Date()
      });
      setGameTypeFilter("all");
      setResultFilter("all");
    } else if (preset === "coinflip") {
      setDateRange({
        from: undefined,
        to: undefined
      });
      setGameTypeFilter("coin_flip");
      setResultFilter("all");
    } else if (preset === "wins") {
      setDateRange({
        from: undefined,
        to: undefined
      });
      setGameTypeFilter("all");
      setResultFilter("wins");
    } else if (preset === "losses") {
      setDateRange({
        from: undefined,
        to: undefined
      });
      setGameTypeFilter("all");
      setResultFilter("losses");
    } else {
      // All games
      setDateRange({
        from: undefined,
        to: undefined
      });
      setGameTypeFilter("all");
      setResultFilter("all");
    }
  };
  
  // Reset all filters
  const resetAllFilters = () => {
    setActivePreset("all");
    setGameTypeFilter("all");
    setResultFilter("all");
    setSearchTerm("");
    setDateRange({
      from: undefined,
      to: undefined
    });
    setSortBy("newest");
  };
  
  return (
    <DashboardLayout title="Game History">
      <Card className="mb-6">
        <CardHeader>
          <CardDescription>
            View your comprehensive betting history and results from all games
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <StatsCard winRate={stats?.winRate || 0} totalBets={stats?.totalBets || 0} showFullWidth />
          </div>
          
          {/* Quick Filter Tabs */}
          <Tabs defaultValue="all" value={activePreset} className="mb-6" onValueChange={handlePresetChange}>
            <TabsList className="grid grid-cols-2 md:grid-cols-4 mb-2">
              <TabsTrigger value="all">All Games</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="last7days">Last 7 Days</TabsTrigger>
              <TabsTrigger value="last30days">Last 30 Days</TabsTrigger>
            </TabsList>
            <TabsList className="grid grid-cols-3 md:grid-cols-3">
              <TabsTrigger value="coinflip">Coin Flip Only</TabsTrigger>
              <TabsTrigger value="wins">Wins Only</TabsTrigger>
              <TabsTrigger value="losses">Losses Only</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {/* Filter Controls */}
          <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Search games..."
                className="pl-9 bg-slate-950/50 border-slate-800"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-9 w-9 text-slate-500 hover:text-slate-400"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {/* Game Type Filter */}
            <Select value={gameTypeFilter} onValueChange={setGameTypeFilter}>
              <SelectTrigger className="bg-slate-950/50 border-slate-800">
                <SelectValue placeholder="Game Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Game Type</SelectLabel>
                  <SelectItem value="all">All Games</SelectItem>
                  {gameTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {formatGameType(type)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Result Filter (Win/Loss) */}
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="bg-slate-950/50 border-slate-800">
                <SelectValue placeholder="Result" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Result</SelectLabel>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="wins">Wins Only</SelectItem>
                  <SelectItem value="losses">Losses Only</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            
            {/* Date Range Picker */}
            <DateRangePicker
              date={dateRange}
              onDateChange={setDateRange}
              className="bg-slate-950/50 border-slate-800"
            />
          </div>
          
          {/* Sort and Reset */}
          <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-slate-400" />
                <Label htmlFor="sort-by" className="text-sm text-slate-400">Sort by:</Label>
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger id="sort-by" className="w-[180px] ml-2 bg-slate-950/50 border-slate-800">
                  <SelectValue placeholder="Sort Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount-high">Highest Amount</SelectItem>
                    <SelectItem value="amount-low">Lowest Amount</SelectItem>
                    <SelectItem value="profit-high">Highest Profit</SelectItem>
                    <SelectItem value="profit-low">Lowest Profit</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={resetAllFilters}
              className="border-slate-700"
            >
              <X className="h-4 w-4 mr-1" /> Reset Filters
            </Button>
          </div>
          
          {/* Applied Filter Chips */}
          {(gameTypeFilter !== "all" || resultFilter !== "all" || searchTerm || dateRange.from) && (
            <div className="flex flex-wrap gap-2 mb-4">
              {gameTypeFilter !== "all" && (
                <Badge 
                  variant="outline" 
                  className="px-2 py-1 bg-blue-900/30 text-blue-300 border-blue-500/30 flex items-center gap-1"
                >
                  Game: {formatGameType(gameTypeFilter)}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 text-blue-300 hover:text-blue-200 hover:bg-transparent"
                    onClick={() => setGameTypeFilter("all")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {resultFilter !== "all" && (
                <Badge 
                  variant="outline" 
                  className={`px-2 py-1 ${
                    resultFilter === "wins" 
                      ? "bg-green-900/30 text-green-300 border-green-500/30" 
                      : "bg-red-900/30 text-red-300 border-red-500/30"
                  } flex items-center gap-1`}
                >
                  {resultFilter === "wins" ? "Wins Only" : "Losses Only"}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className={`h-4 w-4 p-0 ml-1 ${
                      resultFilter === "wins" 
                        ? "text-green-300 hover:text-green-200" 
                        : "text-red-300 hover:text-red-200"
                    } hover:bg-transparent`}
                    onClick={() => setResultFilter("all")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {searchTerm && (
                <Badge 
                  variant="outline" 
                  className="px-2 py-1 bg-purple-900/30 text-purple-300 border-purple-500/30 flex items-center gap-1"
                >
                  Search: {searchTerm}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 text-purple-300 hover:text-purple-200 hover:bg-transparent"
                    onClick={() => setSearchTerm("")}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
              
              {dateRange.from && dateRange.to && (
                <Badge 
                  variant="outline" 
                  className="px-2 py-1 bg-amber-900/30 text-amber-300 border-amber-500/30 flex items-center gap-1"
                >
                  <Calendar className="h-3 w-3 mr-1" />
                  {format(dateRange.from, "MMM d")} 
                  {dateRange.to && dateRange.to.getTime() !== dateRange.from.getTime() && (
                    ` - ${format(dateRange.to, "MMM d")}`
                  )}
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-4 w-4 p-0 ml-1 text-amber-300 hover:text-amber-200 hover:bg-transparent"
                    onClick={() => setDateRange({ from: undefined, to: undefined })}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
          )}
          
          {/* Results count */}
          <div className="text-sm text-slate-400 mb-4">
            Showing {paginatedGames.length} of {filteredGames.length} results
            {filteredGames.length !== games.length && ` (filtered from ${games.length} total)`}
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <GameHistoryTable games={paginatedGames} showFullHistory />
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-6">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage > 1) setCurrentPage(currentPage - 1);
                          }}
                          className={currentPage === 1 ? "cursor-not-allowed opacity-50" : ""}
                        />
                      </PaginationItem>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        // For many pages, show a window around current page
                        let pageNum = i + 1;
                        if (totalPages > 5) {
                          if (currentPage <= 3) {
                            // Show first 5 pages
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            // Show last 5 pages
                            pageNum = totalPages - 4 + i;
                          } else {
                            // Show current page in middle
                            pageNum = currentPage - 2 + i;
                          }
                        }
                        
                        return (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              href="#"
                              onClick={(e) => {
                                e.preventDefault();
                                setCurrentPage(pageNum);
                              }}
                              isActive={currentPage === pageNum}
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      })}
                      
                      <PaginationItem>
                        <PaginationNext 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                          }}
                          className={currentPage === totalPages ? "cursor-not-allowed opacity-50" : ""}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
              
              {/* Items per page selector */}
              <div className="flex justify-end mt-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="items-per-page" className="text-sm text-slate-400">
                    Items per page:
                  </Label>
                  <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                    <SelectTrigger id="items-per-page" className="w-[80px] bg-slate-950/50 border-slate-800">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
