import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// UI Components
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
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

// Icons
import {
  UserPlus,
  Ban,
  CheckCircle,
  Settings,
  Users,
  X,
  Percent,
  Save,
  Loader2,
  AlertCircle,
} from "lucide-react";

// Schema for creating a new subadmin
const createSubadminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  commissions: z.object({
    satamatka_jodi: z.string(),
    satamatka_harf: z.string(),
    satamatka_crossing: z.string(),
    satamatka_odd_even: z.string(),
  }).optional(),
});

// Commission schema for subadmin
const commissionSchema = z.object({
  teamMatch: z.coerce.number().min(0).max(100),
  cricketToss: z.coerce.number().min(0).max(100),
  coinFlip: z.coerce.number().min(0).max(100),
  satamatkaJodi: z.coerce.number().min(0).max(100),
  satamatkaHarf: z.coerce.number().min(0).max(100),
  satamatkaOddEven: z.coerce.number().min(0).max(100),
  satamatkaOther: z.coerce.number().min(0).max(100),
});

// Game Odds schema for subadmin
const gameOddsSchema = z.object({
  teamMatch: z.coerce.number().min(0),
  cricketToss: z.coerce.number().min(0),
  coinFlip: z.coerce.number().min(0),
  satamatkaJodi: z.coerce.number().min(0),
  satamatkaHarf: z.coerce.number().min(0),
  satamatkaOddEven: z.coerce.number().min(0),
  satamatkaCrossing: z.coerce.number().min(0),
});

// Schema for creating a new user (player)
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type Commission = z.infer<typeof commissionSchema>;
type GameOdds = z.infer<typeof gameOddsSchema>;

