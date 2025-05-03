import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowUp, ArrowDown, FileCheck, CheckCircle, XCircle, Clock, IndianRupee, Wallet, History, Ban, CheckCircle2, CircleDollarSign, Landmark, Banknote, RefreshCw, CreditCard, User } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import { PaymentMode, RequestType, RequestStatus, WalletRequest, PaymentDetails } from "@/lib/types";

// Form schemas
const depositFormSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit amount is ₹100").max(100000, "Maximum deposit amount is ₹100,000"),
  paymentMode: z.enum(["upi", "bank"]),
  paymentDetails: z.object({
    upiId: z.string().optional(),
    transactionId: z.string().optional(),
    utrNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
    handlerName: z.string().optional(),
    handlerId: z.string().optional(),
  }),
  notes: z.string().optional(),
});

const withdrawalFormSchema = z.object({
  amount: z.coerce.number().min(500, "Minimum withdrawal amount is ₹500").max(50000, "Maximum withdrawal amount is ₹50,000"),
  paymentMode: z.enum(["upi", "bank"]),
  paymentDetails: z.object({
    upiId: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().optional(),
  }),
  notes: z.string().optional(),
});

type DepositFormValues = z.infer<typeof depositFormSchema>;
type WithdrawalFormValues = z.infer<typeof withdrawalFormSchema>;

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("balance");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [paymentModeDetails, setPaymentModeDetails] = useState<PaymentDetails | null>(null);

  // Fetch payment details from the system
  const { data: systemPaymentDetails, isLoading: loadingPaymentDetails } = useQuery<PaymentDetails>({
    queryKey: ["/api/wallet/payment-details"],
    queryFn: async ({ queryKey }) => {
      console.log("Fetching payment details from API...");
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (!res.ok) {
        console.error("Failed to fetch payment details:", res.status);
        throw new Error("Failed to fetch payment details");
      }
      const data = await res.json();
      console.log("Received payment details from API:", data);
      return data;
    }
  });
  
  // Set payment details when they are fetched
  useEffect(() => {
    if (systemPaymentDetails) {
      // Transform the API response to match the expected structure
      // Use exactly what the admin has set in payment settings
      const transformedDetails: PaymentDetails = {
        upiDetails: systemPaymentDetails.upi ? {
          upiId: systemPaymentDetails.upi.id,
          qrImageUrl: systemPaymentDetails.upi.qrCode || undefined
        } : undefined,
        bankDetails: systemPaymentDetails.bank ? {
          accountName: systemPaymentDetails.bank.accountHolder,
          accountNumber: systemPaymentDetails.bank.accountNumber,
          ifscCode: systemPaymentDetails.bank.ifscCode,
          bankName: systemPaymentDetails.bank.name
        } : undefined,
        cashDetails: systemPaymentDetails.cash ? {
          handlerName: systemPaymentDetails.cash.instructions,
          contactNumber: systemPaymentDetails.cash.contact || undefined
        } : undefined
      };
      
      setPaymentModeDetails(transformedDetails);
      console.log("Using admin-configured payment details:", transformedDetails);
    }
  }, [systemPaymentDetails]);

  // Fetch user's wallet requests
  const { 
    data: walletRequests = [], 
    isLoading: loadingRequests,
    refetch: refetchRequests
  } = useQuery<WalletRequest[]>({
    queryKey: ["/api/wallet/my-requests"],
    enabled: activeTab === "history" || activeTab === "balance",
  });
  
  // Fetch user's direct transactions (fund transfers, etc.)
  const {
    data: transactions = [],
    isLoading: loadingTransactions,
    refetch: refetchTransactions
  } = useQuery<any[]>({
    queryKey: ["/api/transactions"],
    enabled: activeTab === "history" || activeTab === "balance",
  });

  // File upload handler
  const handleProofImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setProofImage(e.target.files[0]);
    }
  };

  // Upload proof image
  const uploadProofImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("proofImage", file);

    try {
      const res = await fetch('/api/upload/proof', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await res.json();
      return data.imageUrl;
    } catch (error) {
      console.error("Upload error:", error);
      throw error;
    }
  };

  // Form for handling deposits
  const depositForm = useForm<DepositFormValues>({
    resolver: zodResolver(depositFormSchema),
    defaultValues: {
      amount: 0,
      paymentMode: "upi",
      paymentDetails: {},
      notes: "",
    },
  });

  // Form for handling withdrawals
  const withdrawalForm = useForm<WithdrawalFormValues>({
    resolver: zodResolver(withdrawalFormSchema),
    defaultValues: {
      amount: 0,
      paymentMode: "upi",
      paymentDetails: {},
      notes: "",
    },
  });

  // Create wallet request mutation
  const createRequestMutation = useMutation({
    mutationFn: async (data: {
      amount: number;
      requestType: RequestType;
      paymentMode: PaymentMode;
      paymentDetails: Record<string, string>;
      proofImageUrl?: string;
      notes?: string;
    }) => {
      const res = await apiRequest("POST", "/api/wallet/requests", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Request Submitted",
        description: "Your request has been submitted successfully and is pending approval.",
      });
      // Reset forms
      depositForm.reset();
      withdrawalForm.reset();
      setProofImage(null);
      
      // Refetch user data to update balance
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      // Refetch transactions data
      refetchRequests();
      refetchTransactions();
      
      // Switch to history tab
      setActiveTab("history");
    },
    onError: (error: Error) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle deposit form submission
  const handleDepositSubmit = async (values: DepositFormValues) => {
    try {
      // Filter out undefined values from payment details
      const paymentDetails: Record<string, string> = {};
      Object.entries(values.paymentDetails).forEach(([key, value]) => {
        if (value) paymentDetails[key] = value;
      });

      // Proof image is required for all payment methods
      if (!proofImage) {
        toast({
          title: "Error",
          description: "Please upload proof of payment",
          variant: "destructive",
        });
        return;
      }

      let imageUrl = undefined;
      
      // Upload proof image
      if (proofImage) {
        try {
          imageUrl = await uploadProofImage(proofImage);
        } catch (uploadError) {
          console.error("Image upload error:", uploadError);
          toast({
            title: "Upload Failed",
            description: "Failed to upload payment proof. Please try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Create deposit request
      await createRequestMutation.mutateAsync({
        amount: values.amount,
        requestType: RequestType.DEPOSIT,
        paymentMode: values.paymentMode as PaymentMode,
        paymentDetails,
        proofImageUrl: imageUrl,
        notes: values.notes,
      });
    } catch (error: any) {
      console.error("Deposit error:", error);
      toast({
        title: "Deposit Request Failed",
        description: error.message || "An error occurred while processing your deposit request.",
        variant: "destructive",
      });
    }
  };

  // Handle withdrawal form submission
  const handleWithdrawalSubmit = async (values: WithdrawalFormValues) => {
    try {
      // Check if user has sufficient balance
      if (user && user.balance < values.amount) {
        toast({
          title: "Insufficient Balance",
          description: "You don't have enough balance for this withdrawal.",
          variant: "destructive",
        });
        return;
      }

      // Filter out undefined values from payment details
      const paymentDetails: Record<string, string> = {};
      Object.entries(values.paymentDetails).forEach(([key, value]) => {
        if (value) paymentDetails[key] = value;
      });

      // Create withdrawal request
      await createRequestMutation.mutateAsync({
        amount: values.amount,
        requestType: RequestType.WITHDRAWAL,
        paymentMode: values.paymentMode as PaymentMode,
        paymentDetails,
        notes: values.notes,
      });
      
      // Success notification handled by the createRequestMutation onSuccess
      
    } catch (error: any) {
      console.error("Withdrawal error:", error);
      toast({
        title: "Withdrawal Request Failed",
        description: error.message || "An error occurred while processing your withdrawal request.",
        variant: "destructive",
      });
    }
  };

  // Get color and icon for request status
  const getStatusInfo = (status: RequestStatus) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return { 
          color: "text-green-600", 
          bgColor: "bg-green-100", 
          icon: <CheckCircle className="h-5 w-5 text-green-600" />
        };
      case RequestStatus.REJECTED:
        return { 
          color: "text-red-600", 
          bgColor: "bg-red-100", 
          icon: <XCircle className="h-5 w-5 text-red-600" />
        };
      case RequestStatus.PENDING:
      default:
        return { 
          color: "text-yellow-600", 
          bgColor: "bg-yellow-100", 
          icon: <Clock className="h-5 w-5 text-yellow-600" />
        };
    }
  };

  // Get title and icon for request type
  const getRequestTypeInfo = (type: RequestType) => {
    switch (type) {
      case RequestType.DEPOSIT:
        return { 
          title: "Deposit", 
          icon: <ArrowDown className="h-5 w-5 text-green-600" />
        };
      case RequestType.WITHDRAWAL:
        return { 
          title: "Withdrawal", 
          icon: <ArrowUp className="h-5 w-5 text-blue-600" />
        };
      default:
        return { 
          title: "Unknown", 
          icon: null
        };
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Payment mode fields - what to show based on selected payment mode
  const renderDepositPaymentFields = () => {
    const paymentMode = depositForm.watch("paymentMode");
    
    switch (paymentMode) {
      case "upi":
        return (
          <>
            <div className="space-y-2">

              <FormField
                control={depositForm.control}
                name="paymentDetails.utrNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>UTR Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter UTR number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Display system UPI details */}
            {paymentModeDetails?.upiDetails && (
              <div className="mt-4 p-4 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600">
                    <FileCheck className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-fuchsia-300">UPI Payment Details</h3>
                </div>
                <div className="pl-9">
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-slate-300"><strong className="text-slate-200">UPI ID:</strong> {paymentModeDetails.upiDetails.upiId}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      onClick={() => {
                        if (paymentModeDetails?.upiDetails?.upiId) {
                          navigator.clipboard.writeText(paymentModeDetails.upiDetails.upiId);
                          toast({
                            title: "Copied!",
                            description: "UPI ID copied to clipboard",
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                  {paymentModeDetails.upiDetails.qrImageUrl && (
                    <div className="mt-3">
                      <p className="text-slate-200 font-medium">Scan QR Code:</p>
                      <img 
                        src={paymentModeDetails.upiDetails.qrImageUrl} 
                        alt="UPI QR Code" 
                        className="w-48 h-48 mt-2 border border-slate-700 rounded-md"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        );
      
      case "bank":
        return (
          <>
            <div className="space-y-2">
              <FormField
                control={depositForm.control}
                name="paymentDetails.transactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter bank transfer reference" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Display system bank details */}
            {paymentModeDetails?.bankDetails && (
              <div className="mt-4 p-4 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600">
                    <FileCheck className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-fuchsia-300">Bank Transfer Details</h3>
                </div>
                <div className="pl-9">
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-slate-300"><strong className="text-slate-200">Account Name:</strong> {paymentModeDetails.bankDetails.accountName}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      onClick={() => {
                        if (paymentModeDetails?.bankDetails?.accountName) {
                          navigator.clipboard.writeText(paymentModeDetails.bankDetails.accountName);
                          toast({
                            title: "Copied!",
                            description: "Account name copied to clipboard",
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                  
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-slate-300"><strong className="text-slate-200">Account Number:</strong> {paymentModeDetails.bankDetails.accountNumber}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      onClick={() => {
                        if (paymentModeDetails?.bankDetails?.accountNumber) {
                          navigator.clipboard.writeText(paymentModeDetails.bankDetails.accountNumber);
                          toast({
                            title: "Copied!",
                            description: "Account number copied to clipboard",
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                  
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-slate-300"><strong className="text-slate-200">IFSC Code:</strong> {paymentModeDetails.bankDetails.ifscCode}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      onClick={() => {
                        if (paymentModeDetails?.bankDetails?.ifscCode) {
                          navigator.clipboard.writeText(paymentModeDetails.bankDetails.ifscCode);
                          toast({
                            title: "Copied!",
                            description: "IFSC code copied to clipboard",
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                  
                  <div className="mt-1 flex items-center gap-2">
                    <p className="text-slate-300"><strong className="text-slate-200">Bank Name:</strong> {paymentModeDetails.bankDetails.bankName}</p>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300"
                      onClick={() => {
                        if (paymentModeDetails?.bankDetails?.bankName) {
                          navigator.clipboard.writeText(paymentModeDetails.bankDetails.bankName);
                          toast({
                            title: "Copied!",
                            description: "Bank name copied to clipboard",
                          });
                        }
                      }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        );
      

      
      default:
        return null;
    }
  };

  const renderWithdrawalPaymentFields = () => {
    const paymentMode = withdrawalForm.watch("paymentMode");
    
    switch (paymentMode) {
      case "upi":
        return (
          <FormField
            control={withdrawalForm.control}
            name="paymentDetails.upiId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>UPI ID</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your UPI ID" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case "bank":
        return (
          <>
            <FormField
              control={withdrawalForm.control}
              name="paymentDetails.bankName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your bank name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={withdrawalForm.control}
              name="paymentDetails.accountNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your account number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={withdrawalForm.control}
              name="paymentDetails.ifscCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IFSC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter IFSC code" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Wallet">
      <div className="mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div 
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              activeTab === "balance" 
                ? "bg-slate-900/90 border-primary shadow-md" 
                : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
            }`}
            onClick={() => setActiveTab("balance")}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 rounded-full mb-2 ${
                activeTab === "balance" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                  : "bg-slate-800"
              }`}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <span className={`font-medium ${
                activeTab === "balance" ? "text-primary" : "text-slate-300"
              }`}>Balance</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              activeTab === "deposit" 
                ? "bg-slate-900/90 border-primary shadow-md" 
                : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
            }`}
            onClick={() => setActiveTab("deposit")}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 rounded-full mb-2 ${
                activeTab === "deposit" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                  : "bg-slate-800"
              }`}>
                <ArrowDown className="w-5 h-5 text-white" />
              </div>
              <span className={`font-medium ${
                activeTab === "deposit" ? "text-primary" : "text-slate-300"
              }`}>Deposit</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              activeTab === "withdraw" 
                ? "bg-slate-900/90 border-primary shadow-md" 
                : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
            }`}
            onClick={() => setActiveTab("withdraw")}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 rounded-full mb-2 ${
                activeTab === "withdraw" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                  : "bg-slate-800"
              }`}>
                <ArrowUp className="w-5 h-5 text-white" />
              </div>
              <span className={`font-medium ${
                activeTab === "withdraw" ? "text-primary" : "text-slate-300"
              }`}>Withdraw</span>
            </div>
          </div>
          
          <div 
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              activeTab === "history" 
                ? "bg-slate-900/90 border-primary shadow-md" 
                : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
            }`}
            onClick={() => setActiveTab("history")}
          >
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 rounded-full mb-2 ${
                activeTab === "history" 
                  ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                  : "bg-slate-800"
              }`}>
                <History className="w-5 h-5 text-white" />
              </div>
              <span className={`font-medium ${
                activeTab === "history" ? "text-primary" : "text-slate-300"
              }`}>History</span>
            </div>
          </div>
        </div>
      </div>
      
      <Tabs defaultValue="balance" value={activeTab} onValueChange={setActiveTab} className="w-full">

        {/* Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          <Card className="bg-slate-900/70 shadow-lg border border-slate-800">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center md:flex-row md:justify-between">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="p-3 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 mr-4">
                    <IndianRupee className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Current Balance</p>
                    <p className="text-3xl font-bold text-fuchsia-300">₹{user?.balance ? (user.balance / 100).toFixed(2) : '0.00'}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Last updated: {new Date().toLocaleDateString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button 
                    onClick={() => setActiveTab("deposit")}
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white"
                  >
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Deposit
                  </Button>
                  <Button 
                    onClick={() => setActiveTab("withdraw")} 
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Withdraw
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your most recent wallet activities</CardDescription>
            </CardHeader>
            <CardContent>
              {(loadingRequests || loadingTransactions) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (walletRequests.length === 0 && transactions.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent transactions found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Direct transactions from admin/subadmin */}
                  {transactions.slice(0, 3).map((transaction) => (
                    <div key={`tx-${transaction.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center">
                        <div className="mr-4">
                          {transaction.amount > 0 ? (
                            <ArrowDown className="h-5 w-5 text-green-600" />
                          ) : (
                            <ArrowUp className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">
                            {transaction.amount > 0 ? "Fund Credit" : "Fund Debit"}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> 
                              By {transaction.performer?.username || `Admin #${transaction.performedBy}`}
                              <span className="mx-1">•</span>
                              {formatDate(transaction.createdAt)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${transaction.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                          {transaction.amount > 0 ? "+" : ""}
                          ₹{(Math.abs(transaction.amount) / 100).toFixed(2)}
                        </span>
                        <div className={`p-1 rounded-full ${transaction.amount > 0 ? "bg-green-100" : "bg-red-100"}`}>
                          {transaction.amount > 0 ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <Ban className="h-5 w-5 text-red-600" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Deposit/Withdrawal requests */}
                  {walletRequests.slice(0, 3).map((request) => {
                    const { color, bgColor, icon } = getStatusInfo(request.status as RequestStatus);
                    const { title, icon: typeIcon } = getRequestTypeInfo(request.requestType as RequestType);
                    
                    return (
                      <div key={`req-${request.id}`} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="mr-4">
                            {typeIcon}
                          </div>
                          <div>
                            <h4 className="font-medium">{title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(request.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold">
                            ₹{request.amount.toFixed(2)}
                          </span>
                          <div className={`p-1 rounded-full ${bgColor}`}>
                            {icon}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => setActiveTab("history")}>
                View All Transactions
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Deposit Tab */}
        <TabsContent value="deposit">
          <Card>
            <CardHeader>
              <CardTitle>Add Funds</CardTitle>
              <CardDescription>
                Deposit money into your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...depositForm}>
                <form onSubmit={depositForm.handleSubmit(handleDepositSubmit)} className="space-y-6">
                  <FormField
                    control={depositForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter amount" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={depositForm.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            <div 
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                field.value === "upi" 
                                  ? "bg-slate-900/90 border-primary shadow-md" 
                                  : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
                              }`}
                              onClick={() => depositForm.setValue("paymentMode", "upi")}
                            >

                              <div className="flex flex-col items-center justify-center text-center">
                                <div className={`p-3 rounded-full mb-2 ${
                                  field.value === "upi" 
                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                                    : "bg-slate-800"
                                }`}>
                                  <IndianRupee className="w-5 h-5 text-white" />
                                </div>
                                <span className={`font-medium ${
                                  field.value === "upi" ? "text-primary" : "text-slate-300"
                                }`}>UPI</span>
                              </div>
                            </div>
                            
                            <div 
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                field.value === "bank" 
                                  ? "bg-slate-900/90 border-primary shadow-md" 
                                  : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
                              }`}
                              onClick={() => depositForm.setValue("paymentMode", "bank")}
                            >

                              <div className="flex flex-col items-center justify-center text-center">
                                <div className={`p-3 rounded-full mb-2 ${
                                  field.value === "bank" 
                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                                    : "bg-slate-800"
                                }`}>
                                  <Landmark className="w-5 h-5 text-white" />
                                </div>
                                <span className={`font-medium ${
                                  field.value === "bank" ? "text-primary" : "text-slate-300"
                                }`}>Bank</span>
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderDepositPaymentFields()}

                  {depositForm.watch("paymentMode") !== "cash" && (
                    <div className="space-y-2">
                      <Label htmlFor="proofImage">Payment Proof Image</Label>
                      <Input
                        id="proofImage"
                        type="file"
                        accept="image/*"
                        onChange={handleProofImageChange}
                        className="cursor-pointer"
                      />
                      {proofImage && (
                        <div className="mt-2">
                          <p className="text-sm text-green-600">
                            Image selected: {proofImage.name}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <FormField
                    control={depositForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Any additional information" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createRequestMutation.isPending}
                  >
                    {createRequestMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Deposit Request
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Withdraw Tab */}
        <TabsContent value="withdraw">
          <Card>
            <CardHeader>
              <CardTitle>Withdraw Funds</CardTitle>
              <CardDescription>
                Withdraw money from your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 rounded-lg bg-slate-900/70 border border-slate-800 text-slate-300">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600">
                    <IndianRupee className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-fuchsia-300">Your balance: ₹{user?.balance ? (user.balance / 100).toFixed(2) : '0.00'}</h3>
                </div>
                <p className="pl-9 text-sm text-slate-400">
                  Minimum withdrawal amount is ₹500. Maximum is ₹50,000.
                </p>
              </div>

              <Form {...withdrawalForm}>
                <form onSubmit={withdrawalForm.handleSubmit(handleWithdrawalSubmit)} className="space-y-6">
                  <FormField
                    control={withdrawalForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Amount (₹)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter amount" 
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={withdrawalForm.control}
                    name="paymentMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Withdrawal Method</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-2 gap-3">
                            <div 
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                field.value === "upi" 
                                  ? "bg-slate-900/90 border-primary shadow-md" 
                                  : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
                              }`}
                              onClick={() => withdrawalForm.setValue("paymentMode", "upi")}
                            >

                              <div className="flex flex-col items-center justify-center text-center">
                                <div className={`p-3 rounded-full mb-2 ${
                                  field.value === "upi" 
                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                                    : "bg-slate-800"
                                }`}>
                                  <IndianRupee className="w-5 h-5 text-white" />
                                </div>
                                <span className={`font-medium ${
                                  field.value === "upi" ? "text-primary" : "text-slate-300"
                                }`}>UPI</span>
                              </div>
                            </div>
                            
                            <div 
                              className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                field.value === "bank" 
                                  ? "bg-slate-900/90 border-primary shadow-md" 
                                  : "bg-slate-900/50 border-slate-800 hover:border-primary/40"
                              }`}
                              onClick={() => withdrawalForm.setValue("paymentMode", "bank")}
                            >

                              <div className="flex flex-col items-center justify-center text-center">
                                <div className={`p-3 rounded-full mb-2 ${
                                  field.value === "bank" 
                                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600" 
                                    : "bg-slate-800"
                                }`}>
                                  <Landmark className="w-5 h-5 text-white" />
                                </div>
                                <span className={`font-medium ${
                                  field.value === "bank" ? "text-primary" : "text-slate-300"
                                }`}>Bank</span>
                              </div>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderWithdrawalPaymentFields()}

                  <FormField
                    control={withdrawalForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Any additional information" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={createRequestMutation.isPending}
                  >
                    {createRequestMutation.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Submit Withdrawal Request
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  All your wallet transactions
                </CardDescription>
              </div>
              <Tabs defaultValue="all" className="w-full max-w-[400px]">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="transfers">Fund Transfers</TabsTrigger>
                  <TabsTrigger value="requests">Deposit/Withdraw</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent className="pt-4">
              {(loadingRequests || loadingTransactions) ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (walletRequests.length === 0 && transactions.length === 0) ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transaction history found.</p>
                </div>
              ) : (
                <>
                  {/* All Transactions Tab */}
                  <TabsContent value="all" className="mt-0">
                    <div className="space-y-4">
                      {/* Direct Fund Transfers from admin/subadmin */}
                      {transactions.map((transaction) => (
                        <div key={`tx-${transaction.id}`} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                              <div className="mr-4">
                                {transaction.amount > 0 ? (
                                  <ArrowDown className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ArrowUp className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {transaction.amount > 0 ? "Fund Credit" : "Fund Debit"} - 
                                  <span className={transaction.amount > 0 ? "text-green-600" : "text-red-600"}>
                                    {transaction.amount > 0 ? " +" : " "}
                                    ₹{(Math.abs(transaction.amount) / 100).toFixed(2)}
                                  </span>
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={transaction.amount > 0 ? "outline" : "secondary"}>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {transaction.performer?.username || `Admin #${transaction.performedBy}`}
                                </div>
                              </Badge>
                            </div>
                          </div>
                          
                          {transaction.description && (
                            <div className="px-4 pb-4 text-sm border-t bg-slate-50 dark:bg-slate-900/40">
                              <p className="mt-2"><strong>Description:</strong> {transaction.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                      
                      {/* Wallet Requests (deposits/withdrawals) */}
                      {walletRequests.map((request) => {
                        const { color, bgColor, icon } = getStatusInfo(request.status as RequestStatus);
                        const { title, icon: typeIcon } = getRequestTypeInfo(request.requestType as RequestType);
                        
                        return (
                          <div key={`req-${request.id}`} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center">
                                <div className="mr-4">
                                  {typeIcon}
                                </div>
                                <div>
                                  <h4 className="font-medium">{title} Request - ₹{request.amount.toFixed(2)}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(request.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full flex items-center ${bgColor}`}>
                                {icon}
                                <span className={`ml-1 text-sm font-medium ${color}`}>
                                  {request.status}
                                </span>
                              </div>
                            </div>

                            <div className="px-4 pb-4 text-sm border-t bg-slate-50 dark:bg-slate-900/40">
                              <p><strong>Payment Method:</strong> {request.paymentMode}</p>
                              
                              {/* Payment details based on payment mode */}
                              {request.paymentMode === PaymentMode.UPI && request.paymentDetails.upiId && (
                                <p><strong>UPI ID:</strong> {request.paymentDetails.upiId}</p>
                              )}
                              
                              {request.paymentMode === PaymentMode.BANK && (
                                <>
                                  {request.paymentDetails.bankName && 
                                    <p><strong>Bank:</strong> {request.paymentDetails.bankName}</p>}
                                  {request.paymentDetails.accountNumber && 
                                    <p><strong>Account:</strong> {request.paymentDetails.accountNumber}</p>}
                                </>
                              )}
                              
                              {request.status === RequestStatus.REJECTED && request.notes && (
                                <p className="mt-2 text-red-600">
                                  <strong>Reason:</strong> {request.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                  
                  {/* Fund Transfers Tab */}
                  <TabsContent value="transfers" className="mt-0">
                    <div className="space-y-4">
                      {transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No fund transfers found.</p>
                        </div>
                      ) : transactions.map((transaction) => (
                        <div key={`tx-only-${transaction.id}`} className="border rounded-lg overflow-hidden">
                          <div className="flex items-center justify-between p-4">
                            <div className="flex items-center">
                              <div className="mr-4">
                                {transaction.amount > 0 ? (
                                  <ArrowDown className="h-5 w-5 text-green-600" />
                                ) : (
                                  <ArrowUp className="h-5 w-5 text-red-600" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-medium">
                                  {transaction.amount > 0 ? "Fund Credit" : "Fund Debit"} - 
                                  <span className={transaction.amount > 0 ? "text-green-600" : "text-red-600"}>
                                    {transaction.amount > 0 ? " +" : " "}
                                    ₹{(Math.abs(transaction.amount) / 100).toFixed(2)}
                                  </span>
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {formatDate(transaction.createdAt)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={transaction.amount > 0 ? "outline" : "secondary"}>
                                <div className="flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {transaction.performer?.username || `Admin #${transaction.performedBy}`}
                                </div>
                              </Badge>
                            </div>
                          </div>
                          
                          {transaction.description && (
                            <div className="px-4 pb-4 text-sm border-t bg-slate-50 dark:bg-slate-900/40">
                              <p className="mt-2"><strong>Description:</strong> {transaction.description}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  {/* Deposit/Withdraw Requests Tab */}
                  <TabsContent value="requests" className="mt-0">
                    <div className="space-y-4">
                      {walletRequests.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No deposit/withdrawal requests found.</p>
                        </div>
                      ) : walletRequests.map((request) => {
                        const { color, bgColor, icon } = getStatusInfo(request.status as RequestStatus);
                        const { title, icon: typeIcon } = getRequestTypeInfo(request.requestType as RequestType);
                        
                        return (
                          <div key={`req-only-${request.id}`} className="border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between p-4">
                              <div className="flex items-center">
                                <div className="mr-4">
                                  {typeIcon}
                                </div>
                                <div>
                                  <h4 className="font-medium">{title} Request - ₹{request.amount.toFixed(2)}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(request.createdAt)}
                                  </p>
                                </div>
                              </div>
                              <div className={`px-3 py-1 rounded-full flex items-center ${bgColor}`}>
                                {icon}
                                <span className={`ml-1 text-sm font-medium ${color}`}>
                                  {request.status}
                                </span>
                              </div>
                            </div>

                            <div className="px-4 pb-4 text-sm border-t bg-slate-50 dark:bg-slate-900/40">
                              <p><strong>Payment Method:</strong> {request.paymentMode}</p>
                              
                              {/* Payment details based on payment mode */}
                              {request.paymentMode === PaymentMode.UPI && request.paymentDetails.upiId && (
                                <p><strong>UPI ID:</strong> {request.paymentDetails.upiId}</p>
                              )}
                              
                              {request.paymentMode === PaymentMode.BANK && (
                                <>
                                  {request.paymentDetails.bankName && 
                                    <p><strong>Bank:</strong> {request.paymentDetails.bankName}</p>}
                                  {request.paymentDetails.accountNumber && 
                                    <p><strong>Account:</strong> {request.paymentDetails.accountNumber}</p>}
                                </>
                              )}
                              
                              {request.status === RequestStatus.REJECTED && request.notes && (
                                <p className="mt-2 text-red-600">
                                  <strong>Reason:</strong> {request.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </TabsContent>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}