import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Loader2, ChevronLeft, UserPlus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

// Schema for creating a new user
const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password must be at least 6 characters"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export default function SubadminSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("odds");
  const [location] = useLocation();
  
  // Create user dialog state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  
  // Get subadmin ID from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const subadminIdFromUrl = urlParams.get('id') ? parseInt(urlParams.get('id')!) : null;
  
  // Determine if this page is being viewed by an admin for a specific subadmin
  const isAdminViewingSubadmin = user?.role === UserRole.ADMIN && subadminIdFromUrl !== null;

  // User selectors
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Game Odds
  const [coinFlipOdds, setCoinFlipOdds] = useState("1.90");
  const [satamatkaOdds, setSatamatkaOdds] = useState({
    jodi: "85.00",
    harf: "50.00",
    crossing: "95.00",
    odd_even: "1.90",
  });


  // Commission rates - viewed from admin or edited by admin for subadmin
  const [adminCommissionRates, setAdminCommissionRates] = useState({
    coin_flip: "0.0",
    satamatka_jodi: "0.0",
    satamatka_harf: "0.0",
    satamatka_crossing: "0.0",
    satamatka_odd_even: "0.0",
    team_match: "0.0"
  });
  
  // Used to track if admin is editing commission rates
  const [isEditingCommissions, setIsEditingCommissions] = useState(false);

  // Load admin odds as reference
  const { isLoading: isLoadingAdminOdds } = useQuery({
    queryKey: ['/api/game-odds', 'admin'],
    queryFn: async () => {
      const gameTypes = [
        'coin_flip', 
        'satamatka_jodi', 
        'satamatka_harf', 
        'satamatka_crossing', 
        'satamatka_odd_even'
      ];
      const results = await Promise.all(
        gameTypes.map(type => apiRequest('GET', `/api/game-odds?gameType=${type}`))
      );
      
      return {
        coinFlip: results[0],
        satamatka: {
          jodi: results[1],
          harf: results[2],
          crossing: results[3],
          odd_even: results[4]
        }
      };
    },
    onSuccess: (data: any) => {
      if (data.coinFlip && data.coinFlip.length > 0) {
        // Find the admin-set odds (setByAdmin = true)
        const adminOdds = data.coinFlip.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          // Convert integer odds to decimal (250 -> "2.50")
          const oddValueDecimal = (adminOdds.oddValue / 100).toFixed(2);
          setCoinFlipOdds(oddValueDecimal);
        }
      }
      
      const updatedSatamatkaOdds = { ...satamatkaOdds };
      
      if (data.satamatka.jodi && data.satamatka.jodi.length > 0) {
        const adminOdds = data.satamatka.jodi.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.jodi = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      if (data.satamatka.harf && data.satamatka.harf.length > 0) {
        const adminOdds = data.satamatka.harf.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.harf = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      if (data.satamatka.crossing && data.satamatka.crossing.length > 0) {
        const adminOdds = data.satamatka.crossing.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.crossing = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      if (data.satamatka.odd_even && data.satamatka.odd_even.length > 0) {
        const adminOdds = data.satamatka.odd_even.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.odd_even = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      setSatamatkaOdds(updatedSatamatkaOdds);
    }
  });

  // Load subadmin's own odds
  const { isLoading: isLoadingSubadminOdds } = useQuery({
    queryKey: ['/api/game-odds/subadmin', user?.id],
    queryFn: () => apiRequest('GET', `/api/game-odds/subadmin/${user?.id}`),
    enabled: !!user?.id,
    onSuccess: (data: any) => {
      if (data && data.length > 0) {
        // Process each game type
        const coinFlipOdd = data.find((odd: any) => odd.gameType === 'coin_flip');
        if (coinFlipOdd) {
          setCoinFlipOdds((coinFlipOdd.oddValue / 100).toFixed(2));
        }
        
        const jodiOdd = data.find((odd: any) => odd.gameType === 'satamatka_jodi');
        const harfOdd = data.find((odd: any) => odd.gameType === 'satamatka_harf');
        const crossingOdd = data.find((odd: any) => odd.gameType === 'satamatka_crossing');
        const oddEvenOdd = data.find((odd: any) => odd.gameType === 'satamatka_odd_even');
        
        const updatedOdds = { ...satamatkaOdds };
        
        if (jodiOdd) {
          updatedOdds.jodi = (jodiOdd.oddValue / 100).toFixed(2);
        }
        
        if (harfOdd) {
          updatedOdds.harf = (harfOdd.oddValue / 100).toFixed(2);
        }
        
        if (crossingOdd) {
          updatedOdds.crossing = (crossingOdd.oddValue / 100).toFixed(2);
        }
        
        if (oddEvenOdd) {
          updatedOdds.odd_even = (oddEvenOdd.oddValue / 100).toFixed(2);
        }
        
        setSatamatkaOdds(updatedOdds);
      }
    }
  });

  // Load commission rates - either for current subadmin or for the subadmin being viewed by admin
  const { isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['/api/commissions/subadmin', isAdminViewingSubadmin ? subadminIdFromUrl : user?.id],
    queryFn: () => apiRequest('GET', `/api/commissions/subadmin/${isAdminViewingSubadmin ? subadminIdFromUrl : user?.id}`),
    enabled: !!(isAdminViewingSubadmin ? subadminIdFromUrl : user?.id),
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const updatedCommissions = { ...adminCommissionRates };
        
        data.forEach((commission: any) => {
          const gameType = commission.gameType;
          if (updatedCommissions.hasOwnProperty(gameType)) {
            updatedCommissions[gameType as keyof typeof updatedCommissions] = 
              (commission.commissionRate / 100).toFixed(1);
          }
        });
        
        setAdminCommissionRates(updatedCommissions);
      }
    }
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
  
  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (data: Omit<z.infer<typeof createUserSchema>, "confirmPassword">) => {
      return apiRequest('POST', '/api/register', {
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
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
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
  
  // Get users assigned to this subadmin
  const { isLoading: isLoadingUsers, data: assignedUsers = [] } = useQuery({
    queryKey: ['/api/users'],
    queryFn: () => apiRequest('GET', '/api/users'),
    enabled: !!user?.id && user?.role === UserRole.SUBADMIN,
    select: (data: any) => data.filter((u: any) => u.role === UserRole.PLAYER),
  });

  // Load user discounts when a user is selected
  useQuery({
    queryKey: ['/api/discounts/user', selectedUserId],
    queryFn: () => apiRequest('GET', `/api/discounts/user/${selectedUserId}`),
    enabled: !!selectedUserId,
    onSuccess: (data) => {
      if (data && data.length > 0) {
        const updatedDiscounts = { ...discountRates };
        
        data.forEach((discount: any) => {
          const gameType = discount.gameType;
          if (updatedDiscounts.hasOwnProperty(gameType)) {
            updatedDiscounts[gameType as keyof typeof updatedDiscounts] = 
              (discount.discountRate / 100).toFixed(1);
          }
        });
        
        setDiscountRates(updatedDiscounts);
      }
    }
  });

  // Save subadmin odds mutation
  const saveOddsMutation = useMutation({
    mutationFn: (odds: any) => apiRequest('/api/game-odds', 'POST', odds),
    onSuccess: () => {
      toast({
        title: "Game Odds Saved",
        description: "Your custom game odds have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/game-odds/subadmin'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Game Odds",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save user discount mutation
  const saveDiscountMutation = useMutation({
    mutationFn: (discount: any) => apiRequest('/api/discounts/user', 'POST', discount),
    onSuccess: () => {
      toast({
        title: "User Discount Saved",
        description: "The discount rates for this user have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/discounts/user'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Discount",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Save commission rate mutation (used by admin to set subadmin commissions)
  const saveCommissionMutation = useMutation({
    mutationFn: (commission: { subadminId: number, gameType: string, commissionRate: number }) => 
      apiRequest('/api/commissions/subadmin', 'POST', commission),
    onSuccess: () => {
      toast({
        title: "Commission Rate Saved",
        description: "The commission rate has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions/subadmin'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Commission Rate",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle game odds save
  const handleSaveGameOdds = () => {
    if (!user) return;
    
    // Save Coin Flip odds
    const coinFlipOddValue = Math.round(parseFloat(coinFlipOdds) * 100);
    saveOddsMutation.mutate({
      gameType: "coin_flip",
      oddValue: coinFlipOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    // Save Satamatka odds - Jodi
    const jodiOddValue = Math.round(parseFloat(satamatkaOdds.jodi) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_jodi",
      oddValue: jodiOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    // Save Satamatka odds - Harf
    const harfOddValue = Math.round(parseFloat(satamatkaOdds.harf) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_harf",
      oddValue: harfOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    // Save Satamatka odds - Crossing
    const crossingOddValue = Math.round(parseFloat(satamatkaOdds.crossing) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_crossing",
      oddValue: crossingOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    // Save Satamatka odds - Odd/Even
    const oddEvenOddValue = Math.round(parseFloat(satamatkaOdds.odd_even) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_odd_even",
      oddValue: oddEvenOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
  };

  // Handle user discount save
  const handleSaveUserDiscount = () => {
    if (!selectedUserId) {
      toast({
        title: "No User Selected",
        description: "Please select a user to apply the discount rates.",
        variant: "destructive",
      });
      return;
    }
    
    // Save discount rates for each game type
    Object.entries(discountRates).forEach(([gameType, rateStr]) => {
      const discountRate = Math.round(parseFloat(rateStr) * 100);
      saveDiscountMutation.mutate({
        userId: selectedUserId,
        gameType,
        discountRate
      });
    });
  };
  
  // Handle admin saving commission rates for a subadmin
  const handleSaveCommissionRates = () => {
    if (!subadminIdFromUrl || !isAdminViewingSubadmin) {
      toast({
        title: "Error",
        description: "Cannot save commission rates without a valid subadmin",
        variant: "destructive",
      });
      return;
    }
    
    // Save commission rates for each game type
    Object.entries(adminCommissionRates).forEach(([gameType, rateStr]) => {
      const commissionRate = Math.round(parseFloat(rateStr) * 100);
      saveCommissionMutation.mutate({
        subadminId: subadminIdFromUrl,
        gameType,
        commissionRate
      });
    });
    
    // After saving, exit edit mode
    setIsEditingCommissions(false);
  };

  return (
    <DashboardLayout title={isAdminViewingSubadmin ? "Subadmin Commission Settings" : "Subadmin Settings"}>
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
      
      {isAdminViewingSubadmin && (
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = "/subadmin-management"}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Subadmin Management
          </Button>
        </div>
      )}
      
      {isAdminViewingSubadmin ? (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Subadmin Commission Settings</CardTitle>
                <CardDescription>
                  Set commission percentages for this subadmin
                </CardDescription>
              </div>
              {!isEditingCommissions ? (
                <Button
                  onClick={() => setIsEditingCommissions(true)}
                  variant="outline"
                >
                  Edit Commission Rates
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsEditingCommissions(false)}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveCommissionRates}
                    disabled={saveCommissionMutation.isPending}
                  >
                    {saveCommissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Commission Rates
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingCommissions ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(adminCommissionRates).map(([gameType, rate]) => (
                    <div key={gameType} className="space-y-2">
                      <Label htmlFor={`commission-${gameType}`}>
                        {gameType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </Label>
                      <div className="flex items-center gap-2">
                        {isEditingCommissions ? (
                          <Input 
                            id={`commission-${gameType}`}
                            value={rate}
                            onChange={(e) => {
                              const newRates = {...adminCommissionRates};
                              newRates[gameType as keyof typeof adminCommissionRates] = e.target.value;
                              setAdminCommissionRates(newRates);
                            }}
                            placeholder="2.0"
                            className="max-w-[100px]"
                          />
                        ) : (
                          <div className="bg-secondary/50 px-3 py-2 rounded-md max-w-[100px] text-center">
                            {rate}
                          </div>
                        )}
                        <span>%</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> These commission rates determine how much the subadmin earns from player bets on different game types.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs 
          value={activeTab} 
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="odds">Game Odds</TabsTrigger>
            <TabsTrigger value="discounts">User Discounts</TabsTrigger>
          </TabsList>
          
          {/* Game Odds Tab */}
        <TabsContent value="odds">
          <Card>
            <CardHeader>
              <CardTitle>Custom Game Odds</CardTitle>
              <CardDescription>
                Set your own win multipliers for games. These will be applied to players assigned to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingAdminOdds || isLoadingSubadminOdds ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">Your Commission Rates</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        These are the commission rates you earn from player bets
                      </p>
                      <Separator className="my-2" />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                        {Object.entries(adminCommissionRates).map(([gameType, rate]) => (
                          <div key={gameType} className="bg-secondary/50 p-3 rounded-md">
                            <div className="text-sm font-medium capitalize">
                              {gameType.replace(/_/g, ' ')}
                            </div>
                            <div className="text-lg font-bold">{rate}%</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div>
                      <h3 className="text-lg font-medium">Coin Flip</h3>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <Label htmlFor="coinFlipOdds">Win Multiplier</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="coinFlipOdds" 
                            value={coinFlipOdds} 
                            onChange={(e) => setCoinFlipOdds(e.target.value)} 
                            placeholder="1.90"
                            className="max-w-[120px]"
                          />
                          <span>times the bet amount</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium">Satamatka</h3>
                      <Separator className="my-2" />
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                          <Label htmlFor="satamatka-jodi">Jodi (00-99)</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-jodi" 
                              value={satamatkaOdds.jodi} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, jodi: e.target.value})} 
                              placeholder="85.00"
                              className="max-w-[120px]"
                            />
                            <span>×</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="satamatka-harf">Harf</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-harf" 
                              value={satamatkaOdds.harf} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, harf: e.target.value})} 
                              placeholder="50.00"
                              className="max-w-[120px]"
                            />
                            <span>×</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="satamatka-crossing">Crossing</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-crossing" 
                              value={satamatkaOdds.crossing} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, crossing: e.target.value})} 
                              placeholder="95.00"
                              className="max-w-[120px]"
                            />
                            <span>×</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="satamatka-odd-even">Odd/Even</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-odd-even" 
                              value={satamatkaOdds.odd_even} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, odd_even: e.target.value})} 
                              placeholder="1.90"
                              className="max-w-[120px]"
                            />
                            <span>×</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Setting odds too high will affect your profit margin. Ensure they are balanced with your commission rates.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveGameOdds} 
                disabled={isLoadingAdminOdds || isLoadingSubadminOdds || saveOddsMutation.isPending}
              >
                {saveOddsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Game Odds
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* User Discounts Tab */}
        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>User Discount Settings</CardTitle>
                  <CardDescription>
                    Set special discount rates for specific users. These discounts improve their winning payouts.
                  </CardDescription>
                </div>
                {user?.role === UserRole.SUBADMIN && (
                  <Button
                    onClick={() => setIsCreateUserDialogOpen(true)}
                    className="flex items-center gap-1 whitespace-nowrap ml-auto"
                  >
                    <UserPlus className="h-4 w-4" />
                    Add User
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="user-select">Select User</Label>
                  <div className="mt-2">
                    <Select
                      value={selectedUserId?.toString() || ""}
                      onValueChange={(value) => setSelectedUserId(Number(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a user" />
                      </SelectTrigger>
                      <SelectContent>
                        {isLoadingUsers ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : assignedUsers.length === 0 ? (
                          <div className="p-3 text-center text-sm text-muted-foreground">
                            No users assigned to you. Add a user first.
                          </div>
                        ) : (
                          assignedUsers.map((user: any) => (
                            <SelectItem key={user.id} value={user.id.toString()}>
                              {user.username}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {selectedUserId ? (
                  <>
                    <Separator className="my-4" />
                    
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="discount-coin-flip">Coin Flip Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-coin-flip" 
                            value={discountRates.coin_flip} 
                            onChange={(e) => setDiscountRates({...discountRates, coin_flip: e.target.value})} 
                            placeholder="1.0"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discount-satamatka-jodi">Satamatka Jodi Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-jodi" 
                            value={discountRates.satamatka_jodi} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_jodi: e.target.value})} 
                            placeholder="1.5"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discount-satamatka-harf">Satamatka Harf Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-harf" 
                            value={discountRates.satamatka_harf} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_harf: e.target.value})} 
                            placeholder="2.0"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discount-satamatka-crossing">Satamatka Crossing Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-crossing" 
                            value={discountRates.satamatka_crossing} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_crossing: e.target.value})} 
                            placeholder="1.5"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discount-satamatka-odd-even">Satamatka Odd/Even Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-odd-even" 
                            value={discountRates.satamatka_odd_even} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_odd_even: e.target.value})} 
                            placeholder="1.0"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="discount-team-match">Team Match Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-team-match" 
                            value={discountRates.team_match} 
                            onChange={(e) => setDiscountRates({...discountRates, team_match: e.target.value})} 
                            placeholder="1.5"
                            className="max-w-[120px]"
                          />
                          <span>%</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Discounts give users better payouts which will reduce your profit margin. Use discounts strategically for your valuable players.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="bg-secondary/30 p-6 rounded-md text-center">
                    <p>Please select a user to configure discount rates</p>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveUserDiscount} 
                disabled={!selectedUserId || saveDiscountMutation.isPending}
              >
                {saveDiscountMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Discount Rates
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
      )}
    </DashboardLayout>
  );
}