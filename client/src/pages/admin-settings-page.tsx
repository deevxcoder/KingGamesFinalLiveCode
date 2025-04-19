import { useState, useEffect, useRef } from "react";
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
import { Loader2, Upload, X, Info, Trash2, RefreshCw } from "lucide-react";

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("payment");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment Settings
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  
  // Slider Images State
  const [sliderImages, setSliderImages] = useState<{filename: string, url: string}[]>([]);
  const [isUploading, setIsUploading] = useState(false);

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
  const { data: paymentSettings, isLoading: isLoadingPayment } = useQuery<any[]>({
    queryKey: ['/api/settings', 'payment'],
    queryFn: () => apiRequest("GET", '/api/settings?type=payment')
      .then(res => res.json()),
  });

  // Process payment settings when they load
  useEffect(() => {
    if (paymentSettings) {
      paymentSettings.forEach((setting: any) => {
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
  }, [paymentSettings]);

  // Load game odds
  const { data: coinFlipOddsData, isLoading: isLoadingOdds } = useQuery<any[]>({
    queryKey: ['/api/game-odds', 'coin_flip'],
    queryFn: () => apiRequest("GET", '/api/game-odds?gameType=coin_flip')
      .then(res => res.json()),
  });

  // Process coin flip odds when they load
  useEffect(() => {
    if (coinFlipOddsData && coinFlipOddsData.length > 0) {
      // Convert integer odds to decimal (250 -> "2.50")
      const oddValueDecimal = (coinFlipOddsData[0].oddValue / 100).toFixed(2);
      setCoinFlipOdds(oddValueDecimal);
    }
  }, [coinFlipOddsData]);

  // Load satamatka odds
  const { data: satamatkaOddsData } = useQuery<any>({
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
  });

  // Process satamatka odds when they load
  useEffect(() => {
    if (satamatkaOddsData) {
      const updatedOdds = { ...satamatkaOdds };
      
      if (satamatkaOddsData.jodi && satamatkaOddsData.jodi.length > 0) {
        updatedOdds.jodi = (satamatkaOddsData.jodi[0].oddValue / 100).toFixed(2);
      }
      
      if (satamatkaOddsData.harf && satamatkaOddsData.harf.length > 0) {
        updatedOdds.harf = (satamatkaOddsData.harf[0].oddValue / 100).toFixed(2);
      }
      
      if (satamatkaOddsData.crossing && satamatkaOddsData.crossing.length > 0) {
        updatedOdds.crossing = (satamatkaOddsData.crossing[0].oddValue / 100).toFixed(2);
      }
      
      if (satamatkaOddsData.odd_even && satamatkaOddsData.odd_even.length > 0) {
        updatedOdds.odd_even = (satamatkaOddsData.odd_even[0].oddValue / 100).toFixed(2);
      }
      
      setSatamatkaOdds(updatedOdds);
    }
  }, [satamatkaOddsData]);
  
  // Load slider images
  const { 
    data: sliderImagesData, 
    isLoading: isLoadingSliderImages,
    refetch: refetchSliderImages
  } = useQuery<{filename: string, url: string}[]>({
    queryKey: ['/api/sliders'],
    queryFn: () => apiRequest("GET", '/api/sliders')
      .then(res => res.json()),
  });
  
  // Update slider images when data is loaded
  useEffect(() => {
    if (sliderImagesData) {
      setSliderImages(sliderImagesData);
    }
  }, [sliderImagesData]);
  
  // Upload slider image mutation
  const uploadSliderMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch('/api/upload/slider', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload image');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image Uploaded",
        description: "Slider image has been uploaded successfully.",
      });
      refetchSliderImages();
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    }
  });
  
  // Delete slider image mutation
  const deleteSliderMutation = useMutation({
    mutationFn: (filename: string) => 
      apiRequest("DELETE", `/api/sliders/${filename}`)
        .then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Image Deleted",
        description: "Slider image has been deleted successfully.",
      });
      refetchSliderImages();
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (settings: any) => apiRequest("POST", '/api/settings', settings)
      .then(res => res.json()),
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
    mutationFn: (odds: any) => apiRequest("POST", '/api/game-odds', odds)
      .then(res => res.json()),
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
    mutationFn: (commission: any) => apiRequest("POST", '/api/commissions/subadmin', commission)
      .then(res => res.json()),
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

  // Additional mutation to update wallet payment details
  const saveWalletPaymentDetailsMutation = useMutation({
    mutationFn: (details: any) => apiRequest("PUT", '/api/wallet/payment-details', details)
      .then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Payment Details Saved",
        description: "Payment details have been updated for wallet deposits.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallet/payment-details'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error Saving Payment Details",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handle payment settings save
  const handleSavePayment = () => {
    // Save individual settings
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
    
    // IMPORTANT: Also update the wallet payment details for the client interface
    saveWalletPaymentDetailsMutation.mutate({
      upi: {
        id: upiId,
        qrCode: null
      },
      bank: {
        name: bankName,
        accountNumber: accountNumber,
        ifscCode: ifscCode,
        accountHolder: accountName
      },
      cash: {
        instructions: "Contact administrator for cash payment"
      }
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
  
  // Handle slider image upload
  const handleSliderImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('sliderImage', file);
    
    setIsUploading(true);
    uploadSliderMutation.mutate(formData);
    
    // Reset the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Handle slider image delete
  const handleDeleteSliderImage = (filename: string) => {
    if (confirm('Are you sure you want to delete this slider image?')) {
      deleteSliderMutation.mutate(filename);
    }
  };

  return (
    <DashboardLayout title="Admin Settings">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="payment">Payment Settings</TabsTrigger>
          <TabsTrigger value="odds">Game Odds</TabsTrigger>
          <TabsTrigger value="commission">Subadmin Commission</TabsTrigger>
          <TabsTrigger value="slider">Promo Slider</TabsTrigger>
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
                      <h3 className="text-lg font-medium">Royal Toss Game</h3>
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
                    <Label htmlFor="commission-coin-flip">Royal Toss Commission</Label>
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
        
        {/* Slider Settings Tab */}
        <TabsContent value="slider">
          <Card>
            <CardHeader>
              <CardTitle>Promo Slider Settings</CardTitle>
              <CardDescription>
                Manage the promotional slider images shown on the player dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoadingSliderImages ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                        <div>
                          <h3 className="text-sm font-medium text-blue-400">Image Requirements</h3>
                          <p className="text-sm text-slate-400 mt-1">
                            For best results, upload images with a 4:1 aspect ratio (e.g., 1200×300 pixels).
                            Images should be less than 2MB in size and in JPG, PNG, or WebP format.
                            Images will be displayed at a height of 180px on all devices, with responsive width.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-4">
                        <Button
                          onClick={() => fileInputRef.current?.click()}
                          className="gap-2"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4" />
                          )}
                          Upload New Image
                        </Button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept="image/*"
                          onChange={handleSliderImageUpload}
                        />
                        
                        <Button
                          variant="outline"
                          onClick={() => refetchSliderImages()}
                          size="icon"
                          title="Refresh slider images"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {sliderImages.length === 0 ? (
                        <div className="py-8 px-4 text-center bg-slate-800/30 border border-dashed border-slate-700 rounded-lg">
                          <p className="text-slate-400">No slider images uploaded yet. Upload some images to display in the promotional slider.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {sliderImages.map((image) => (
                            <div 
                              key={image.filename} 
                              className="relative group overflow-hidden rounded-lg border border-slate-700"
                            >
                              <img 
                                src={image.url} 
                                alt={`Slider image ${image.filename}`}
                                className="w-full h-40 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleDeleteSliderImage(image.filename)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-xs p-2 truncate">
                                {image.filename}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between border-t border-slate-800 pt-4">
              <div className="text-sm text-slate-400">
                Total Images: {sliderImages.length}
              </div>
              <div className="text-sm text-slate-400">
                Images are displayed in the order they were uploaded
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}