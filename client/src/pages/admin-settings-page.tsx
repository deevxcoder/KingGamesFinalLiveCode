import { useState } from "react";
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

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payment");

  // Payment Settings
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [ifscCode, setIfscCode] = useState("");

  // Game Odds Settings
  const [coinFlipOdds, setCoinFlipOdds] = useState("1.95");
  const [satamatkaOdds, setSatamatkaOdds] = useState({
    jodi: "90.00",
    harf: "9.00",
    crossing: "95.00",
    odd_even: "1.90",
  });

  // Subadmin Commission Settings
  const [commissionRates, setCommissionRates] = useState({
    coin_flip: "2.5",
    satamatka_jodi: "3.5",
    satamatka_harf: "4.0",
    satamatka_crossing: "3.0",
    satamatka_odd_even: "2.0",
    team_match: "3.0"
  });

  // Load payment settings
  const { isLoading: isLoadingPayment } = useQuery({
    queryKey: ['/api/settings', 'payment'],
    queryFn: () => apiRequest('/api/settings?type=payment'),
    onSuccess: (data) => {
      data.forEach((setting: any) => {
        switch (setting.settingKey) {
          case 'upi_id':
            setUpiId(setting.settingValue);
            break;
          case 'bank_name':
            setBankName(setting.settingValue);
            break;
          case 'account_number':
            setAccountNumber(setting.settingValue);
            break;
          case 'account_name':
            setAccountName(setting.settingValue);
            break;
          case 'ifsc_code':
            setIfscCode(setting.settingValue);
            break;
        }
      });
    }
  });

  // Load game odds
  const { isLoading: isLoadingOdds } = useQuery({
    queryKey: ['/api/game-odds', 'coin_flip'],
    queryFn: () => apiRequest('/api/game-odds?gameType=coin_flip'),
    onSuccess: (data) => {
      if (data && data.length > 0) {
        // Convert integer odds to decimal (250 -> "2.50")
        const oddValueDecimal = (data[0].oddValue / 100).toFixed(2);
        setCoinFlipOdds(oddValueDecimal);
      }
    }
  });

  // Load satamatka odds
  useQuery({
    queryKey: ['/api/game-odds', 'satamatka'],
    queryFn: async () => {
      const modes = ['jodi', 'harf', 'crossing', 'odd_even'];
      const results = await Promise.all(
        modes.map(mode => 
          apiRequest("GET", `/api/game-odds?gameType=satamatka_${mode}`)
            .then(res => res.json())
        )
      );
      
      return { 
        jodi: results[0], 
        harf: results[1], 
        crossing: results[2],
        odd_even: results[3] 
      };
    },
    onSuccess: (data) => {
      const updatedOdds = { ...satamatkaOdds };
      
      if (data.jodi && data.jodi.length > 0) {
        updatedOdds.jodi = (data.jodi[0].oddValue / 100).toFixed(2);
      }
      
      if (data.harf && data.harf.length > 0) {
        updatedOdds.harf = (data.harf[0].oddValue / 100).toFixed(2);
      }
      
      if (data.crossing && data.crossing.length > 0) {
        updatedOdds.crossing = (data.crossing[0].oddValue / 100).toFixed(2);
      }
      
      if (data.odd_even && data.odd_even.length > 0) {
        updatedOdds.odd_even = (data.odd_even[0].oddValue / 100).toFixed(2);
      }
      
      setSatamatkaOdds(updatedOdds);
    }
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (settings: any) => apiRequest('/api/settings', 'POST', settings),
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/settings'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Settings",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save game odds mutation
  const saveOddsMutation = useMutation({
    mutationFn: (odds: any) => apiRequest('/api/game-odds', 'POST', odds),
    onSuccess: () => {
      toast({
        title: "Game Odds Saved",
        description: "Your game odds have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/game-odds'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Game Odds",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save commission mutation
  const saveCommissionMutation = useMutation({
    mutationFn: (commission: any) => apiRequest('/api/commissions/subadmin', 'POST', commission),
    onSuccess: () => {
      toast({
        title: "Commission Rates Saved",
        description: "Commission rates have been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/commissions'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Commission Rates",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle payment settings save
  const handleSavePayment = () => {
    // Save UPI ID
    saveMutation.mutate({ 
      settingType: "payment", 
      settingKey: "upi_id", 
      settingValue: upiId 
    });
    
    // Save Bank Details
    saveMutation.mutate({ 
      settingType: "payment", 
      settingKey: "bank_name", 
      settingValue: bankName 
    });
    
    saveMutation.mutate({ 
      settingType: "payment", 
      settingKey: "account_number", 
      settingValue: accountNumber 
    });
    
    saveMutation.mutate({ 
      settingType: "payment", 
      settingKey: "account_name", 
      settingValue: accountName 
    });
    
    saveMutation.mutate({ 
      settingType: "payment", 
      settingKey: "ifsc_code", 
      settingValue: ifscCode 
    });
  };

  // Handle game odds save
  const handleSaveGameOdds = () => {
    // Save Coin Flip odds
    const coinFlipOddValue = Math.round(parseFloat(coinFlipOdds) * 100);
    saveOddsMutation.mutate({
      gameType: "coin_flip",
      oddValue: coinFlipOddValue,
      setByAdmin: true
    });
    
    // Save Satamatka odds
    const jodiOddValue = Math.round(parseFloat(satamatkaOdds.jodi) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_jodi",
      oddValue: jodiOddValue,
      setByAdmin: true
    });
    
    const harfOddValue = Math.round(parseFloat(satamatkaOdds.harf) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_harf",
      oddValue: harfOddValue,
      setByAdmin: true
    });
    
    const crossingOddValue = Math.round(parseFloat(satamatkaOdds.crossing) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_crossing",
      oddValue: crossingOddValue,
      setByAdmin: true
    });
    
    const oddEvenOddValue = Math.round(parseFloat(satamatkaOdds.odd_even) * 100);
    saveOddsMutation.mutate({
      gameType: "satamatka_odd_even",
      oddValue: oddEvenOddValue,
      setByAdmin: true
    });
  };

  return (
    <DashboardLayout title="Admin Settings">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="payment">Payment Settings</TabsTrigger>
          <TabsTrigger value="odds">Game Odds</TabsTrigger>
          <TabsTrigger value="commission">Subadmin Commission</TabsTrigger>
        </TabsList>
        
        {/* Payment Settings Tab */}
        <TabsContent value="payment">
          <Card>
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>
                Configure payment methods that users will use to deposit funds.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingPayment ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-medium">UPI Payment</h3>
                      <Separator className="my-2" />
                      <div className="space-y-2">
                        <Label htmlFor="upiId">UPI ID</Label>
                        <Input 
                          id="upiId" 
                          value={upiId} 
                          onChange={(e) => setUpiId(e.target.value)} 
                          placeholder="username@ybl"
                        />
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-medium">Bank Transfer</h3>
                      <Separator className="my-2" />
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name</Label>
                          <Input 
                            id="bankName" 
                            value={bankName} 
                            onChange={(e) => setBankName(e.target.value)} 
                            placeholder="Bank Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountName">Account Holder Name</Label>
                          <Input 
                            id="accountName" 
                            value={accountName} 
                            onChange={(e) => setAccountName(e.target.value)} 
                            placeholder="Account Holder Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input 
                            id="accountNumber" 
                            value={accountNumber} 
                            onChange={(e) => setAccountNumber(e.target.value)} 
                            placeholder="Account Number"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ifscCode">IFSC Code</Label>
                          <Input 
                            id="ifscCode" 
                            value={ifscCode} 
                            onChange={(e) => setIfscCode(e.target.value)} 
                            placeholder="IFSC Code"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSavePayment} 
                disabled={isLoadingPayment || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Payment Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Game Odds Tab */}
        <TabsContent value="odds">
          <Card>
            <CardHeader>
              <CardTitle>Game Odds Settings</CardTitle>
              <CardDescription>
                Configure the odds multipliers for different games. These settings determine how much players win.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingOdds ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
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
                            placeholder="1.95"
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
                              placeholder="90.00"
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
                              placeholder="9.00"
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
                          <Label htmlFor="satamatka-odd-even">Odd-Even</Label>
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
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleSaveGameOdds} 
                disabled={isLoadingOdds || saveOddsMutation.isPending}
              >
                {saveOddsMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Game Odds
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Commission Tab */}
        <TabsContent value="commission">
          <Card>
            <CardHeader>
              <CardTitle>Subadmin Commission Settings</CardTitle>
              <CardDescription>
                Set the commission percentage for subadmins on different game types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="commission-coin-flip">Coin Flip Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-coin-flip" 
                        value={commissionRates.coin_flip} 
                        onChange={(e) => setCommissionRates({...commissionRates, coin_flip: e.target.value})} 
                        placeholder="2.5"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission-satamatka-jodi">Satamatka Jodi Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-satamatka-jodi" 
                        value={commissionRates.satamatka_jodi} 
                        onChange={(e) => setCommissionRates({...commissionRates, satamatka_jodi: e.target.value})} 
                        placeholder="3.5"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission-satamatka-harf">Satamatka Harf Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-satamatka-harf" 
                        value={commissionRates.satamatka_harf} 
                        onChange={(e) => setCommissionRates({...commissionRates, satamatka_harf: e.target.value})} 
                        placeholder="4.0"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission-satamatka-crossing">Satamatka Crossing Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-satamatka-crossing" 
                        value={commissionRates.satamatka_crossing} 
                        onChange={(e) => setCommissionRates({...commissionRates, satamatka_crossing: e.target.value})} 
                        placeholder="3.0"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission-satamatka-odd-even">Satamatka Odd-Even Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-satamatka-odd-even" 
                        value={commissionRates.satamatka_odd_even} 
                        onChange={(e) => setCommissionRates({...commissionRates, satamatka_odd_even: e.target.value})} 
                        placeholder="2.0"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="commission-team-match">Team Match Commission</Label>
                    <div className="flex items-center gap-2">
                      <Input 
                        id="commission-team-match" 
                        value={commissionRates.team_match} 
                        onChange={(e) => setCommissionRates({...commissionRates, team_match: e.target.value})} 
                        placeholder="3.0"
                        className="max-w-[120px]"
                      />
                      <span>%</span>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground">
                    Note: These commission rates apply to all subadmins. To set individual commission rates for a specific subadmin, go to the Subadmin Management page.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={() => toast({
                title: "Commission Rates",
                description: "To apply commission rates, please select a subadmin from the Subadmin Management page.",
              })}>
                Apply to All Subadmins
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}