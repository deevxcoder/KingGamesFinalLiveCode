import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import DashboardLayout from "@/components/dashboard-layout";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertCircle, ArrowLeft, Percent, Save, Info, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Define types for the API responses
interface Subadmin {
  id: number;
  username: string;
  role: string;
  balance: number;
  createdAt?: string;
}

interface CommissionItem {
  id?: number;
  subadminId: number;
  gameType: string;
  commissionRate: number;
}

interface GameOdd {
  id?: number;
  gameType: string;
  oddValue: number;
  setByAdmin: boolean;
  subadminId?: number;
}

interface UserDiscount {
  id?: number;
  userId: number;
  subadminId: number;
  gameType: string;
  discountRate: number;
}

interface Player {
  id: number;
  username: string;
  role: string;
  balance: number;
  assignedTo?: number;
  createdAt?: string;
}

// Form schema for the commission form
const commissionFormSchema = z.object({
  teamMatch: z.coerce.number().min(0).max(100),
  cricketToss: z.coerce.number().min(0).max(100),
  coinFlip: z.coerce.number().min(0).max(100),
  satamatkaJodi: z.coerce.number().min(0).max(100),
  satamatkaHarf: z.coerce.number().min(0).max(100),
  satamatkaOddEven: z.coerce.number().min(0).max(100),
  satamatkaCrossing: z.coerce.number().min(0).max(100),
});

// Form schema for the odds form
const oddsFormSchema = z.object({
  teamMatch: z.coerce.number().min(1),
  cricketToss: z.coerce.number().min(1),
  coinFlip: z.coerce.number().min(1),
  satamatkaJodi: z.coerce.number().min(1),
  satamatkaHarf: z.coerce.number().min(1),
  satamatkaOddEven: z.coerce.number().min(1),
  satamatkaCrossing: z.coerce.number().min(1),
});

// Form schema for the discount form
const discountFormSchema = z.object({
  teamMatch: z.coerce.number().min(0).max(100),
  cricketToss: z.coerce.number().min(0).max(100),
  coinFlip: z.coerce.number().min(0).max(100),
  satamatkaJodi: z.coerce.number().min(0).max(100),
  satamatkaHarf: z.coerce.number().min(0).max(100),
  satamatkaOddEven: z.coerce.number().min(0).max(100),
  satamatkaCrossing: z.coerce.number().min(0).max(100),
});

type CommissionFormValues = z.infer<typeof commissionFormSchema>;
type OddsFormValues = z.infer<typeof oddsFormSchema>;
type DiscountFormValues = z.infer<typeof discountFormSchema>;

