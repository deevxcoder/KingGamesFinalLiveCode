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
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { formatDistance } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/dashboard-layout";
import { PaymentMode, RequestType, RequestStatus, WalletRequest, PaymentDetails } from "@/lib/types";

// API response type for payment details
interface SystemPaymentDetails {
  upi?: {
    id: string;
    qrCode: string | null;
  };
  bank?: {
    name: string;
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
}

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
  const [location, setLocation] = useLocation();
  
  // Extract tab parameter from URL or default to "balance"
  const getTabFromUrl = () => {
    const searchParams = new URLSearchParams(window.location.search);
    const tab = searchParams.get('tab');
    
    // Check if user is a direct player (assigned to admin or null)
    const isDirectPlayer = user?.role === "player" && (!user.assignedTo || user.assignedTo === 1);
    
    // Only direct players can access deposit/withdraw tabs
    if (!isDirectPlayer && (tab === 'deposit' || tab === 'withdraw')) {
      return 'balance';
    }
    
    // Only allow valid tabs
    return tab === 'deposit' || tab === 'withdraw' || tab === 'history' ? tab : 'balance';
  };
  
  const [activeTab, setActiveTab] = useState(getTabFromUrl());
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [paymentModeDetails, setPaymentModeDetails] = useState<PaymentDetails | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  
  // Update URL when tab changes
  const updateTab = (tab: string) => {
    setActiveTab(tab);
    // Update URL with tab parameter
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set('tab', tab);
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.replaceState(null, '', newUrl);
  };

