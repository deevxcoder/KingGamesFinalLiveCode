import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import DashboardLayout from "@/components/dashboard-layout";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { PaymentMode, RequestStatus, RequestType } from "@/lib/types";

export default function WalletPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("deposit");
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("");
  const [paymentDetailsInput, setPaymentDetailsInput] = useState<any>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [notes, setNotes] = useState<string>("");
  const [viewRequestDialog, setViewRequestDialog] = useState<boolean>(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [confirmCancelDialog, setConfirmCancelDialog] = useState<boolean>(false);

  // Get wallet requests
  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/wallet/my-requests"],
    enabled: !!user,
  });

  // Get payment details
  const { data: paymentDetailsData } = useQuery({
    queryKey: ["/api/wallet/payment-details"],
    onSuccess: (data) => {
      setPaymentDetails(data);
    },
    enabled: !!user,
  });

  // Create deposit request
  const depositMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return apiRequest("/api/wallet/requests", {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: "Deposit Request Submitted",
        description: "Your deposit request has been submitted for review.",
      });
      setDepositAmount("");
      setPaymentMode("");
      setPaymentDetailsInput({});
      setSelectedImage(null);
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/my-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit deposit request",
        variant: "destructive",
      });
    },
  });

  // Create withdrawal request
  const withdrawMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("/api/wallet/requests", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json",
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Withdrawal Request Submitted",
        description: "Your withdrawal request has been submitted for review.",
      });
      setWithdrawAmount("");
      setPaymentMode("");
      setPaymentDetailsInput({});
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/my-requests"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit withdrawal request",
        variant: "destructive",
      });
    },
  });

  // Handle deposit form submission
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!depositAmount || !paymentMode) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    if (parseFloat(depositAmount) <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (paymentMode !== PaymentMode.CASH && !selectedImage) {
      toast({
        title: "Error",
        description: "Please upload payment proof",
        variant: "destructive",
      });
      return;
    }

    // Create FormData for file upload
    const formData = new FormData();
    formData.append("amount", depositAmount);
    formData.append("requestType", RequestType.DEPOSIT);
    formData.append("paymentMode", paymentMode);
    formData.append("paymentDetails", JSON.stringify(paymentDetailsInput));
    if (notes) formData.append("notes", notes);
    if (selectedImage) formData.append("proofImage", selectedImage);

    depositMutation.mutate(formData);
  };

  // Handle withdrawal form submission
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!withdrawAmount || !paymentMode) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    if (amount > (user?.balance || 0)) {
      toast({
        title: "Error",
        description: "Insufficient balance",
        variant: "destructive",
      });
      return;
    }

    const data = {
      amount,
      requestType: RequestType.WITHDRAWAL,
      paymentMode,
      paymentDetails: paymentDetailsInput,
      notes,
    };

    withdrawMutation.mutate(data);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedImage(e.target.files[0]);
    }
  };

  // View request details
  const handleViewRequest = (request: any) => {
    setSelectedRequest(request);
    setViewRequestDialog(true);
  };

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case RequestStatus.APPROVED:
        return "success";
      case RequestStatus.REJECTED:
        return "destructive";
      default:
        return "secondary";
    }
  };

  // Get payment mode fields
  const renderPaymentFields = () => {
    if (!paymentMode) return null;

    switch (paymentMode) {
      case PaymentMode.UPI:
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                placeholder="name@upi"
                value={paymentDetailsInput.upiId || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, upiId: e.target.value })}
              />
            </div>
            {activeTab === "withdraw" && (
              <div className="grid gap-2">
                <Label htmlFor="transactionId">Transaction ID (Optional)</Label>
                <Input
                  id="transactionId"
                  placeholder="Transaction ID"
                  value={paymentDetailsInput.transactionId || ""}
                  onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, transactionId: e.target.value })}
                />
              </div>
            )}
          </>
        );
      
      case PaymentMode.BANK:
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                placeholder="Bank Name"
                value={paymentDetailsInput.bankName || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, bankName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                placeholder="Account Number"
                value={paymentDetailsInput.accountNumber || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, accountNumber: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input
                id="ifscCode"
                placeholder="IFSC Code"
                value={paymentDetailsInput.ifscCode || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, ifscCode: e.target.value })}
              />
            </div>
            {activeTab === "withdraw" && (
              <div className="grid gap-2">
                <Label htmlFor="utrNumber">UTR Number (Optional)</Label>
                <Input
                  id="utrNumber"
                  placeholder="UTR Number"
                  value={paymentDetailsInput.utrNumber || ""}
                  onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, utrNumber: e.target.value })}
                />
              </div>
            )}
          </>
        );
      
      case PaymentMode.CASH:
        return (
          <>
            <div className="grid gap-2">
              <Label htmlFor="handlerName">Handler Name</Label>
              <Input
                id="handlerName"
                placeholder="Handler Name"
                value={paymentDetailsInput.handlerName || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, handlerName: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="handlerId">Handler ID/Mobile (Optional)</Label>
              <Input
                id="handlerId"
                placeholder="Handler ID or Mobile"
                value={paymentDetailsInput.handlerId || ""}
                onChange={(e) => setPaymentDetailsInput({ ...paymentDetailsInput, handlerId: e.target.value })}
              />
            </div>
          </>
        );
      
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="Wallet">
      <div className="grid gap-6">
        {/* Balance Card */}
        <Card className="shadow-md">
          <CardHeader className="bg-primary/10 pb-2">
            <CardTitle className="text-2xl">Your Balance</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-4xl font-bold">₹{user?.balance || 0}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Available to bet or withdraw
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setActiveTab("withdraw")}
                >
                  Withdraw
                </Button>
                <Button 
                  variant="default"
                  onClick={() => setActiveTab("deposit")}
                >
                  Deposit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="deposit" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
              <TabsTrigger value="history">Transaction History</TabsTrigger>
            </TabsList>
          </div>

          {/* Deposit Tab */}
          <TabsContent value="deposit">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Deposit Form */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Deposit Funds</CardTitle>
                  <CardDescription>
                    Add money to your account using your preferred payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleDepositSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="depositAmount">Amount</Label>
                      <Input
                        id="depositAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMode">Payment Method</Label>
                      <Select 
                        value={paymentMode}
                        onValueChange={(value) => {
                          setPaymentMode(value);
                          setPaymentDetailsInput({});
                        }}
                      >
                        <SelectTrigger id="paymentMode">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentMode.UPI}>UPI</SelectItem>
                          <SelectItem value={PaymentMode.BANK}>Bank Transfer</SelectItem>
                          <SelectItem value={PaymentMode.CASH}>Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {renderPaymentFields()}
                    {paymentMode && paymentMode !== PaymentMode.CASH && (
                      <div className="grid gap-2">
                        <Label htmlFor="proofImage">Payment Proof</Label>
                        <Input
                          id="proofImage"
                          type="file"
                          onChange={handleFileChange}
                          accept="image/*"
                        />
                        <p className="text-xs text-muted-foreground">
                          Upload screenshot of payment confirmation
                        </p>
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Any additional information"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={depositMutation.isPending}
                    >
                      {depositMutation.isPending ? "Processing..." : "Submit Deposit Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Payment Instructions */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Payment Instructions</CardTitle>
                  <CardDescription>
                    Follow these instructions to make your deposit
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  {paymentDetails ? (
                    <>
                      <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">UPI Payment</h3>
                        <p>UPI ID: {paymentDetails.upi?.id || "N/A"}</p>
                        {paymentDetails.upi?.qrCode && (
                          <div className="mt-2">
                            <img 
                              src={paymentDetails.upi.qrCode} 
                              alt="UPI QR Code" 
                              className="max-w-[200px] mx-auto my-2" 
                            />
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">Bank Transfer</h3>
                        <div className="grid gap-1">
                          <p>Bank: {paymentDetails.bank?.name || "N/A"}</p>
                          <p>Account Number: {paymentDetails.bank?.accountNumber || "N/A"}</p>
                          <p>IFSC: {paymentDetails.bank?.ifscCode || "N/A"}</p>
                          <p>Account Holder: {paymentDetails.bank?.accountHolder || "N/A"}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <h3 className="font-medium mb-2">Cash Payment</h3>
                        <p>{paymentDetails.cash?.instructions || "Contact administrator for cash deposit instructions."}</p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-40">
                      <p>Loading payment details...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Withdraw Tab */}
          <TabsContent value="withdraw">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Withdraw Form */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Withdraw Funds</CardTitle>
                  <CardDescription>
                    Withdraw money from your account to your preferred payment method
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleWithdrawSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="withdrawAmount">Amount</Label>
                      <Input
                        id="withdrawAmount"
                        type="number"
                        placeholder="Enter amount"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Available balance: ₹{user?.balance || 0}
                      </p>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="paymentMode">Payment Method</Label>
                      <Select 
                        value={paymentMode}
                        onValueChange={(value) => {
                          setPaymentMode(value);
                          setPaymentDetailsInput({});
                        }}
                      >
                        <SelectTrigger id="paymentMode">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={PaymentMode.UPI}>UPI</SelectItem>
                          <SelectItem value={PaymentMode.BANK}>Bank Transfer</SelectItem>
                          <SelectItem value={PaymentMode.CASH}>Cash</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {renderPaymentFields()}
                    <div className="grid gap-2">
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        placeholder="Any additional information"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-2"
                      disabled={withdrawMutation.isPending}
                    >
                      {withdrawMutation.isPending ? "Processing..." : "Submit Withdrawal Request"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Withdrawal Information */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle>Withdrawal Information</CardTitle>
                  <CardDescription>
                    Important details about withdrawing funds
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Processing Time</h3>
                    <p>Withdrawals are typically processed within 24 hours. You will be notified once your withdrawal is approved.</p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Withdrawal Limits</h3>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Minimum: ₹100</li>
                      <li>Maximum: ₹50,000 per day</li>
                    </ul>
                  </div>
                  <div className="rounded-lg border p-4">
                    <h3 className="font-medium mb-2">Important Note</h3>
                    <p>Please ensure your payment details are correct. Incorrect details may result in delayed or failed withdrawals.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transaction History Tab */}
          <TabsContent value="history">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  View your deposit and withdrawal history
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center h-40">
                    <p>Loading transaction history...</p>
                  </div>
                ) : requests && requests.length > 0 ? (
                  <Table>
                    <TableCaption>Your recent transaction requests</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((request: any) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            {new Date(request.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {request.requestType === RequestType.DEPOSIT ? "Deposit" : "Withdrawal"}
                          </TableCell>
                          <TableCell>₹{request.amount}</TableCell>
                          <TableCell>
                            {request.paymentMode === PaymentMode.UPI
                              ? "UPI"
                              : request.paymentMode === PaymentMode.BANK
                              ? "Bank"
                              : "Cash"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(request.status)}>
                              {request.status === RequestStatus.PENDING
                                ? "Pending"
                                : request.status === RequestStatus.APPROVED
                                ? "Approved"
                                : "Rejected"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleViewRequest(request)}
                            >
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-40">
                    <p className="text-muted-foreground mb-2">No transaction history found</p>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab("deposit")}
                    >
                      Make your first deposit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* View Request Dialog */}
      <Dialog open={viewRequestDialog} onOpenChange={setViewRequestDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transaction Request Details</DialogTitle>
            <DialogDescription>
              Details of your {selectedRequest?.requestType} request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Type</span>
                  <span>
                    {selectedRequest.requestType === RequestType.DEPOSIT
                      ? "Deposit"
                      : "Withdrawal"}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Amount</span>
                  <span>₹{selectedRequest.amount}</span>
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={getStatusBadge(selectedRequest.status)} className="w-fit mt-1">
                    {selectedRequest.status === RequestStatus.PENDING
                      ? "Pending"
                      : selectedRequest.status === RequestStatus.APPROVED
                      ? "Approved"
                      : "Rejected"}
                  </Badge>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Date</span>
                  <span>
                    {new Date(selectedRequest.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>
              <Separator />
              <div className="flex flex-col">
                <span className="text-sm font-medium">Payment Method</span>
                <span>
                  {selectedRequest.paymentMode === PaymentMode.UPI
                    ? "UPI"
                    : selectedRequest.paymentMode === PaymentMode.BANK
                    ? "Bank Transfer"
                    : "Cash"}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">Payment Details</span>
                {selectedRequest.paymentMode === PaymentMode.UPI && (
                  <div className="mt-1">
                    <p>UPI ID: {selectedRequest.paymentDetails.upiId || "N/A"}</p>
                    {selectedRequest.paymentDetails.transactionId && (
                      <p>Transaction ID: {selectedRequest.paymentDetails.transactionId}</p>
                    )}
                  </div>
                )}
                {selectedRequest.paymentMode === PaymentMode.BANK && (
                  <div className="mt-1">
                    <p>Bank: {selectedRequest.paymentDetails.bankName || "N/A"}</p>
                    <p>Account: {selectedRequest.paymentDetails.accountNumber || "N/A"}</p>
                    <p>IFSC: {selectedRequest.paymentDetails.ifscCode || "N/A"}</p>
                    {selectedRequest.paymentDetails.utrNumber && (
                      <p>UTR Number: {selectedRequest.paymentDetails.utrNumber}</p>
                    )}
                  </div>
                )}
                {selectedRequest.paymentMode === PaymentMode.CASH && (
                  <div className="mt-1">
                    <p>Handler: {selectedRequest.paymentDetails.handlerName || "N/A"}</p>
                    {selectedRequest.paymentDetails.handlerId && (
                      <p>Handler ID: {selectedRequest.paymentDetails.handlerId}</p>
                    )}
                  </div>
                )}
              </div>
              {selectedRequest.proofImageUrl && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Payment Proof</span>
                  <div className="mt-2">
                    <img 
                      src={selectedRequest.proofImageUrl} 
                      alt="Payment Proof" 
                      className="max-w-full rounded-md border" 
                    />
                  </div>
                </div>
              )}
              {selectedRequest.notes && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Notes</span>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Admin notes/response */}
              {selectedRequest.status !== RequestStatus.PENDING && selectedRequest.reviewNotes && (
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Admin Response</span>
                  <p className="text-sm">{selectedRequest.reviewNotes}</p>
                </div>
              )}

              {/* Request actions */}
              {selectedRequest.status === RequestStatus.PENDING && (
                <div className="flex justify-end mt-2">
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setConfirmCancelDialog(true)}
                  >
                    Cancel Request
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirm Cancel Dialog */}
      <AlertDialog open={confirmCancelDialog} onOpenChange={setConfirmCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Transaction Request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                // Handle cancel request
                setConfirmCancelDialog(false);
                setViewRequestDialog(false);
                toast({
                  title: "Request Cancelled",
                  description: "Your request has been cancelled successfully.",
                });
                queryClient.invalidateQueries({ queryKey: ["/api/wallet/my-requests"] });
              }}
            >
              Yes, cancel request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}