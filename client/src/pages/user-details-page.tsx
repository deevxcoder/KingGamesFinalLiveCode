import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { 
  ArrowDown, 
  ArrowUp, 
  BarChart, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  FileText, 
  History,
  User,
  IndianRupee,
  UserCog,
  CalendarDays
} from "lucide-react";

export default function UserDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const userId = parseInt(id);
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("transactions");
  
  // Pagination states
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [betsPage, setBetsPage] = useState(1);
  const [activeBetsPage, setActiveBetsPage] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // Fetch user details
  const { data: selectedUser, isLoading: isLoadingUser } = useQuery({
    queryKey: ["/api/users", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${userId}`);
      return await res.json();
    },
    enabled: !!userId,
  });
  
  // Fetch user transactions
  const { data: userTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["/api/transactions", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/transactions/${userId}`);
      return await res.json();
    },
    enabled: !!userId && activeTab === "transactions",
  });
  
  // Fetch user games
  const { data: userGames = [], isLoading: isLoadingGames } = useQuery({
    queryKey: ["/api/games", userId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/games/${userId}`);
      return await res.json();
    },
    enabled: !!userId && activeTab === "bets",
  });
  
  // Fetch active bets (pending games) for the user
  const { data: userActiveBets = [], isLoading: isLoadingActiveBets } = useQuery({
    queryKey: ["/api/games/pending", userId],
    queryFn: async () => {
      // Get all games for this user
      const res = await apiRequest("GET", `/api/games/${userId}`);
      const allGames = await res.json();
      
      // Better pending game detection
      const activeBets = allGames.filter((game: any) => {
        const isPending = !game.result || 
                         game.result === "" || 
                         game.result === "pending" ||
                         (game.game_data && game.game_data.status === "open");
        return isPending;
      });
      
      return activeBets;
    },
    enabled: !!userId && activeTab === "active-bets",
  });
  
  // Pagination helpers
  const getPageCount = (totalItems: number) => Math.ceil(totalItems / itemsPerPage);
  
  const getPaginatedItems = (items: any[], page: number) => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };
  
  // Reset pagination when tab changes
  useEffect(() => {
    setTransactionsPage(1);
    setBetsPage(1);
    setActiveBetsPage(1);
  }, [activeTab]);
  
  const handleGoBack = () => {
    navigate("/users");
  };

  if (isLoadingUser) {
    return (
      <DashboardLayout title="User Details">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!selectedUser) {
    return (
      <DashboardLayout title="User Details">
        <Card>
          <CardHeader>
            <CardTitle>User Not Found</CardTitle>
            <CardDescription>
              The requested user could not be found. Please go back and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleGoBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Users
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={`User: ${selectedUser.username}`}>
      <div className="mb-4">
        <Button variant="outline" onClick={handleGoBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back to Users
        </Button>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {selectedUser.username}
          </CardTitle>
          <CardDescription>User details and summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">User Role</div>
              <div className="font-semibold flex items-center gap-2">
                <UserCog className="h-4 w-4 text-blue-400" />
                <span className="capitalize">{selectedUser.role}</span>
              </div>
            </div>
            
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
              <div className="font-semibold flex items-center gap-2">
                <IndianRupee className="h-4 w-4 text-green-400" />
                <span>₹{(selectedUser.balance / 100).toFixed(2)}</span>
              </div>
            </div>
            
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div className="font-semibold">
                {selectedUser.isBlocked ? (
                  <Badge variant="destructive">Blocked</Badge>
                ) : (
                  <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                    Active
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="bg-secondary/20 p-4 rounded-lg">
              <div className="text-sm text-muted-foreground mb-1">Member Since</div>
              <div className="font-semibold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-purple-400" />
                <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-slate-950 border-slate-800">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-white">User Activity</CardTitle>
              <CardDescription>View transaction history, bet history, and active bets</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full">
            <div className="flex border-b border-slate-800 mb-4 w-full overflow-x-auto pb-1">
              <button 
                type="button"
                className={`px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap text-slate-300 ${activeTab === "transactions" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setActiveTab("transactions")}
              >
                <History className="h-4 w-4" />
                <span>Transactions</span>
              </button>
              <button 
                type="button"
                className={`px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap text-slate-300 ${activeTab === "bets" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setActiveTab("bets")}
              >
                <FileText className="h-4 w-4" />
                <span>Game History</span>
              </button>
              <button 
                type="button"
                className={`px-4 py-2 flex items-center justify-center gap-2 whitespace-nowrap text-slate-300 ${activeTab === "active-bets" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setActiveTab("active-bets")}
              >
                <BarChart className="h-4 w-4" />
                <span>Active Bets</span>
              </button>
            </div>
            
            <div className="overflow-hidden">
              {/* Transactions Tab */}
              {activeTab === "transactions" && (
                <div className="py-4">
                  {isLoadingTransactions ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : userTransactions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No transaction history found
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-900">
                              <TableHead className="whitespace-nowrap text-slate-400">Date</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Type</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Amount</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedItems(userTransactions, transactionsPage).map((transaction: any) => (
                              <TableRow key={transaction.id} className="bg-slate-900/40 hover:bg-slate-900/60">
                                <TableCell className="whitespace-nowrap text-slate-300">
                                  {new Date(transaction.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white">
                                    <div className="flex items-center gap-1">
                                      {transaction.amount > 0 ? (
                                        <ArrowUp className="h-3 w-3 text-green-500" />
                                      ) : (
                                        <ArrowDown className="h-3 w-3 text-red-500" />
                                      )}
                                      {transaction.amount > 0 ? "Deposit" : "Withdrawal"}
                                    </div>
                                  </Badge>
                                </TableCell>
                                <TableCell className={transaction.amount > 0 ? "text-amber-500" : "text-red-500"}>
                                  {transaction.amount > 0 ? "+" : ""}₹{(transaction.amount / 100).toFixed(2)}
                                </TableCell>
                                <TableCell className="text-slate-300">{transaction.description || "Balance update"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination Controls */}
                      {userTransactions.length > itemsPerPage && (
                        <div className="flex items-center justify-center mt-4 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransactionsPage(p => Math.max(1, p - 1))}
                            disabled={transactionsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Page {transactionsPage} of {getPageCount(userTransactions.length)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setTransactionsPage(p => Math.min(getPageCount(userTransactions.length), p + 1))}
                            disabled={transactionsPage === getPageCount(userTransactions.length)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Bet History Tab */}
              {activeTab === "bets" && (
                <div className="py-4">
                  {isLoadingGames ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : userGames.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No bet history found
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-900">
                              <TableHead className="whitespace-nowrap text-slate-400">Time</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Game Type</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Market/Match</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Bet Amount</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Prediction</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Result</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Profit/Loss</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedItems(userGames, betsPage).map((game: any) => (
                              <TableRow key={game.id} className="bg-slate-900/40 hover:bg-slate-900/60">
                                <TableCell className="text-slate-400">
                                  {/* Convert to relative time like "about 8 hours ago" */}
                                  about {Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (1000 * 60 * 60))} hours ago
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white">
                                    {game.gameType === 'cricket_toss' ? 'Cricket Toss' :
                                     game.gameType === 'team_match' ? 'Team Match' :
                                     game.gameType === 'coin_flip' ? 'Coin Flip' :
                                     game.gameType.includes('satamatka') ? 'Satamatka' :
                                     game.gameType.replace(/_/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(game.gameType === 'cricket_toss' || game.gameType === 'team_match') && game.gameData ? (
                                    <span>{game.gameData.teamA} vs {game.gameData.teamB}</span>
                                  ) : game.gameType.includes('satamatka') ? (
                                    <span>
                                      {game.gameData && game.gameData.marketName ? 
                                        game.gameData.marketName : 
                                        game.gameMode ? `${game.gameMode} (${game.prediction})` : "Satamatka Game"}
                                    </span>
                                  ) : game.gameType.includes('coin_flip') ? (
                                    <span>Coin Flip Game</span>
                                  ) : (
                                    <span>{game.gameType}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  ₹{(game.betAmount / 100).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {game.gameType === 'cricket_toss' || game.gameType === 'team_match' ? (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction === 'team_a' && game.gameData ? 
                                        game.gameData.teamA : 
                                        game.prediction === 'team_b' && game.gameData ? 
                                          game.gameData.teamB : 
                                          game.prediction}
                                    </Badge>
                                  ) : game.gameType.includes('satamatka') ? (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction}
                                    </Badge>
                                  ) : game.gameType.includes('coin_flip') ? (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {game.result ? (
                                    <Badge className={(game.payout || 0) > 0 ? "bg-green-600" : "bg-red-600"}>
                                      {game.result}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-emerald-600">
                                      pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className={(game.payout || 0) > 0 ? "text-amber-500" : "text-red-500 line-through"}>
                                  {(game.payout || 0) > 0 ? 
                                    `+₹${(game.payout / 100).toFixed(2)}` : 
                                    game.payout === 0 || game.payout === null ? 
                                      `₹${(game.betAmount / 100).toFixed(2)}` : 
                                      `-₹${(Math.abs(game.payout) / 100).toFixed(2)}`}
                                </TableCell>
                                <TableCell className="text-green-500">
                                  ₹{game.balanceAfter ? (game.balanceAfter / 100).toFixed(2) : 
                                     (((selectedUser?.balance || 0) - (game.betAmount || 0)) / 100).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination Controls */}
                      {userGames.length > itemsPerPage && (
                        <div className="flex items-center justify-center mt-4 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBetsPage(p => Math.max(1, p - 1))}
                            disabled={betsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Page {betsPage} of {getPageCount(userGames.length)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setBetsPage(p => Math.min(getPageCount(userGames.length), p + 1))}
                            disabled={betsPage === getPageCount(userGames.length)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
              
              {/* Active Bets Tab */}
              {activeTab === "active-bets" && (
                <div className="py-4">
                  {isLoadingActiveBets ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : userActiveBets.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No active bets found
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-slate-900">
                              <TableHead className="whitespace-nowrap text-slate-400">Time</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Game Type</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Market/Match</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Bet Amount</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Prediction</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Result</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Potential Payout</TableHead>
                              <TableHead className="whitespace-nowrap text-slate-400">Balance</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getPaginatedItems(userActiveBets, activeBetsPage).map((game: any) => (
                              <TableRow key={game.id} className="bg-slate-900/40 hover:bg-slate-900/60">
                                <TableCell className="text-slate-400">
                                  about {Math.floor((Date.now() - new Date(game.createdAt).getTime()) / (1000 * 60 * 60))} hours ago
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-slate-800 border-slate-700 text-white">
                                    {game.gameType === 'cricket_toss' ? 'Cricket Toss' :
                                     game.gameType === 'team_match' ? 'Team Match' :
                                     game.gameType === 'coin_flip' ? 'Coin Flip' :
                                     game.gameType.includes('satamatka') ? 'Satamatka' :
                                     game.gameType.replace(/_/g, ' ')}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {(game.gameType === 'cricket_toss' || game.gameType === 'team_match') && (game.gameData || game.match) ? (
                                    <span>{game.gameData?.teamA || game.match?.teamA} vs {game.gameData?.teamB || game.match?.teamB}</span>
                                  ) : game.gameType.includes('satamatka') ? (
                                    <span>
                                      {game.gameData && game.gameData.marketName ? 
                                        game.gameData.marketName : 
                                        game.gameMode ? `${game.gameMode} (${game.prediction})` : "Satamatka Game"}
                                    </span>
                                  ) : game.gameType.includes('coin_flip') ? (
                                    <span>Coin Flip Game</span>
                                  ) : (
                                    <span>{game.gameType}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  ₹{(game.betAmount / 100).toFixed(2)}
                                </TableCell>
                                <TableCell>
                                  {game.gameType === 'cricket_toss' || game.gameType === 'team_match' ? (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction === 'team_a' && (game.gameData || game.match) ? 
                                        (game.gameData?.teamA || game.match?.teamA) : 
                                        game.prediction === 'team_b' && (game.gameData || game.match) ? 
                                          (game.gameData?.teamB || game.match?.teamB) : 
                                          game.prediction}
                                    </Badge>
                                  ) : game.gameType.includes('satamatka') ? (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction}
                                    </Badge>
                                  ) : (
                                    <Badge className="bg-indigo-600 hover:bg-indigo-700">
                                      {game.prediction}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-emerald-600">
                                    pending
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-amber-500">
                                  {game.gameType === 'cricket_toss' && game.gameData ? (
                                    <>
                                      +₹{(game.betAmount * (game.prediction === 'team_a' ? 
                                           game.gameData.oddTeamA : game.gameData.oddTeamB) / 100 / 100).toFixed(2)}
                                    </>
                                  ) : (
                                    <>+₹{(game.betAmount * 1.9 / 100).toFixed(2)}</>
                                  )}
                                </TableCell>
                                <TableCell className="text-green-500">
                                  ₹{(((selectedUser?.balance || 0)) / 100).toFixed(2)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      
                      {/* Pagination Controls */}
                      {userActiveBets.length > itemsPerPage && (
                        <div className="flex items-center justify-center mt-4 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveBetsPage(p => Math.max(1, p - 1))}
                            disabled={activeBetsPage === 1}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="text-sm">
                            Page {activeBetsPage} of {getPageCount(userActiveBets.length)}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveBetsPage(p => Math.min(getPageCount(userActiveBets.length), p + 1))}
                            disabled={activeBetsPage === getPageCount(userActiveBets.length)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}