export default function SubadminSettingsPage() {
  const { user } = useAuth();
  const [location] = useLocation();
  const queryParams = new URLSearchParams(location.split('?')[1] || '');
  
  // If no ID is provided in the URL, use the current logged-in user's ID (for subadmin viewing their own settings)
  const subadminId = queryParams.get('id') 
    ? parseInt(queryParams.get('id') || '0') 
    : user?.role === 'subadmin' ? user.id : null;
    
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("commission");

  // This could be a userId for setting discounts on users under a subadmin
  const userId = queryParams.get('userId') ? parseInt(queryParams.get('userId') || '0') : null;
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(userId);

  // Get subadmin details
  const { data: subadmin, isLoading: isLoadingSubadmin } = useQuery({
    queryKey: ['/api/users', subadminId],
    enabled: !!subadminId,
  });

  // Get commission settings
  const { data: commissions, isLoading: isLoadingCommissions } = useQuery({
    queryKey: ['/api/commissions/subadmin', subadminId],
    enabled: !!subadminId,
  });
  
  // Get admin game odds
  const { data: adminOdds, isLoading: isLoadingAdminOdds } = useQuery({
    queryKey: ['/api/odds/admin'],
    enabled: !!subadminId,
  });
  
  // Get subadmin game odds
  const { data: subadminOdds, isLoading: isLoadingSubadminOdds } = useQuery({
    queryKey: [`/api/odds/subadmin/${subadminId}`],
    enabled: !!subadminId,
  });
  
  // Get players assigned to this subadmin
  const { data: players, isLoading: isLoadingPlayers } = useQuery({
    queryKey: ['/api/users', { assignedTo: subadminId }],
    enabled: !!subadminId && activeTab === "discounts",
  });
  
  // Get player discounts if a player is selected
  const { data: playerDiscounts, isLoading: isLoadingPlayerDiscounts } = useQuery({
    queryKey: ['/api/discounts/user', selectedPlayerId, subadminId],
    enabled: !!selectedPlayerId && !!subadminId,
  });

  // Form for commission settings
  const commissionForm = useForm<CommissionFormValues>({
    resolver: zodResolver(commissionFormSchema),
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
  
  // Form for game odds settings
  const oddsForm = useForm<OddsFormValues>({
    resolver: zodResolver(oddsFormSchema),
    defaultValues: {
      teamMatch: 1.9,
      cricketToss: 1.9,
      coinFlip: 1.9,
      satamatkaJodi: 9,
      satamatkaHarf: 9,
      satamatkaOddEven: 1.9,
      satamatkaCrossing: 9,
    }
  });
  
  // Form for player discount settings
  const discountForm = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
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

  // Update commission mutation
  const updateCommissionMutation = useMutation({
    mutationFn: async (values: CommissionFormValues) => {
      const response = await fetch('/api/commissions/subadmin/' + subadminId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commissions: [
            { gameType: 'team_match', commissionRate: values.teamMatch },
            { gameType: 'cricket_toss', commissionRate: values.cricketToss },
            { gameType: 'coin_flip', commissionRate: values.coinFlip },
            { gameType: 'satamatka_jodi', commissionRate: values.satamatkaJodi },
            { gameType: 'satamatka_harf', commissionRate: values.satamatkaHarf },
            { gameType: 'satamatka_odd_even', commissionRate: values.satamatkaOddEven },
            { gameType: 'satamatka_crossing', commissionRate: values.satamatkaCrossing },
          ]
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update commission settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/commissions/subadmin', subadminId] });
      toast({
        title: "Commission settings updated",
        variant: "success",
        duration: 3000,
      });
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
  
  // Update game odds mutation
  const updateOddsMutation = useMutation({
    mutationFn: async (values: OddsFormValues) => {
      const response = await fetch('/api/odds/subadmin/' + subadminId, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          odds: [
            { gameType: 'team_match', oddValue: values.teamMatch },
            { gameType: 'cricket_toss', oddValue: values.cricketToss },
            { gameType: 'coin_flip', oddValue: values.coinFlip },
            { gameType: 'satamatka_jodi', oddValue: values.satamatkaJodi },
            { gameType: 'satamatka_harf', oddValue: values.satamatkaHarf },
            { gameType: 'satamatka_odd_even', oddValue: values.satamatkaOddEven },
            { gameType: 'satamatka_crossing', oddValue: values.satamatkaCrossing },
          ]
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update game odds settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/odds/subadmin/${subadminId}`] });
      toast({
        title: "Game odds settings updated",
        variant: "success",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update game odds settings",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });
  
  // Update player discount mutation
  const updateDiscountMutation = useMutation({
    mutationFn: async (values: DiscountFormValues) => {
      if (!selectedPlayerId) {
        throw new Error('No player selected');
      }
      
      const response = await fetch(`/api/discounts/user/${selectedPlayerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subadminId,
          discounts: [
            { gameType: 'team_match', discountRate: values.teamMatch },
            { gameType: 'cricket_toss', discountRate: values.cricketToss },
            { gameType: 'coin_flip', discountRate: values.coinFlip },
            { gameType: 'satamatka_jodi', discountRate: values.satamatkaJodi },
            { gameType: 'satamatka_harf', discountRate: values.satamatkaHarf },
            { gameType: 'satamatka_odd_even', discountRate: values.satamatkaOddEven },
            { gameType: 'satamatka_crossing', discountRate: values.satamatkaCrossing },
          ]
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update player discount settings');
      }
      
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discounts/user', selectedPlayerId, subadminId] });
      toast({
        title: "Player discount settings updated",
        variant: "success",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update player discount settings",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });
    }
  });

  // Handle commission form submission
  const onSubmitCommission = (values: CommissionFormValues) => {
    updateCommissionMutation.mutate(values);
  };
  
  // Handle odds form submission
  const onSubmitOdds = (values: OddsFormValues) => {
    updateOddsMutation.mutate(values);
  };
  
  // Handle discount form submission
  const onSubmitDiscount = (values: DiscountFormValues) => {
    updateDiscountMutation.mutate(values);
  };
  
  // Helper function to format game types for display
  const formatGameType = (gameType: string): string => {
    switch (gameType) {
      case 'team_match':
        return 'Team Match';
      case 'cricket_toss':
        return 'Cricket Toss';
      case 'coin_flip':
        return 'Coin Flip';
      case 'satamatka_jodi':
        return 'Jodi (Pair)';
      case 'satamatka_harf':
        return 'Harf';
      case 'satamatka_odd_even':
        return 'Odd/Even';
      case 'satamatka_crossing':
        return 'Crossing';
      default:
        return gameType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }
  };
  
  // Helper function to get maximum allowed discount based on commission percentage
  const getMaxDiscount = (gameType: string): number => {
    if (!commissions || !Array.isArray(commissions)) return 0;
    
    const commission = Array.isArray(commissions) ? commissions.find((c: CommissionItem) => c.gameType === gameType) : null;
    return commission ? commission.commissionRate / 100 : 0;
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
        satamatkaCrossing: 0,
      };

      commissions.forEach((commission: any) => {
        if (commission.gameType === 'team_match') {
          formValues.teamMatch = commission.commissionRate / 100;
        } else if (commission.gameType === 'cricket_toss') {
          formValues.cricketToss = commission.commissionRate / 100;
        } else if (commission.gameType === 'coin_flip') {
          formValues.coinFlip = commission.commissionRate / 100;
        } else if (commission.gameType === 'satamatka_jodi') {
          formValues.satamatkaJodi = commission.commissionRate / 100;
        } else if (commission.gameType === 'satamatka_harf') {
          formValues.satamatkaHarf = commission.commissionRate / 100;
        } else if (commission.gameType === 'satamatka_odd_even') {
          formValues.satamatkaOddEven = commission.commissionRate / 100;
        } else if (commission.gameType === 'satamatka_crossing') {
          formValues.satamatkaCrossing = commission.commissionRate / 100;
        }
      });

      commissionForm.reset(formValues);
    }
  }, [commissions, commissionForm]);
  
  // Set form values when odds data is loaded
  useEffect(() => {
    if (subadminOdds && Array.isArray(subadminOdds) && subadminOdds.length > 0) {
      const formValues: any = {
        teamMatch: 1.9,
        cricketToss: 1.9,
        coinFlip: 1.9,
        satamatkaJodi: 9,
        satamatkaHarf: 9,
        satamatkaOddEven: 1.9,
        satamatkaCrossing: 9,
      };

      subadminOdds.forEach((odd: any) => {
        if (odd.gameType === 'team_match') {
          formValues.teamMatch = odd.oddValue;
        } else if (odd.gameType === 'cricket_toss') {
          formValues.cricketToss = odd.oddValue;
        } else if (odd.gameType === 'coin_flip') {
          formValues.coinFlip = odd.oddValue;
        } else if (odd.gameType === 'satamatka_jodi') {
          formValues.satamatkaJodi = odd.oddValue;
        } else if (odd.gameType === 'satamatka_harf') {
          formValues.satamatkaHarf = odd.oddValue;
        } else if (odd.gameType === 'satamatka_odd_even') {
          formValues.satamatkaOddEven = odd.oddValue;
        } else if (odd.gameType === 'satamatka_crossing') {
          formValues.satamatkaCrossing = odd.oddValue;
        }
      });

      oddsForm.reset(formValues);
    }
  }, [subadminOdds, oddsForm]);
  
  // Set form values when player discount data is loaded
  useEffect(() => {
    if (playerDiscounts && Array.isArray(playerDiscounts) && playerDiscounts.length > 0 && selectedPlayerId) {
      const formValues: any = {
        teamMatch: 0,
        cricketToss: 0,
        coinFlip: 0,
        satamatkaJodi: 0,
        satamatkaHarf: 0,
        satamatkaOddEven: 0,
        satamatkaCrossing: 0,
      };

      playerDiscounts.forEach((discount: any) => {
        if (discount.gameType === 'team_match') {
          formValues.teamMatch = discount.discountRate;
        } else if (discount.gameType === 'cricket_toss') {
          formValues.cricketToss = discount.discountRate;
        } else if (discount.gameType === 'coin_flip') {
          formValues.coinFlip = discount.discountRate;
        } else if (discount.gameType === 'satamatka_jodi') {
          formValues.satamatkaJodi = discount.discountRate;
        } else if (discount.gameType === 'satamatka_harf') {
          formValues.satamatkaHarf = discount.discountRate;
        } else if (discount.gameType === 'satamatka_odd_even') {
          formValues.satamatkaOddEven = discount.discountRate;
        } else if (discount.gameType === 'satamatka_crossing') {
          formValues.satamatkaCrossing = discount.discountRate;
        }
      });

      discountForm.reset(formValues);
    }
  }, [playerDiscounts, discountForm, selectedPlayerId]);

  return (
    <DashboardLayout activeTab={user?.role === 'admin' ? 'subadmins' : 'settings'}>
      {user?.role === 'admin' && (
        <div className="mb-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Subadmins List
          </Button>
        </div>
      )}
      
      {isLoadingSubadmin ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : subadmin ? (
        <Card>
          <CardHeader>
            <CardTitle>
              {user?.role === 'admin' ? `Settings for ${subadmin.username}` : 'Settings'}
            </CardTitle>
            <CardDescription>
              Manage account settings, commission rates, and game odds
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="commission">
                  My Commission Rates
                </TabsTrigger>
                <TabsTrigger value="odds">
                  My Game Odds
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="commission">
                {isLoadingCommissions ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Alert>
                      <Info className="h-5 w-5" />
                      <AlertTitle>Commission Rates</AlertTitle>
                      <AlertDescription>
                        Commission rates determine how much of the player's bets you earn. These rates are set by the administrator.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4">Your Commission Structure</h3>
                        
                        {commissions && Array.isArray(commissions) && commissions.length > 0 ? (
                          <Card className="bg-muted/20">
                            <CardHeader className="pb-2">
                              <CardTitle className="text-base">Deposit Commission from Admin</CardTitle>
                              <CardDescription>
                                Your commission percentage when admin deposits funds to your account
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-col space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                  <span className="text-muted-foreground">Base Commission Rate:</span>
                                  <span className="text-xl font-bold text-primary">
                                    30.00%
                                  </span>
                                </div>
                                
                                <div className="bg-muted/40 p-4 rounded-md">
                                  <h4 className="font-semibold mb-2">How Commissions Work</h4>
                                  <ul className="space-y-2 text-sm text-muted-foreground">
                                    <li className="flex items-start">
                                      <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                                      You receive 30% commission when admin deposits funds to your account
                                    </li>
                                    <li className="flex items-start">
                                      <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                                      Commission applies to admin-subadmin fund transfers only, not to player transactions
                                    </li>
                                    <li className="flex items-start">
                                      <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                                      Commission is automatically calculated and added to your balance during deposits
                                    </li>
                                    <li className="flex items-start">
                                      <Check className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                                      Your players' bets and payouts do not affect your commission rate
                                    </li>
                                  </ul>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="p-4 border rounded-md">
                            <p className="text-center text-muted-foreground">
                              No commission rates have been set by the administrator yet.
                            </p>
                          </div>
                        )}
                      </div>
                      
                      <Alert variant="default" className="bg-muted">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Important Information</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 space-y-1 mt-2">
                            <li>The 30% commission applies only to deposits from admin to your account</li>
                            <li>When admin adds ₹1000 to your account, you actually receive ₹1300 (₹1000 + ₹300 commission)</li>
                            <li>Player deposits and withdrawals do not generate commission for you</li>
                            <li>Commission rates are set by the administrator and cannot be changed by subadmins</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="odds">
                {isLoadingAdminOdds || isLoadingSubadminOdds ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Alert>
                      <Info className="h-5 w-5" />
                      <AlertTitle>Game Odds</AlertTitle>
                      <AlertDescription>
                        Game odds determine payouts for player bets. These odds apply ONLY to players assigned to you and have no effect on other subadmins or unassigned players. The platform default odds (set by the administrator) apply to all other players.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Platform Default Odds</h3>
                          {adminOdds && Array.isArray(adminOdds) && adminOdds.length > 0 ? (
                            <Card className="bg-muted/30">
                              <CardContent className="pt-6">
                                <div className="space-y-2">
                                  {Array.isArray(adminOdds) && adminOdds.map((odd: GameOdd) => (
                                    <div key={odd.gameType} className="flex justify-between items-center border-b pb-2 last:border-0">
                                      <span className="font-medium">
                                        {odd.gameType === 'team_match' ? 'Team Match' : 
                                         odd.gameType === 'cricket_toss' ? 'Cricket Toss' : 
                                         odd.gameType === 'coin_flip' ? 'Coin Flip' : 
                                         odd.gameType === 'satamatka_jodi' ? 'Jodi (Pair)' : 
                                         odd.gameType === 'satamatka_harf' ? 'Harf' : 
                                         odd.gameType === 'satamatka_odd_even' ? 'Odd/Even' : 
                                         odd.gameType === 'satamatka_crossing' ? 'Crossing' : 
                                         odd.gameType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                      </span>
                                      <span className="text-lg font-mono font-bold">{odd.oddValue.toFixed(2)}x</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="p-4 border rounded-md">
                              <p className="text-center text-muted-foreground">
                                No game odds have been set by the administrator yet.
                              </p>
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <h3 className="text-lg font-medium mb-4">Your Players' Game Odds</h3>
                          {subadminOdds && Array.isArray(subadminOdds) && subadminOdds.length > 0 ? (
                            <Card className="bg-muted/30">
                              <CardContent className="pt-6">
                                <div className="space-y-2">
                                  {Array.isArray(subadminOdds) && subadminOdds.map((odd: GameOdd) => (
                                    <div key={odd.gameType} className="flex justify-between items-center border-b pb-2 last:border-0">
                                      <span className="font-medium">
                                        {odd.gameType === 'team_match' ? 'Team Match' : 
                                         odd.gameType === 'cricket_toss' ? 'Cricket Toss' : 
                                         odd.gameType === 'coin_flip' ? 'Coin Flip' : 
                                         odd.gameType === 'satamatka_jodi' ? 'Jodi (Pair)' : 
                                         odd.gameType === 'satamatka_harf' ? 'Harf' : 
                                         odd.gameType === 'satamatka_odd_even' ? 'Odd/Even' : 
                                         odd.gameType === 'satamatka_crossing' ? 'Crossing' : 
                                         odd.gameType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                                      </span>
                                      <span className="text-lg font-mono font-bold">{odd.oddValue.toFixed(2)}x</span>
                                    </div>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ) : (
                            <div className="p-4 border rounded-md">
                              <p className="text-center text-muted-foreground">
                                No game odds have been set for your account yet.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-6 border rounded-lg p-4 bg-card">
                        <h3 className="text-lg font-medium mb-4">Edit Your Players' Game Odds</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Modify the odds that apply to your assigned players. If you set odds higher than the platform defaults, any losses will be covered by your account.
                        </p>
                        
                        <Form {...oddsForm}>
                          <form onSubmit={oddsForm.handleSubmit(onSubmitOdds)} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <FormField
                                control={oddsForm.control}
                                name="teamMatch"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Team Match</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="cricketToss"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Cricket Toss</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="coinFlip"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Coin Flip</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="satamatkaJodi"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Jodi (Pair)</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="satamatkaHarf"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Harf</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="satamatkaOddEven"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Odd/Even</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={oddsForm.control}
                                name="satamatkaCrossing"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Crossing Bet</FormLabel>
                                    <FormControl>
                                      <Input type="number" step="0.1" min="1.0" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div className="flex justify-end">
                              <Button 
                                type="submit" 
                                disabled={updateOddsMutation.isPending}
                                className="flex items-center gap-2"
                              >
                                {updateOddsMutation.isPending && <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>}
                                <Save className="h-4 w-4 mr-1" /> Save Game Odds
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </div>
                      
                      <Alert variant="default" className="bg-muted mt-4">
                        <AlertCircle className="h-5 w-5" />
                        <AlertTitle>Important Notes</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 space-y-1">
                            <li><strong>IMPORTANT:</strong> These odds ONLY affect players assigned directly to you.</li>
                            <li>Players assigned to other subadmins or directly to the administrator will use the Platform Default Odds instead.</li>
                            <li>If you set odds higher than the platform defaults, any losses will be covered by your account balance.</li>
                            <li>Setting odds higher than platform defaults increases player payouts but reduces your profit margin.</li>
                          </ul>
                        </AlertDescription>
                      </Alert>
                    </div>
                  </div>
                )}
              </TabsContent>
              
              {/* Removed Player Discounts & Odds tab - this functionality exists in user management player list */}
            </Tabs>
          </CardContent>
        </Card>
      ) : (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Subadmin not found. Please check the ID and try again.
          </AlertDescription>
        </Alert>
      )}
    </DashboardLayout>
  );
}
