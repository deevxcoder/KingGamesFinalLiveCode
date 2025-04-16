import { useState } from "react";
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
import { ArrowDown, ArrowUp, Coins, Users, CreditCard, Search, Filter } from "lucide-react";

export default function ActionHistoryPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("transactions");
  const [searchTerm, setSearchTerm] = useState("");
  const [gameFilter, setGameFilter] = useState("all");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;

  // Get transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery({
    queryKey: ["/api/transactions", isAdmin || isSubadmin ? "all" : `user-${user?.id}`],
    enabled: !!user,
  });

  // Get games
  const { data: games = [], isLoading: gamesLoading } = useQuery({
    queryKey: ["/api/games", isAdmin || isSubadmin ? "all" : `user-${user?.id}`],
    enabled: !!user,
  });

  // Filter transactions based on search and filter
  const filteredTransactions = (transactions as any[]).filter((transaction: any) => {
    const matchesSearch = searchTerm === "" || 
      transaction.userId.toString().includes(searchTerm) ||
      (transaction.user?.username && transaction.user.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (transactionFilter === "all") return matchesSearch;
    if (transactionFilter === "positive") return matchesSearch && transaction.amount > 0;
    if (transactionFilter === "negative") return matchesSearch && transaction.amount < 0;
    return matchesSearch;
  });

  // Filter games based on search and filter
  const filteredGames = (games as any[]).filter((game: any) => {
    const matchesSearch = searchTerm === "" || 
      game.userId.toString().includes(searchTerm) ||
      (game.user?.username && game.user.username.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (gameFilter === "all") return matchesSearch;
    if (gameFilter === "wins") return matchesSearch && game.payout > 0;
    if (gameFilter === "losses") return matchesSearch && game.payout === 0;
    return matchesSearch;
  });

  const formatAmount = (amount: number) => {
    return (amount / 100).toFixed(2);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${formatDistance(date, new Date(), { addSuffix: true })} (${date.toLocaleDateString()})`;
  };

  const renderTransactionsTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {(isAdmin || isSubadmin) && <TableHead>User</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Performed By</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTransactions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin || isSubadmin ? 5 : 4} className="text-center py-4">
                No transactions found
              </TableCell>
            </TableRow>
          ) : (
            filteredTransactions.map((transaction: any) => (
              <TableRow key={transaction.id}>
                {(isAdmin || isSubadmin) && (
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {transaction.user?.username || `User #${transaction.userId}`}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <span className={transaction.amount > 0 ? "text-green-600" : "text-red-600"}>
                    <div className="flex items-center gap-1">
                      {transaction.amount > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                      ${formatAmount(Math.abs(transaction.amount))}
                    </div>
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={transaction.amount > 0 ? "outline" : "destructive"}>
                    {transaction.amount > 0 ? "Deposit" : "Withdrawal"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    {transaction.performer?.username || `Admin #${transaction.performedBy}`}
                  </div>
                </TableCell>
                <TableCell>{formatDate(transaction.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const renderGamesTable = () => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {(isAdmin || isSubadmin) && <TableHead>User</TableHead>}
            <TableHead>Bet Amount</TableHead>
            <TableHead>Prediction</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Payout</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredGames.length === 0 ? (
            <TableRow>
              <TableCell colSpan={isAdmin || isSubadmin ? 6 : 5} className="text-center py-4">
                No games found
              </TableCell>
            </TableRow>
          ) : (
            filteredGames.map((game: any) => (
              <TableRow key={game.id}>
                {(isAdmin || isSubadmin) && (
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {game.user?.username || `User #${game.userId}`}
                    </div>
                  </TableCell>
                )}
                <TableCell>${formatAmount(game.betAmount)}</TableCell>
                <TableCell className="capitalize">{game.prediction}</TableCell>
                <TableCell className="capitalize">{game.result}</TableCell>
                <TableCell>
                  <span className={game.payout > 0 ? "text-green-600" : "text-red-600"}>
                    <div className="flex items-center gap-1">
                      <Coins className="h-4 w-4" />
                      ${formatAmount(game.payout)}
                    </div>
                  </span>
                </TableCell>
                <TableCell>{formatDate(game.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <DashboardLayout title="Risk Management">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Risk Management</CardTitle>
          <CardDescription>
            Advanced risk analytics and management tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Filter className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Coming Soon</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              Our team is working on building powerful risk management tools to help you analyze betting patterns, 
              identify risk factors, and protect your business. This feature will be available in the next update.
            </p>
            <div className="flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-150"></div>
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse delay-300"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}