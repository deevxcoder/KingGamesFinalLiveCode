import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  IndianRupee, 
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
  FileText,
  UserPlus,
  Loader2,
  MessageSquare,
  Percent
} from "lucide-react";

export default function UserManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [amount, setAmount] = useState<number>(0);
  const [remark, setRemark] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
  const [isRemoveFundsDialogOpen, setIsRemoveFundsDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isUserDetailsDialogOpen, setIsUserDetailsDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState("transactions");
  const [commissionRate, setCommissionRate] = useState<number>(0);
  const [selectedGameType, setSelectedGameType] = useState<string>("satamatka_jodi");
  
  // Define the schema for creating a new user
  const createUserSchema = z.object({
    username: z.string().min(3, "Username must be at least 3 characters"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
  }).refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
  
  // Create user form
  const createUserForm = useForm<z.infer<typeof createUserSchema>>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

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
  
  // Fetch user commissions (for subadmins) or discounts (for players)
  const { data: userCommissions = [], isLoading: isLoadingCommissions } = useQuery({
    queryKey: ["/api/commissions", selectedUser?.id, selectedUser?.role],
    queryFn: async () => {
      if (!selectedUser) return [];
      
      // If the selected user is a subadmin, get their commission rates
      if (selectedUser.role === UserRole.SUBADMIN) {
        const res = await apiRequest("GET", `/api/commissions/subadmin/${selectedUser.id}`);
        return await res.json();
      }
      
      // If the selected user is a player and current user is a subadmin, get player discounts
      if (selectedUser.role === UserRole.PLAYER && user?.role === UserRole.SUBADMIN) {
        const res = await apiRequest("GET", `/api/discounts/user/${selectedUser.id}`);
        return await res.json();
      }
      
      return [];
    },
    enabled: !!selectedUser && isCommissionDialogOpen,
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
    mutationFn: async ({ userId, amount, description }: { userId: number; amount: number; description?: string }) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/balance`, { amount, description });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setAmount(0);
      setRemark("");
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

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<z.infer<typeof createUserSchema>, "confirmPassword">) => {
      return apiRequest("POST", "/api/register", {
        username: data.username,
        password: data.password,
        role: UserRole.PLAYER
      });
    },
    onSuccess: () => {
      toast({
        title: "User Created",
        description: "New user has been created and assigned to you successfully",
      });
      setIsCreateUserDialogOpen(false);
      createUserForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Creating User",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Set commission/discount mutation
  const setCommissionMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      gameType, 
      rate, 
      isSubadmin 
    }: { 
      userId: number; 
      gameType: string; 
      rate: number;
      isSubadmin: boolean;
    }) => {
      // For subadmins, use the commission endpoint
      if (isSubadmin) {
        const res = await apiRequest("POST", "/api/commissions/subadmin", {
          subadminId: userId,
          gameType,
          commissionRate: Math.round(rate * 100) // Convert percentage to basis points (5% = 500)
        });
        return await res.json();
      }
      
      // For players, use the discount endpoint
      const res = await apiRequest("POST", "/api/discounts/user", {
        userId,
        gameType,
        discountRate: Math.round(rate * 100) // Convert percentage to basis points (5% = 500)
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/commissions", selectedUser?.id, selectedUser?.role] });
      setIsCommissionDialogOpen(false);
      setCommissionRate(0);
      toast({
        title: selectedUser?.role === UserRole.SUBADMIN ? "Commission Updated" : "Discount Updated",
        description: `${selectedUser?.role === UserRole.SUBADMIN ? "Commission" : "Discount"} rate has been updated successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: `Failed to update ${selectedUser?.role === UserRole.SUBADMIN ? "commission" : "discount"}`,
        description: error.message,
        variant: "destructive",
      });
    }
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
    updateBalanceMutation.mutate({ 
      userId: selectedUser.id, 
      amount: amount * 100,
      description: remark ? remark : `Funds added by ${user?.username}`
    });
  };

  const handleRemoveFunds = () => {
    if (!selectedUser || amount <= 0) return;
    // Convert dollar amount to cents (multiply by 100)
    updateBalanceMutation.mutate({ 
      userId: selectedUser.id, 
      amount: -amount * 100,
      description: remark ? remark : `Funds deducted by ${user?.username}`
    });
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
  
  const openCommissionDialog = (user: any) => {
    setSelectedUser(user);
    setCommissionRate(0);
    setSelectedGameType("satamatka_jodi");
    setIsCommissionDialogOpen(true);
  };
  
  const handleSetCommission = () => {
    if (!selectedUser || commissionRate < 0) return;
    
    setCommissionMutation.mutate({
      userId: selectedUser.id,
      gameType: selectedGameType,
      rate: commissionRate,
      isSubadmin: selectedUser.role === UserRole.SUBADMIN
    });
  };
  
  // Handle create user form submission
  const handleCreateUser = (data: z.infer<typeof createUserSchema>) => {
    const { confirmPassword, ...userData } = data;
    createUserMutation.mutate(userData);
  };

  return (
    <DashboardLayout title="User Management">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                Manage player accounts, balances, and status
              </CardDescription>
            </div>
            
            {/* Add User Button - Only shown for Subadmins */}
            {user?.role === UserRole.SUBADMIN && (
              <Button
                onClick={() => setIsCreateUserDialogOpen(true)}
                className="bg-gradient-to-r from-primary to-blue-500 hover:from-primary/90 hover:to-blue-500/90"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
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
                  {(users as any[]).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    (users as any[]).map((user: any) => (
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
                        <TableCell>₹{(user.balance / 100).toFixed(2)}</TableCell>
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
                            {/* Only show commission button for subadmins and players */}
                            {(user.role === UserRole.SUBADMIN || user.role === UserRole.PLAYER) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openCommissionDialog(user)}
                                title={user.role === UserRole.SUBADMIN ? "Set Commission" : "Set Discount"}
                                className="text-purple-500 border-purple-500/20 hover:bg-purple-500/10"
                              >
                                <Percent className="h-4 w-4" />
                              </Button>
                            )}
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
      
      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Add funds to {selectedUser?.username}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <div className="flex items-center gap-2 mt-2">
                <IndianRupee className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Amount in rupees"
                  min="0"
                  step="1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remark">Remark (Optional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="remark"
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add a remark for this transaction"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddFundsDialogOpen(false);
              setRemark("");
            }}>
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
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="remove-amount">Amount</Label>
              <div className="flex items-center gap-2 mt-2">
                <IndianRupee className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="remove-amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="Amount in rupees"
                  min="0"
                  max={selectedUser ? selectedUser.balance / 100 : 0}
                  step="1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="remove-remark">Remark (Optional)</Label>
              <div className="flex items-center gap-2 mt-2">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="remove-remark"
                  type="text"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add a remark for this transaction"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsRemoveFundsDialogOpen(false);
              setRemark("");
            }}>
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

      {/* Create User Dialog */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Create a new player account that will be assigned to you.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
              <FormField
                control={createUserForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUserForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={createUserForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirm password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateUserDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create User
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Commission Dialog */}
      <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.role === UserRole.SUBADMIN ? "Set Commission Rate" : "Set Discount Rate"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.role === UserRole.SUBADMIN 
                ? `Set commission rates for ${selectedUser?.username}` 
                : `Set discount rates for ${selectedUser?.username}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <Label htmlFor="game-type">Game Type</Label>
              <Select value={selectedGameType} onValueChange={setSelectedGameType}>
                <SelectTrigger className="w-full mt-2">
                  <SelectValue placeholder="Select game type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="satamatka_jodi">Satamatka - Jodi</SelectItem>
                  <SelectItem value="satamatka_single">Satamatka - Single</SelectItem>
                  <SelectItem value="satamatka_patti">Satamatka - Patti</SelectItem>
                  <SelectItem value="cricket_toss">Cricket Toss</SelectItem>
                  <SelectItem value="team_match">Team Match</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="commission-rate">
                {selectedUser?.role === UserRole.SUBADMIN ? "Commission Rate (%)" : "Discount Rate (%)"}
              </Label>
              <div className="flex items-center gap-2 mt-2">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="commission-rate"
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  placeholder="Rate in percentage"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {selectedUser?.role === UserRole.SUBADMIN 
                  ? "Commission is calculated as a percentage of player's betting amount."
                  : "Discount reduces the player's betting amount, increasing potential winnings."}
              </p>
            </div>
            
            {/* Display existing commission/discount rates if available */}
            {!isLoadingCommissions && userCommissions.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2">Current Rates:</h4>
                <div className="space-y-1">
                  {userCommissions.map((commission: any) => (
                    <div key={commission.id} className="flex justify-between text-sm">
                      <span>{commission.gameType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                      <span className="font-medium">{(commission.commissionRate / 100).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCommissionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSetCommission} 
              disabled={commissionRate < 0 || commissionRate > 100 || setCommissionMutation.isPending}
            >
              {setCommissionMutation.isPending ? "Processing..." : "Save Rate"}
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
                              {transaction.amount > 0 ? "+" : ""}₹{(transaction.amount / 100).toFixed(2)}
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
                            <TableCell>{game.gameType || "Coin Flip"}</TableCell>
                            <TableCell>₹{(game.betAmount / 100).toFixed(2)}</TableCell>
                            <TableCell>{game.prediction}</TableCell>
                            <TableCell>{game.result || "Pending"}</TableCell>
                            <TableCell className={(game.payout || 0) > 0 ? "text-green-500" : "text-red-500"}>
                              {(game.payout || 0) > 0 ? `+₹${(game.payout / 100).toFixed(2)}` : "₹0.00"}
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
    </DashboardLayout>
  );
}