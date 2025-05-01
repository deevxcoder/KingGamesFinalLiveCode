import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
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
  const [location] = useLocation();
  
  // Create user dialog state
  const [isCreateUserDialogOpen, setIsCreateUserDialogOpen] = useState(false);
  
  // Get subadmin ID from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const subadminIdFromUrl = urlParams.get('id') ? parseInt(urlParams.get('id')!) : null;
  
  // Determine if this page is being viewed by an admin for a specific subadmin
  const isAdminViewingSubadmin = user?.role === UserRole.ADMIN && subadminIdFromUrl !== null;

  // Game Odds
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
      // Coin flip odds removed
      
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
                <CardTitle>Subadmin Commission Rates</CardTitle>
                <CardDescription>
                  Set the commission rates for this subadmin. These rates determine how much commission they earn from player bets.
                </CardDescription>
              </div>
              {!isEditingCommissions ? (
                <Button onClick={() => setIsEditingCommissions(true)} className="whitespace-nowrap">
                  Edit Rates
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditingCommissions(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveCommissionRates} disabled={saveCommissionMutation.isPending}>
                    {saveCommissionMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(adminCommissionRates).map(([gameType, rate]) => (
                  <div key={gameType} className="space-y-2">
                    <Label htmlFor={`commission-${gameType}`} className="capitalize">
                      {gameType.replace(/_/g, ' ')}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id={`commission-${gameType}`} 
                        value={rate} 
                        onChange={(e) => setAdminCommissionRates({
                          ...adminCommissionRates,
                          [gameType]: e.target.value
                        })} 
                        placeholder="0.0"
                        className="max-w-[100px]"
                        disabled={!isEditingCommissions}
                      />
                      <span>%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
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
      )}
    </DashboardLayout>
  );
}