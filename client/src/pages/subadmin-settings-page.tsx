import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

export default function SubadminSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("odds");

  // User selectors
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  
  // Game Odds
  const [coinFlipOdds, setCoinFlipOdds] = useState("1.90");
  const [satamatkaOdds, setSatamatkaOdds] = useState({
    single: "8.50",
    jodi: "85.00",
    patti: "135.00",
  });

  // User Discounts
  const [discountRates, setDiscountRates] = useState({
    coin_flip: "1.0",
    satamatka_single: "2.0",
    satamatka_jodi: "1.5",
    satamatka_patti: "1.0",
    team_match: "1.5"
  });

  // View commission rates from admin
  const [adminCommissionRates, setAdminCommissionRates] = useState({
    coin_flip: "0.0",
    satamatka_single: "0.0",
    satamatka_jodi: "0.0",
    satamatka_patti: "0.0",
    team_match: "0.0"
  });

  // Load admin odds as reference
  const { isLoading: isLoadingAdminOdds } = useQuery({
    queryKey: ['/api/game-odds', 'admin'],
    queryFn: async () => {
      const gameTypes = ['coin_flip', 'satamatka_single', 'satamatka_jodi', 'satamatka_patti'];
      const results = await Promise.all(
        gameTypes.map(type => apiRequest(`/api/game-odds?gameType=${type}`))
      );
      
      return {
        coinFlip: results[0],
        satamatka: {
          single: results[1],
          jodi: results[2],
          patti: results[3]
        }
      };
    },
    onSuccess: (data) => {
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
      
      if (data.satamatka.single && data.satamatka.single.length > 0) {
        const adminOdds = data.satamatka.single.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.single = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      if (data.satamatka.jodi && data.satamatka.jodi.length > 0) {
        const adminOdds = data.satamatka.jodi.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.jodi = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      if (data.satamatka.patti && data.satamatka.patti.length > 0) {
        const adminOdds = data.satamatka.patti.find((odd: any) => odd.setByAdmin);
        if (adminOdds) {
          updatedSatamatkaOdds.patti = (adminOdds.oddValue / 100).toFixed(2);
        }
      }
      
      setSatamatkaOdds(updatedSatamatkaOdds);
    }
  });

  // Load subadmin's own odds
  const { isLoading: isLoadingSubadminOdds } = useQuery({
    queryKey: ['/api/game-odds/subadmin', user?.id],
    queryFn: () => apiRequest(`/api/game-odds/subadmin/${user?.id}`),
    enabled: !!user?.id,
    onSuccess: (data) => {
      if (data && data.length > 0) {
        // Process each game type
        const coinFlipOdd = data.find((odd: any) => odd.gameType === 'coin_flip');
        if (coinFlipOdd) {
          setCoinFlipOdds((coinFlipOdd.oddValue / 100).toFixed(2));
        }
        
        const singleOdd = data.find((odd: any) => odd.gameType === 'satamatka_single');
        const jodiOdd = data.find((odd: any) => odd.gameType === 'satamatka_jodi');
        const pattiOdd = data.find((odd: any) => odd.gameType === 'satamatka_patti');
        
        const updatedOdds = { ...satamatkaOdds };
        
        if (singleOdd) {
          updatedOdds.single = (singleOdd.oddValue / 100).toFixed(2);
        }
        
        if (jodiOdd) {
          updatedOdds.jodi = (jodiOdd.oddValue / 100).toFixed(2);
        }
        
        if (pattiOdd) {
          updatedOdds.patti = (pattiOdd.oddValue / 100).toFixed(2);
        }
        
        setSatamatkaOdds(updatedOdds);
      }
    }
  });

  // Load commission rates (from admin to this subadmin)
  const { isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['/api/commissions/subadmin', user?.id],
    queryFn: () => apiRequest(`/api/commissions/subadmin/${user?.id}`),
    enabled: !!user?.id,
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

  // Get users assigned to this subadmin
  const { data: assignedUsers, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['/api/users/assigned'],
    queryFn: () => apiRequest('/api/users/assigned'),
    enabled: !!user?.id
  });

  // Load user discounts when a user is selected
  useQuery({
    queryKey: ['/api/discounts/user', selectedUserId],
    queryFn: () => apiRequest(`/api/discounts/user/${selectedUserId}`),
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
    
    // Save Satamatka odds
    const singleOddValue = Math.round(parseFloat(satamatkaOdds.single) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_single",
      oddValue: singleOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    const jodiOddValue = Math.round(parseFloat(satamatkaOdds.jodi) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_jodi",
      oddValue: jodiOddValue,
      setByAdmin: false,
      subadminId: user.id
    });
    
    const pattiOddValue = Math.round(parseFloat(satamatkaOdds.patti) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_patti",
      oddValue: pattiOddValue,
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

  return (
    <DashboardLayout title="Subadmin Settings">
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
                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="space-y-2">
                          <Label htmlFor="satamatka-single">Single Digit (0-9)</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-single" 
                              value={satamatkaOdds.single} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, single: e.target.value})} 
                              placeholder="8.50"
                              className="max-w-[120px]"
                            />
                            <span>×</span>
                          </div>
                        </div>
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
                          <Label htmlFor="satamatka-patti">Patti (000-999)</Label>
                          <div className="flex items-center gap-2">
                            <Input 
                              id="satamatka-patti" 
                              value={satamatkaOdds.patti} 
                              onChange={(e) => setSatamatkaOdds({...satamatkaOdds, patti: e.target.value})} 
                              placeholder="135.00"
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
              <CardTitle>User Discount Settings</CardTitle>
              <CardDescription>
                Set special discount rates for specific users. These discounts improve their winning payouts.
              </CardDescription>
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
                        ) : (
                          assignedUsers?.map((user: any) => (
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
                        <Label htmlFor="discount-satamatka-single">Satamatka Single Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-single" 
                            value={discountRates.satamatka_single} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_single: e.target.value})} 
                            placeholder="2.0"
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
                        <Label htmlFor="discount-satamatka-patti">Satamatka Patti Discount</Label>
                        <div className="flex items-center gap-2">
                          <Input 
                            id="discount-satamatka-patti" 
                            value={discountRates.satamatka_patti} 
                            onChange={(e) => setDiscountRates({...discountRates, satamatka_patti: e.target.value})} 
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
    </DashboardLayout>
  );
}