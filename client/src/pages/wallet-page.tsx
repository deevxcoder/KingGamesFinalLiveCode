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
import { Loader2, ArrowUp, ArrowDown, FileCheck, CheckCircle, XCircle, Clock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import { PaymentMode, RequestType, RequestStatus, WalletRequest, PaymentDetails } from "@/lib/types";

// Form schemas
const depositFormSchema = z.object({
  amount: z.coerce.number().min(100, "Minimum deposit amount is ₹100").max(100000, "Maximum deposit amount is ₹100,000"),
  paymentMode: z.enum(["upi", "bank", "cash"]),
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
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch payment details");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setPaymentModeDetails(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch user's wallet requests
  const { 
    data: walletRequests = [], 
    isLoading: loadingRequests,
    refetch: refetchRequests
  } = useQuery<WalletRequest[]>({
    queryKey: ["/api/wallet/my-requests"],
    enabled: activeTab === "history",
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
      
      // Switch to history tab
      setActiveTab("history");
      refetchRequests();
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
      // Validate if proof image is uploaded for deposits
      if (!proofImage) {
        toast({
          title: "Error",
          description: "Please upload proof of payment",
          variant: "destructive",
        });
        return;
      }

      // Upload proof image first
      const imageUrl = await uploadProofImage(proofImage);

      // Filter out undefined values from payment details
      const paymentDetails: Record<string, string> = {};
      Object.entries(values.paymentDetails).forEach(([key, value]) => {
        if (value) paymentDetails[key] = value;
      });

      // Create deposit request
      await createRequestMutation.mutateAsync({
        amount: values.amount,
        requestType: RequestType.DEPOSIT,
        paymentMode: values.paymentMode as PaymentMode,
        paymentDetails,
        proofImageUrl: imageUrl,
        notes: values.notes,
      });
    } catch (error) {
      console.error("Deposit error:", error);
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
    } catch (error) {
      console.error("Withdrawal error:", error);
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
                name="paymentDetails.transactionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction ID</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter UPI transaction ID" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
              <Alert className="mt-4 bg-blue-50">
                <FileCheck className="h-4 w-4" />
                <AlertTitle>UPI Payment Details</AlertTitle>
                <AlertDescription>
                  <p className="mt-2"><strong>UPI ID:</strong> {paymentModeDetails.upiDetails.upiId}</p>
                  {paymentModeDetails.upiDetails.qrImageUrl && (
                    <div className="mt-2">
                      <p><strong>Scan QR Code:</strong></p>
                      <img 
                        src={paymentModeDetails.upiDetails.qrImageUrl} 
                        alt="UPI QR Code" 
                        className="w-48 h-48 mt-2 border border-gray-300"
                      />
                    </div>
                  )}
                </AlertDescription>
              </Alert>
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

            {/* Display system bank details */}
            {paymentModeDetails?.bankDetails && (
              <Alert className="mt-4 bg-blue-50">
                <FileCheck className="h-4 w-4" />
                <AlertTitle>Bank Transfer Details</AlertTitle>
                <AlertDescription>
                  <p className="mt-2"><strong>Account Name:</strong> {paymentModeDetails.bankDetails.accountName}</p>
                  <p><strong>Account Number:</strong> {paymentModeDetails.bankDetails.accountNumber}</p>
                  <p><strong>IFSC Code:</strong> {paymentModeDetails.bankDetails.ifscCode}</p>
                  <p><strong>Bank Name:</strong> {paymentModeDetails.bankDetails.bankName}</p>
                </AlertDescription>
              </Alert>
            )}
          </>
        );
      
      case "cash":
        return (
          <>
            <FormField
              control={depositForm.control}
              name="paymentDetails.handlerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handler Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter handler's name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={depositForm.control}
              name="paymentDetails.handlerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Handler ID/Reference</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter handler's ID or reference" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Display system cash handler details */}
            {paymentModeDetails?.cashDetails && (
              <Alert className="mt-4 bg-blue-50">
                <FileCheck className="h-4 w-4" />
                <AlertTitle>Cash Handler Details</AlertTitle>
                <AlertDescription>
                  <p className="mt-2"><strong>Handler Name:</strong> {paymentModeDetails.cashDetails.handlerName}</p>
                  {paymentModeDetails.cashDetails.contactNumber && (
                    <p><strong>Contact:</strong> {paymentModeDetails.cashDetails.contactNumber}</p>
                  )}
                </AlertDescription>
              </Alert>
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
      <Tabs defaultValue="balance" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance">Balance</TabsTrigger>
          <TabsTrigger value="deposit">Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          <TabsTrigger value="history" className="col-span-3 mt-2">Transaction History</TabsTrigger>
        </TabsList>

        {/* Balance Tab */}
        <TabsContent value="balance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Balance</CardTitle>
              <CardDescription>Your current account balance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-6">
                <div className="text-4xl font-bold text-primary">₹{user?.balance.toFixed(2)}</div>
                <p className="text-sm text-muted-foreground mt-2">
                  Last updated: {new Date().toLocaleDateString('en-IN')}
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center gap-4">
              <Button onClick={() => setActiveTab("deposit")}>
                <ArrowDown className="mr-2 h-4 w-4" />
                Deposit
              </Button>
              <Button onClick={() => setActiveTab("withdraw")} variant="outline">
                <ArrowUp className="mr-2 h-4 w-4" />
                Withdraw
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your most recent wallet activities</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : walletRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No recent transactions found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletRequests.slice(0, 5).map((request) => {
                    const { color, bgColor, icon } = getStatusInfo(request.status as RequestStatus);
                    const { title, icon: typeIcon } = getRequestTypeInfo(request.requestType as RequestType);
                    
                    return (
                      <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                          <RadioGroup
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="upi" id="upi" />
                              <Label htmlFor="upi">UPI</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="bank" id="bank" />
                              <Label htmlFor="bank">Bank Transfer</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="cash" id="cash" />
                              <Label htmlFor="cash">Cash</Label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {renderDepositPaymentFields()}

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
              <Alert className="mb-6 bg-blue-50">
                <FileCheck className="h-4 w-4" />
                <AlertTitle>Your balance: ₹{user?.balance.toFixed(2)}</AlertTitle>
                <AlertDescription>
                  Minimum withdrawal amount is ₹500. Maximum is ₹50,000.
                </AlertDescription>
              </Alert>

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
                          <RadioGroup
                            defaultValue={field.value}
                            onValueChange={field.onChange}
                            className="flex flex-col space-y-1"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="upi" id="w-upi" />
                              <Label htmlFor="w-upi">UPI</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="bank" id="w-bank" />
                              <Label htmlFor="w-bank">Bank Transfer</Label>
                            </div>
                          </RadioGroup>
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
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All your wallet transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : walletRequests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No transaction history found.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {walletRequests.map((request) => {
                    const { color, bgColor, icon } = getStatusInfo(request.status as RequestStatus);
                    const { title, icon: typeIcon } = getRequestTypeInfo(request.requestType as RequestType);
                    
                    return (
                      <div key={request.id} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-4">
                          <div className="flex items-center">
                            <div className="mr-4">
                              {typeIcon}
                            </div>
                            <div>
                              <h4 className="font-medium">{title} - ₹{request.amount.toFixed(2)}</h4>
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

                        <div className="px-4 pb-4 text-sm">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}