  // Fetch payment details from the system
  const { data: systemPaymentDetails, isLoading: loadingPaymentDetails } = useQuery<SystemPaymentDetails>({
    queryKey: ["/api/wallet/payment-details"],
    queryFn: async ({ queryKey }) => {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });
      if (!res.ok) {
        throw new Error("Failed to fetch payment details");
      }
      const data = await res.json();
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
        } : undefined
      };
      
      setPaymentModeDetails(transformedDetails);
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
    enabled: activeTab === "history" || activeTab === "balance"
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
      throw error;
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

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Wallet</h1>
          <p className="text-muted-foreground">Manage your account balance and transactions</p>
        </div>

        <Tabs value={activeTab} onValueChange={updateTab}>
          {(() => {
            // Check if user is a direct player (assigned to admin or null)
            const isDirectPlayer = user?.role === "player" && (!user.assignedTo || user.assignedTo === 1);
            
            if (isDirectPlayer) {
              return (
                <TabsList className="grid w-full grid-cols-4 mb-8">
                  <TabsTrigger value="balance">Balance</TabsTrigger>
                  <TabsTrigger value="deposit">Deposit</TabsTrigger>
                  <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              );
            } else {
              return (
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="balance">Balance</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              );
            }
          })()}

          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Wallet className="h-5 w-5 mr-2" />
                  Current Balance
                </CardTitle>
                <CardDescription>
                  Your available account balance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  ₹{user ? (user.balance / 100).toFixed(2) : '0.00'}
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" onClick={() => updateTab("history")}>
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
                <form className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount (₹)</Label>
                    <Input 
                      id="deposit-amount"
                      type="number" 
                      placeholder="Enter amount (min ₹100)" 
                      min="100"
                      max="100000"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Payment Method</Label>
                    <RadioGroup defaultValue="upi">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upi" id="upi" />
                        <Label htmlFor="upi">UPI Payment</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank" id="bank" />
                        <Label htmlFor="bank">Bank Transfer</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {paymentModeDetails?.upiDetails && (
                    <div className="p-4 border rounded-lg bg-muted/50">
                      <h4 className="font-medium mb-2">UPI Payment Details</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        Pay to: <span className="font-mono">{paymentModeDetails.upiDetails.upiId}</span>
                      </p>
                      {paymentModeDetails.upiDetails.qrImageUrl && (
                        <div className="mt-2">
                          <img 
                            src={paymentModeDetails.upiDetails.qrImageUrl} 
                            alt="QR Code" 
                            className="w-32 h-32 border rounded"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="transaction-id">Transaction ID</Label>
                    <Input 
                      id="transaction-id"
                      placeholder="Enter your transaction ID" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="proof-upload">Payment Proof (Screenshot)</Label>
                    <Input 
                      id="proof-upload"
                      type="file" 
                      accept="image/*"
                    />
                  </div>

                  <Button className="w-full">
                    Submit Deposit Request
                  </Button>
                </form>
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
                <div className="mb-6 p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-full bg-primary">
                      <IndianRupee className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold">Your balance: ₹{user?.balance ? (user.balance / 100).toFixed(2) : '0.00'}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Minimum withdrawal amount is ₹500. Maximum is ₹50,000.
                  </p>
                </div>

                <form className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="withdraw-amount">Amount (₹)</Label>
                    <Input 
                      id="withdraw-amount"
                      type="number" 
                      placeholder="Enter amount (min ₹500)" 
                      min="500"
                      max="50000"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Withdrawal Method</Label>
                    <RadioGroup defaultValue="upi">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="upi" id="withdraw-upi" />
                        <Label htmlFor="withdraw-upi">UPI</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="bank" id="withdraw-bank" />
                        <Label htmlFor="withdraw-bank">Bank Transfer</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="upi-id">UPI ID</Label>
                    <Input 
                      id="upi-id"
                      placeholder="your-upi@bank" 
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdraw-notes">Notes (Optional)</Label>
                    <Input 
                      id="withdraw-notes"
                      placeholder="Any additional information" 
                    />
                  </div>

                  <Button className="w-full">
                    Submit Withdrawal Request
                  </Button>
                </form>
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
                    All your wallet transactions with running balance
                  </CardDescription>
                </div>
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
                    {/* Mobile-optimized transaction table */}
                    {(() => {
                      // Combine and sort all transactions by date (newest first)
                      const allTransactions = [
                        ...walletRequests.map(request => ({
                          id: `req-${request.id}`,
                          isRequest: true,
                          createdAt: request.createdAt,
                          data: request
                        })),
                        ...transactions.map(tx => ({
                          id: `tx-${tx.id}`,
                          isRequest: false,
                          createdAt: tx.createdAt,
                          data: tx
                        }))
                      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                      
                      // Pagination
                      const totalItems = allTransactions.length;
                      const totalPages = Math.ceil(totalItems / itemsPerPage);
                      const startIndex = (currentPage - 1) * itemsPerPage;
                      const currentItems = allTransactions.slice(startIndex, startIndex + itemsPerPage);
                      
                      return (
                        <>
                          {/* Enhanced Transaction Table with Full Details */}
                          <div className="overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[120px]">Date & Time</TableHead>
                                  <TableHead>Transaction Details</TableHead>
                                  <TableHead className="text-right">Amount</TableHead>
                                  <TableHead className="text-right">Balance After</TableHead>
                                  <TableHead className="w-[100px]">Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {(() => {
                                  // Calculate running balance for transactions displayed on current page
                                  let currentBalance = user?.balance || 0;
                                  
                                  // First, calculate the starting balance for this page by working backwards from current balance
                                  // through all transactions before the current page
                                  const transactionsBeforePage = allTransactions.slice(0, startIndex);
                                  let balanceAtPageStart = currentBalance;
                                  
                                  for (let i = 0; i < transactionsBeforePage.length; i++) {
                                    const item = transactionsBeforePage[i];
                                    if (item.isRequest) {
                                      const request = item.data as WalletRequest;
                                      if (request.status === RequestStatus.APPROVED) {
                                        const amount = request.requestType === RequestType.DEPOSIT ? request.amount * 100 : -request.amount * 100;
                                        balanceAtPageStart -= amount;
                                      }
                                    } else {
                                      const transaction = item.data;
                                      balanceAtPageStart -= transaction.amount;
                                    }
                                  }
                                  
                                  // Now render each transaction with correct balance
                                  let runningBalance = balanceAtPageStart;
                                  
                                  return currentItems.map((item, pageIndex) => {
                                    let balanceAfter = runningBalance;
                                    
                                    if (item.isRequest) {
                                      // Wallet request
                                      const request = item.data as WalletRequest;
                                      const { title } = getRequestTypeInfo(request.requestType as RequestType);
                                      
                                      // Calculate balance after this transaction
                                      if (request.status === RequestStatus.APPROVED) {
                                        const amount = request.requestType === RequestType.DEPOSIT ? request.amount * 100 : -request.amount * 100;
                                        balanceAfter = runningBalance + amount;
                                        runningBalance = balanceAfter;
                                      }
                                      
                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell className="text-sm">
                                            <div className="flex flex-col">
                                              <span className="font-medium">{formatDate(request.createdAt).split(' ')[0]}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {formatDate(request.createdAt).split(' ').slice(1).join(' ')}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex flex-col space-y-1">
                                              <span className="font-medium text-sm">{title} Request</span>
                                              <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="text-xs">
                                                  {request.paymentMode}
                                                </Badge>
                                              </div>
                                              {request.reviewedBy && (
                                                <span className="text-xs text-muted-foreground">
                                                  Reviewed by Admin
                                                </span>
                                              )}
                                              {request.notes && (
                                                <span className="text-xs text-muted-foreground">
                                                  {request.notes}
                                                </span>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={
                                              request.requestType === RequestType.DEPOSIT 
                                                ? "text-green-600 font-medium" 
                                                : "text-red-600 font-medium"
                                            }>
                                              {request.requestType === RequestType.DEPOSIT ? '+' : '-'}
                                              ₹{request.amount.toFixed(2)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="font-medium text-primary">
                                              {request.status === RequestStatus.APPROVED ? 
                                                `₹${(balanceAfter / 100).toFixed(2)}` : 
                                                '-'
                                              }
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <Badge 
                                              variant={
                                                request.status === RequestStatus.APPROVED 
                                                  ? "default" 
                                                  : request.status === RequestStatus.REJECTED 
                                                    ? "destructive" 
                                                    : "secondary"
                                              }
                                              className="text-xs"
                                            >
                                              {request.status}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    } else {
                                      // Direct transaction
                                      const transaction = item.data;
                                      
                                      // Update running balance
                                      balanceAfter = runningBalance + transaction.amount;
                                      runningBalance = balanceAfter;
                                      
                                      return (
                                        <TableRow key={item.id}>
                                          <TableCell className="text-sm">
                                            <div className="flex flex-col">
                                              <span className="font-medium">{formatDate(transaction.createdAt).split(' ')[0]}</span>
                                              <span className="text-xs text-muted-foreground">
                                                {formatDate(transaction.createdAt).split(' ').slice(1).join(' ')}
                                              </span>
                                            </div>
                                          </TableCell>
                                          <TableCell>
                                            <div className="flex flex-col space-y-1">
                                              <span className="font-medium text-sm">
                                                {transaction.amount > 0 ? "Funds Added" : "Funds Deducted"}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                {transaction.description || "Balance update"}
                                              </span>
                                              {transaction.performer && (
                                                <div className="flex items-center gap-1">
                                                  <User className="h-3 w-3" />
                                                  <span className="text-xs text-muted-foreground">
                                                    by {transaction.performer.username} ({transaction.performer.role})
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className={transaction.amount > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                                              {transaction.amount > 0 ? '+' : ''}
                                              ₹{(Math.abs(transaction.amount) / 100).toFixed(2)}
                                            </span>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <span className="font-medium text-primary">
                                              ₹{(balanceAfter / 100).toFixed(2)}
                                            </span>
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant="default" className="text-xs">
                                              Complete
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      );
                                    }
                                  });
                                })()}
                              </TableBody>
                            </Table>
                          </div>
                          
                          {/* Pagination */}
                          {totalPages > 1 && (
                            <div className="mt-6 flex justify-center">
                              <Pagination>
                                <PaginationContent>
                                  <PaginationItem>
                                    <PaginationPrevious 
                                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                  
                                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                      <PaginationItem key={pageNum}>
                                        <PaginationLink
                                          onClick={() => setCurrentPage(pageNum)}
                                          isActive={currentPage === pageNum}
                                          className="cursor-pointer"
                                        >
                                          {pageNum}
                                        </PaginationLink>
                                      </PaginationItem>
                                    );
                                  })}
                                  
                                  <PaginationItem>
                                    <PaginationNext 
                                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                    />
                                  </PaginationItem>
                                </PaginationContent>
                              </Pagination>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}