export default function SubadminManagementPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [isGameOddsDialogOpen, setIsGameOddsDialogOpen] = useState(false);
  const [isUserListDialogOpen, setIsUserListDialogOpen] = useState(false);
  const [selectedSubadminId, setSelectedSubadminId] = useState<number | null>(null);
  const [selectedSubadminName, setSelectedSubadminName] = useState<string>("");
  const [showCommissionSettings, setShowCommissionSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("subadmins");

  const form = useForm<z.infer<typeof createSubadminSchema>>({
    resolver: zodResolver(createSubadminSchema),
    defaultValues: {
      username: "",
      password: "",
      commissions: {
        satamatka_jodi: "2.0",
        satamatka_harf: "2.0",
        satamatka_crossing: "2.0",
        satamatka_odd_even: "2.0",
      },
    },
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

  // Fetch users that are subadmins
  const { data: subadmins = [], isLoading } = useQuery({
    queryKey: ["/api/users"],
    select: (data: any) => data.filter((user: any) => user.role === UserRole.SUBADMIN),
    enabled: !!user && user.role === UserRole.ADMIN,
  });

  // Create subadmin mutation
  const createSubadminMutation = useMutation({
    mutationFn: async (data: z.infer<typeof createSubadminSchema>) => {
      // Use the new endpoint that creates a subadmin with commissions in one operation
      if (showCommissionSettings) {
        const res = await apiRequest("POST", "/api/subadmin/create-with-commissions", {
          username: data.username,
          password: data.password,
          commissions: data.commissions
        });
        
        return await res.json();
      } else {
        // If not showing commission settings, just create the subadmin without commissions
        const res = await apiRequest("POST", "/api/register", {
          username: data.username,
          password: data.password,
          role: UserRole.SUBADMIN,
        });
        
        return await res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/commissions/subadmin"] });
      setIsCreateDialogOpen(false);
      setShowCommissionSettings(false);
      form.reset();
      toast({
        title: "Subadmin created",
        description: "The subadmin account has been created successfully with commission settings",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Block subadmin mutation
  const blockSubadminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/block`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Subadmin blocked",
        description: "The subadmin has been blocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to block subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Unblock subadmin mutation
  const unblockSubadminMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("PATCH", `/api/users/${userId}/unblock`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Subadmin unblocked",
        description: "The subadmin has been unblocked successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unblock subadmin",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: z.infer<typeof createSubadminSchema>) => {
    createSubadminMutation.mutate(data);
  };

  const handleBlockSubadmin = (userId: number) => {
    blockSubadminMutation.mutate(userId);
  };

  const handleUnblockSubadmin = (userId: number) => {
    unblockSubadminMutation.mutate(userId);
  };
  
  // Fetch users that are players assigned to this subadmin
  const { data: assignedUsers = [], isLoading: isLoadingUsers } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/users");
      console.log("API Users response:", response);
      return response;
    },
    enabled: !!user?.id && user?.role === UserRole.SUBADMIN,
    select: (data: any) => {
      console.log("Filtering users for subadmin:", user?.id);
      const filtered = data.filter((u: any) => {
        console.log("User:", u.username, "role:", u.role, "assignedTo:", u.assignedTo);
        return u.role === UserRole.PLAYER && u.assignedTo === user?.id;
      });
      console.log("Filtered users:", filtered);
      return filtered;
    },
  });
  
  // Fetch players assigned to the selected subadmin (for admin view)
  const { data: subadminUsers = [], isLoading: isLoadingSubadminUsers, refetch: refetchSubadminUsers } = useQuery({
    queryKey: [`/api/users?assignedTo=${selectedSubadminId}`],
    queryFn: async () => {
      // First try getting all users
      const allUsers = await apiRequest("GET", `/api/users`);
      
      // When logged in as admin, manually filter for users assigned to the selected subadmin
      if (Array.isArray(allUsers)) {
        return allUsers.filter(u => 
          u.role === UserRole.PLAYER && 
          u.assignedTo === selectedSubadminId
        );
      }
      return [];
    },
    enabled: !!selectedSubadminId && isUserListDialogOpen && user?.role === UserRole.ADMIN,
  });
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<z.infer<typeof createUserSchema>, "confirmPassword">) => {
      return apiRequest("POST", "/api/register", {
        username: data.username,
        password: data.password,
        role: UserRole.PLAYER,
        assignedTo: user?.id // Ensure created players are assigned to the current subadmin
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
  
  // Handle create user form submission
  const handleCreateUser = (data: z.infer<typeof createUserSchema>) => {
    const { confirmPassword, ...userData } = data;
    createUserMutation.mutate(userData);
  };
  
  // Commission form setup
  const commissionForm = useForm<Commission>({
    resolver: zodResolver(commissionSchema),
    defaultValues: {
      teamMatch: 0,
      cricketToss: 0,
      coinFlip: 0,
      satamatkaJodi: 0,
      satamatkaHarf: 0,
      satamatkaOddEven: 0,
      satamatkaOther: 0,
    }
  });
  
  // Get commission settings for a selected subadmin
  const { data: commissions, isLoading: isLoadingCommissions, refetch: refetchCommissions } = useQuery({
    queryKey: [`/api/commissions/subadmin/${selectedSubadminId}`],
    enabled: !!selectedSubadminId && isCommissionDialogOpen,
  });
  
  // Update commission mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async (values: Commission) => {
      if (!selectedSubadminId) {
        throw new Error('No subadmin selected');
      }
      
      return apiRequest("POST", `/api/commissions/subadmin/${selectedSubadminId}`, {
        commissions: [
          { gameType: 'team_match', commissionRate: values.teamMatch },
          { gameType: 'cricket_toss', commissionRate: values.cricketToss },
          { gameType: 'coin_flip', commissionRate: values.coinFlip },
          { gameType: 'satamatka_jodi', commissionRate: values.satamatkaJodi },
          { gameType: 'satamatka_harf', commissionRate: values.satamatkaHarf },
          { gameType: 'satamatka_odd_even', commissionRate: values.satamatkaOddEven },
          { gameType: 'satamatka_other', commissionRate: values.satamatkaOther },
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/commissions/subadmin/${selectedSubadminId}`] });
      toast({
        title: "Commission settings updated",
        description: `Commission rates for ${selectedSubadminName} have been updated successfully.`,
        duration: 3000,
      });
      setIsCommissionDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update commission settings",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });
  
  // Handle commission form submission
  const onSubmitCommission = (values: Commission) => {
    updateCommissionMutation.mutate(values);
  };
  
  // Set form values when commissions data is loaded
  useEffect(() => {
    if (commissions && Array.isArray(commissions) && commissions.length > 0) {
      const formValues: any = {
        teamMatch: 0,
        cricketToss: 0,
        coinFlip: 0,
        satamatkaJodi: 0,
        satamatkaHarf: 0,
        satamatkaOddEven: 0,
        satamatkaOther: 0,
      };

      commissions.forEach((commission: any) => {
        if (commission.gameType === 'team_match') {
          formValues.teamMatch = commission.commissionRate;
        } else if (commission.gameType === 'cricket_toss') {
          formValues.cricketToss = commission.commissionRate;
        } else if (commission.gameType === 'coin_flip') {
          formValues.coinFlip = commission.commissionRate;
        } else if (commission.gameType === 'satamatka_jodi') {
          formValues.satamatkaJodi = commission.commissionRate;
        } else if (commission.gameType === 'satamatka_harf') {
          formValues.satamatkaHarf = commission.commissionRate;
        } else if (commission.gameType === 'satamatka_odd_even') {
          formValues.satamatkaOddEven = commission.commissionRate;
        } else if (commission.gameType === 'satamatka_other') {
          formValues.satamatkaOther = commission.commissionRate;
        }
      });

      commissionForm.reset(formValues);
    }
  }, [commissions, commissionForm]);
  
  // Open commission dialog for a specific subadmin
  const openCommissionDialog = (subadmin: any) => {
    setSelectedSubadminId(subadmin.id);
    setSelectedSubadminName(subadmin.username);
    setIsCommissionDialogOpen(true);
    refetchCommissions();
  };
  
  // Game Odds form setup
  const gameOddsForm = useForm<GameOdds>({
    resolver: zodResolver(gameOddsSchema),
    defaultValues: {
      teamMatch: 0,
      cricketToss: 0,
      coinFlip: 0,
      satamatkaJodi: 0,
      satamatkaHarf: 0,
      satamatkaOddEven: 0,
      satamatkaCrossing: 0,
    }
  });
  
  // Get game odds settings for a selected subadmin
  const { data: gameOdds, isLoading: isLoadingGameOdds, refetch: refetchGameOdds } = useQuery({
    queryKey: [`/api/game-odds/subadmin/${selectedSubadminId}`],
    enabled: !!selectedSubadminId && isGameOddsDialogOpen,
  });
  
  // Update game odds mutation
  const updateGameOddsMutation = useMutation({
    mutationFn: async (values: GameOdds) => {
      if (!selectedSubadminId) {
        throw new Error('No subadmin selected');
      }
      
      return apiRequest("POST", `/api/game-odds/subadmin/${selectedSubadminId}`, {
        odds: [
          { gameType: 'team_match', oddValue: Math.round(values.teamMatch * 100) },
          { gameType: 'cricket_toss', oddValue: Math.round(values.cricketToss * 100) },
          { gameType: 'coin_flip', oddValue: Math.round(values.coinFlip * 100) },
          { gameType: 'satamatka_jodi', oddValue: Math.round(values.satamatkaJodi * 100) },
          { gameType: 'satamatka_harf', oddValue: Math.round(values.satamatkaHarf * 100) },
          { gameType: 'satamatka_odd_even', oddValue: Math.round(values.satamatkaOddEven * 100) },
          { gameType: 'satamatka_crossing', oddValue: Math.round(values.satamatkaCrossing * 100) },
        ]
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/game-odds/subadmin/${selectedSubadminId}`] });
      toast({
        title: "Game Odds updated",
        description: `Game odds for ${selectedSubadminName} have been updated successfully.`,
        duration: 3000,
      });
      setIsGameOddsDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update game odds",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });
  
  // Handle game odds form submission
  const onSubmitGameOdds = (values: GameOdds) => {
    updateGameOddsMutation.mutate(values);
  };
  
  // Set form values when game odds data is loaded
  useEffect(() => {
    if (gameOdds && Array.isArray(gameOdds) && gameOdds.length > 0) {
      const formValues: any = {
        teamMatch: 0,
        cricketToss: 0,
        coinFlip: 0,
        satamatkaJodi: 0,
        satamatkaHarf: 0,
        satamatkaOddEven: 0,
        satamatkaCrossing: 0,
      };

      gameOdds.forEach((odd: any) => {
        if (odd.gameType === 'team_match') {
          formValues.teamMatch = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'cricket_toss') {
          formValues.cricketToss = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'coin_flip') {
          formValues.coinFlip = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'satamatka_jodi') {
          formValues.satamatkaJodi = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'satamatka_harf') {
          formValues.satamatkaHarf = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'satamatka_odd_even') {
          formValues.satamatkaOddEven = (odd.oddValue / 100).toFixed(2);
        } else if (odd.gameType === 'satamatka_crossing') {
          formValues.satamatkaCrossing = (odd.oddValue / 100).toFixed(2);
        }
      });

      gameOddsForm.reset(formValues);
    }
  }, [gameOdds, gameOddsForm]);
  
  // Open game odds dialog for a specific subadmin
  const openGameOddsDialog = (subadmin: any) => {
    setSelectedSubadminId(subadmin.id);
    setSelectedSubadminName(subadmin.username);
    setIsGameOddsDialogOpen(true);
    refetchGameOdds();
  };
  
  // Open user list dialog for a specific subadmin
  const openUserListDialog = (subadmin: any) => {
    setSelectedSubadminId(subadmin.id);
    setSelectedSubadminName(subadmin.username);
    setIsUserListDialogOpen(true);
    refetchSubadminUsers();
  };

  return (
    <DashboardLayout title="Management">
      {user?.role === UserRole.ADMIN && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Subadmin Management</CardTitle>
                <CardDescription>
                  Create and manage subadmin accounts
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gradient-to-r from-primary to-blue-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Create Subadmin
              </Button>
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
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subadmins.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-4">
                          No subadmins found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subadmins.map((subadmin: any) => (
                        <TableRow key={subadmin.id}>
                          <TableCell className="font-medium">
                            {subadmin.username}
                          </TableCell>
                          <TableCell>
                            {subadmin.isBlocked ? (
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
                                onClick={() => openCommissionDialog(subadmin)}
                                className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Commission
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openGameOddsDialog(subadmin)}
                                className="text-orange-500 border-orange-500/20 hover:bg-orange-500/10"
                              >
                                <Percent className="h-4 w-4 mr-2" />
                                Game Odds
                              </Button>
                              
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openUserListDialog(subadmin)}
                                className="text-purple-500 border-purple-500/20 hover:bg-purple-500/10"
                              >
                                <Users className="h-4 w-4 mr-2" />
                                View Users
                              </Button>
                              
                              {subadmin.isBlocked ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnblockSubadmin(subadmin.id)}
                                  className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Unblock
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBlockSubadmin(subadmin.id)}
                                  className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Block
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
      )}
      
      {/* User Management for Subadmins */}
      {user?.role === UserRole.SUBADMIN && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Add and manage your players
                </CardDescription>
              </div>
              <Button
                onClick={() => setIsCreateUserDialogOpen(true)}
                className="bg-gradient-to-r from-primary to-blue-500"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingUsers ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No users assigned to you. Add a user using the "Add User" button.
                        </TableCell>
                      </TableRow>
                    ) : (
                      assignedUsers.map((player: any) => (
                        <TableRow key={player.id}>
                          <TableCell className="font-medium">
                            {player.username}
                          </TableCell>
                          <TableCell>
                            ₹{player.balance?.toFixed(2) || '0.00'}
                          </TableCell>
                          <TableCell>
                            {player.isBlocked ? (
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
                                onClick={() => {
                                  const url = `/subadmin-commission-management?userId=${player.id}`;
                                  // Use history.push for better SPA navigation without full page reload
                                  window.history.pushState({}, '', url);
                                  window.dispatchEvent(new PopStateEvent('popstate'));
                                }}
                                className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                              >
                                <Settings className="h-4 w-4 mr-2" />
                                Discount
                              </Button>
                              
                              {player.isBlocked ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnblockSubadmin(player.id)}
                                  className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Unblock
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleBlockSubadmin(player.id)}
                                  className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                >
                                  <Ban className="h-4 w-4 mr-2" />
                                  Block
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
      )}
      
      {/* Create Subadmin Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subadmin</DialogTitle>
            <DialogDescription>
              Create a new subadmin account with management permissions
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
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
                control={form.control}
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
              
              {/* Toggle for commission settings */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Commission Settings for Market Games</span>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCommissionSettings(!showCommissionSettings)}
                  className={showCommissionSettings ? "bg-primary/10" : ""}
                >
                  {showCommissionSettings ? "Hide Settings" : "Show Settings"}
                </Button>
              </div>
              
              {/* Commission settings section */}
              {showCommissionSettings && (
                <div className="space-y-4 pt-4 pb-2">
                  <Separator />
                  <h3 className="text-sm font-medium">Market Game Commission Rates</h3>
                  <p className="text-xs text-muted-foreground">Set commission percentages for Satamatka games</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_jodi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jodi (Pair)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_harf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harf</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_crossing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crossing</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="commissions.satamatka_odd_even"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odd/Even</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input placeholder="2.0" {...field} className="max-w-[100px]" />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-blue-500"
                  disabled={createSubadminMutation.isPending}
                >
                  {createSubadminMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Subadmin...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create Subadmin
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Create User Dialog (for subadmins) */}
      <Dialog open={isCreateUserDialogOpen} onOpenChange={setIsCreateUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
            <DialogDescription>
              Create a new player account that will be assigned to you
            </DialogDescription>
          </DialogHeader>
          
          <Form {...createUserForm}>
            <form onSubmit={createUserForm.handleSubmit(handleCreateUser)} className="space-y-4 py-2">
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
              
              <DialogFooter className="pt-4">
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-primary to-blue-500"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating User...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Commission Settings Dialog */}
      <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-secondary">
          <DialogHeader>
            <DialogTitle>Commission Settings</DialogTitle>
            <DialogDescription>
              Configure commission rates for {selectedSubadminName}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingCommissions ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Alert className="my-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important information</AlertTitle>
                <AlertDescription>
                  Commission rates determine the percentage of bets that the subadmin will receive from player bets.
                  These rates affect your platform's revenue.
                </AlertDescription>
              </Alert>
              
              <Form {...commissionForm}>
                <form onSubmit={commissionForm.handleSubmit(onSubmitCommission)} className="space-y-4 py-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sports Games */}
                    <div className="space-y-3 col-span-2">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Sports Games
                      </h3>
                      <Separator />
                    </div>
                    
                    <FormField
                      control={commissionForm.control}
                      name="teamMatch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Match</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormDescription className="text-xs">
                            Commission on team match bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={commissionForm.control}
                      name="cricketToss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cricket Toss</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormDescription className="text-xs">
                            Commission on cricket toss predictions
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={commissionForm.control}
                      name="coinFlip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Coin Flip</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormDescription className="text-xs">
                            Commission on coin flip games
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Satamatka Games */}
                    <div className="space-y-3 col-span-2 mt-4">
                      <h3 className="text-sm font-medium flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Satamatka Games
                      </h3>
                      <Separator />
                    </div>
                    
                    <FormField
                      control={commissionForm.control}
                      name="satamatkaJodi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jodi (Pair)</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={commissionForm.control}
                      name="satamatkaHarf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harf</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={commissionForm.control}
                      name="satamatkaOddEven"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odd/Even</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={commissionForm.control}
                      name="satamatkaOther"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Other Games</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" max="100" step="0.1" {...field} />
                            </FormControl>
                            <span>%</span>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-primary to-blue-500"
                      disabled={updateCommissionMutation.isPending}
                    >
                      {updateCommissionMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving changes...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Commission Settings
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Game Odds Dialog */}
      <Dialog open={isGameOddsDialogOpen} onOpenChange={setIsGameOddsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-auto scrollbar-thin scrollbar-thumb-primary scrollbar-track-secondary">
          <DialogHeader>
            <DialogTitle>Game Odds Settings</DialogTitle>
            <DialogDescription>
              Configure game odds for {selectedSubadminName}
            </DialogDescription>
          </DialogHeader>
          
          {isLoadingGameOdds ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Alert className="my-2">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important information</AlertTitle>
                <AlertDescription>
                  Game odds determine the payout multiplier for each game type. Higher odds mean larger potential payouts to players.
                  These settings override platform defaults for this subadmin.
                </AlertDescription>
              </Alert>
              
              <Form {...gameOddsForm}>
                <form onSubmit={gameOddsForm.handleSubmit(onSubmitGameOdds)} className="space-y-4 py-2">
                  {/* Sports Games */}
                  <div className="space-y-3 col-span-2">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Sports Game Odds
                    </h3>
                    <Separator />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={gameOddsForm.control}
                      name="teamMatch"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team Match Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for team match bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={gameOddsForm.control}
                      name="cricketToss"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cricket Toss Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for cricket toss bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Royal Toss */}
                  <div className="space-y-3 col-span-2 mt-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Royal Toss Odds
                    </h3>
                    <Separator />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={gameOddsForm.control}
                      name="coinFlip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Royal Toss Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for royal toss (coin flip) bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Satamatka Game Odds */}
                  <div className="space-y-3 col-span-2 mt-4">
                    <h3 className="text-sm font-medium flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Satamatka Game Odds
                    </h3>
                    <Separator />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={gameOddsForm.control}
                      name="satamatkaJodi"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Jodi Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for Jodi (00-99) bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={gameOddsForm.control}
                      name="satamatkaHarf"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harf Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for Harf bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={gameOddsForm.control}
                      name="satamatkaOddEven"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Odd-Even Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for Odd-Even bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={gameOddsForm.control}
                      name="satamatkaCrossing"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Crossing Odds</FormLabel>
                          <div className="flex items-center gap-2">
                            <FormControl>
                              <Input type="number" min="0" step="0.01" {...field} />
                            </FormControl>
                            <span>x</span>
                          </div>
                          <FormDescription className="text-xs">
                            Multiplier for Crossing bets
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <DialogFooter className="pt-4">
                    <Button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500"
                      disabled={updateGameOddsMutation.isPending}
                    >
                      {updateGameOddsMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Updating Game Odds...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Save Game Odds
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Full-Screen User List Dialog */}
      <Dialog open={isUserListDialogOpen} onOpenChange={setIsUserListDialogOpen}>
        <DialogContent className="max-w-full h-[100vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="bg-slate-900 text-white p-6 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold text-white">
                Users assigned to {selectedSubadminName}
              </DialogTitle>
              <DialogDescription className="text-slate-300 text-sm mt-1">
                Manage users assigned to this subadmin
              </DialogDescription>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              onClick={() => setIsUserListDialogOpen(false)}
            >
              <X className="w-6 h-6" />
            </Button>
          </DialogHeader>
          
          <div className="flex-1 overflow-auto p-6 scrollbar-thin scrollbar-thumb-primary scrollbar-track-secondary">
            {isLoadingSubadminUsers ? (
              <div className="flex justify-center items-center h-96">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
                  <p className="text-slate-500">Loading users...</p>
                </div>
              </div>
            ) : (
              <>
                {!Array.isArray(subadminUsers) || subadminUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-96 text-center">
                    <Users className="w-16 h-16 text-slate-300 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No users found</h3>
                    <p className="text-slate-500 max-w-md">
                      There are no players assigned to {selectedSubadminName}. Players will appear here when they are assigned.
                    </p>
                  </div>
                ) : (
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between">
                        <CardTitle>Users List</CardTitle>
                        <Badge variant="outline" className="text-primary">
                          {Array.isArray(subadminUsers) ? subadminUsers.length : 0} Users
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Username</TableHead>
                              <TableHead>Balance</TableHead>
                              <TableHead>Creation Date</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Array.isArray(subadminUsers) && subadminUsers.map((user: any) => (
                              <TableRow key={user.id}>
                                <TableCell className="font-medium">
                                  {user.username}
                                </TableCell>
                                <TableCell>
                                  ₹{user.balance?.toFixed(2) || '0.00'}
                                </TableCell>
                                <TableCell>
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
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
                                      className="text-blue-500 border-blue-500/20 hover:bg-blue-500/10"
                                    >
                                      <Settings className="h-4 w-4 mr-2" />
                                      Discounts
                                    </Button>
                                    
                                    {user.isBlocked ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUnblockSubadmin(user.id)}
                                        className="text-green-500 border-green-500/20 hover:bg-green-500/10"
                                      >
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Unblock
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleBlockSubadmin(user.id)}
                                        className="text-red-500 border-red-500/20 hover:bg-red-500/10"
                                      >
                                        <Ban className="h-4 w-4 mr-2" />
                                        Block
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}