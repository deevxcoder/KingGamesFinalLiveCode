import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import Sidebar from "@/components/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Ban, 
  CheckCircle, 
  User, 
  DollarSign, 
  PlusCircle, 
  MinusCircle,
  Edit,
  Key,
  Info,
  Clock,
  BarChart,
  ArrowDown,
  ArrowUp,
  Coins,
  History,
  FileText
} from "lucide-react";

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isRemoveFundsDialogOpen, setIsRemoveFundsDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState("transactions");

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    enabled: !!user,
  });
  
  // Fetch user transactions
  const { data: userTransactions = [], isLoading: isLoadingTransactions } = useQuery({
    queryKey: ["/api/transactions", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await apiRequest("GET", `/api/transactions/${selectedUser.id}`);
      return await res.json();
    },
    enabled: !!selectedUser && isUserDetailsDialogOpen && detailsTab === "transactions",
  });
  
  // Fetch user games
  const { data: userGames = [], isLoading: isLoadingGames } = useQuery({
    queryKey: ["/api/games", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];
      const res = await apiRequest("GET", `/api/games/${selectedUser.id}`);
      return await res.json();
    },
    enabled: !!selectedUser && isUserDetailsDialogOpen && (detailsTab === "bets" || detailsTab === "active-bets"),
  });

  // Block user mutation
  const blockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/block`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User blocked",
        description: "The user has been blocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to block user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unblock user mutation
  const unblockUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/unblock`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "User unblocked",
        description: "The user has been unblocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unblock user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update balance mutation
  const updateBalanceMutation = useMutation({
    mutationFn: async ({ userId, amount }: { userId: number; amount: number }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/balance`, { amount });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAmount(0);
      setIsAddFundsDialogOpen(false);
      setIsRemoveFundsDialogOpen(false);
      toast({
        title: "Balance updated",
        description: "The user's balance has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update balance",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, username, password }: { userId: number; username?: string; password?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/edit`, { username, password });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditUserDialogOpen(false);
      setUsername("");
      setPassword("");
      toast({
        title: "User updated",
        description: "The user's information has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update user",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBlockUser = (userId: number) => {
    blockUserMutation.mutate(userId);
  };

  const handleUnblockUser = (userId: number) => {
    unblockUserMutation.mutate(userId);
  };

  const handleAddFunds = () => {
    if (!selectedUser || amount <= 0) return;
    // Convert dollar amount to cents (multiply by 100)
    updateBalanceMutation.mutate({ userId: selectedUser.id, amount: amount * 100 });
  };

  const handleRemoveFunds = () => {
    if (!selectedUser || amount <= 0) return;
    // Convert dollar amount to cents (multiply by 100)
    updateBalanceMutation.mutate({ userId: selectedUser.id, amount: -amount * 100 });
  };

  const handleEditUser = () => {
    if (!selectedUser) return;
    const updatedFields: { username?: string; password?: string } = {};
    if (username.trim()) updatedFields.username = username;
    if (password.trim()) updatedFields.password = password;
    
    if (Object.keys(updatedFields).length === 0) {
      toast({
        title: "No changes made",
        description: "Please enter a new username or password",
        variant: "destructive",
      });
      return;
    }
    
    editUserMutation.mutate({ 
      userId: selectedUser.id, 
      ...updatedFields 
    });
  };

  const openAddFundsDialog = (user: any) => {
    setSelectedUser(user);
    setAmount(0);
    setIsAddFundsDialogOpen(true);
  };

  const openRemoveFundsDialog = (user: any) => {
    setSelectedUser(user);
    setAmount(0);
    setIsRemoveFundsDialogOpen(true);
  };

  const openEditUserDialog = (user: any) => {
    setSelectedUser(user);
    setUsername("");
    setPassword("");
    setIsEditUserDialogOpen(true);
  };
  
  const openUserDetailsDialog = (user: any) => {
    setSelectedUser(user);
    setDetailsTab("transactions");
    setIsUserDetailsDialogOpen(true);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      
      <main className="flex-1 overflow-y-auto pt-0 lg:pt-0">
        <div className="container mx-auto px-4 py-4 lg:py-6">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage player accounts, balances, and status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Username</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4">
                            No users found
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user: any) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                {user.username}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={
                                user.role === UserRole.ADMIN 
                                  ? "default" 
                                  : user.role === UserRole.SUBADMIN 
                                    ? "outline" 
                                    : "secondary"
                              }>
                                {user.role}
                              </Badge>
                            </TableCell>
                            <TableCell>${(user.balance / 100).toFixed(2)}</TableCell>
                            <TableCell>
                              {user.isBlocked ? (
                                <Badge variant="destructive">Blocked</Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                                  Active
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openAddFundsDialog(user)}
                                  title="Add funds"
                                >
                                  <PlusCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openRemoveFundsDialog(user)}
                                  title="Remove funds"
                                >
                                  <MinusCircle className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEditUserDialog(user)}
                                  title="Edit user"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openUserDetailsDialog(user)}
                                  title="View details"
                                  className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                                {user.isBlocked ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUnblockUser(user.id)}
                                    className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                    title="Unblock user"
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleBlockUser(user.id)}
                                    className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                    title="Block user"
                                  >
                                    <Ban className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      
      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Add funds to {selectedUser?.username}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Amount in dollars"
                min="0"
                step="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddFundsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFunds} disabled={amount <= 0 || updateBalanceMutation.isPending}>
              {updateBalanceMutation.isPending ? "Processing..." : "Add Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Remove Funds Dialog */}
      <Dialog open={isRemoveFundsDialogOpen} onOpenChange={setIsRemoveFundsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Funds</DialogTitle>
            <DialogDescription>
              Remove funds from {selectedUser?.username}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-muted-foreground" />
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                placeholder="Amount in dollars"
                min="0"
                max={selectedUser ? selectedUser.balance / 100 : 0}
                step="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRemoveFundsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleRemoveFunds} 
              disabled={amount <= 0 || updateBalanceMutation.isPending || (selectedUser && amount > selectedUser.balance / 100)}
              variant="destructive"
            >
              {updateBalanceMutation.isPending ? "Processing..." : "Remove Funds"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {selectedUser?.username}'s account information
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="New username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditUser} 
              disabled={(!username.trim() && !password.trim()) || editUserMutation.isPending}
            >
              {editUserMutation.isPending ? "Processing..." : "Update User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog 
        open={isUserDetailsDialogOpen} 
        onOpenChange={setIsUserDetailsDialogOpen}
      >
        <DialogContent style={{maxWidth: "90vw", width: "90vw"}}>
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.username}</DialogTitle>
            <DialogDescription>
              View transaction history, bet history, and active bets
            </DialogDescription>
          </DialogHeader>
          
          <div className="w-full">
            <div className="flex border-b mb-4">
              <button 
                type="button"
                className={`px-4 py-2 flex items-center gap-2 ${detailsTab === "transactions" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setDetailsTab("transactions")}
              >
                <History className="h-4 w-4" />
                <span>Transactions</span>
              </button>
              <button 
                type="button"
                className={`px-4 py-2 flex items-center gap-2 ${detailsTab === "bets" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setDetailsTab("bets")}
              >
                <FileText className="h-4 w-4" />
                <span>Bet History</span>
              </button>
              <button 
                type="button"
                className={`px-4 py-2 flex items-center gap-2 ${detailsTab === "active-bets" ? "border-b-2 border-primary font-medium" : ""}`}
                onClick={() => setDetailsTab("active-bets")}
              >
                <BarChart className="h-4 w-4" />
                <span>Active Bets</span>
              </button>
            </div>
            
            {/* Transactions Tab */}
            {detailsTab === "transactions" && (
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userTransactions.map((transaction: any) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              {new Date(transaction.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={transaction.amount > 0 ? "outline" : "secondary"}>
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
                            <TableCell className={transaction.amount > 0 ? "text-green-500" : "text-red-500"}>
                              {transaction.amount > 0 ? "+" : ""}{(transaction.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell>{transaction.description || "Balance update"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            
            {/* Bet History Tab */}
            {detailsTab === "bets" && (
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
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Game</TableHead>
                          <TableHead>Bet Amount</TableHead>
                          <TableHead>Prediction</TableHead>
                          <TableHead>Result</TableHead>
                          <TableHead>Payout</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userGames.map((game: any) => (
                          <TableRow key={game.id}>
                            <TableCell>
                              {new Date(game.createdAt).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Coins className="h-4 w-4" />
                                Coin Flip
                              </div>
                            </TableCell>
                            <TableCell>${(game.betAmount / 100).toFixed(2)}</TableCell>
                            <TableCell>{game.prediction}</TableCell>
                            <TableCell>
                              <Badge variant={game.prediction === game.result ? "outline" : "secondary"}>
                                {game.result}
                              </Badge>
                            </TableCell>
                            <TableCell className={game.payout > 0 ? "text-green-500" : "text-red-500"}>
                              {game.payout > 0 ? "+" : ""}${(game.payout / 100).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
            
            {/* Active Bets Tab */}
            {detailsTab === "active-bets" && (
              <div className="py-4">
                <div className="text-center py-8 text-muted-foreground">
                  No active bets found
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUserDetailsDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
