import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import DashboardLayout from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { 
  Calendar, 
  Clock, 
  Timer, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  MoreVertical,
  Edit,
  X,
  Check,
  Search,
  Filter
} from "lucide-react";

// Interface for market data
interface SatamatkaMarket {
  id: number;
  name: string;
  type: string;
  openTime: string;
  closeTime: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  createdAt: string;
}

// Form schema for declaring results
const resultFormSchema = z.object({
  result: z.string()
    .min(2, "Result must be at least 2 characters")
    .max(2, "Result must be exactly 2 characters")
    .regex(/^[0-9]{2}$/, "Result must be a two-digit number (00-99)")
});

// Form schema for creating/editing markets
const marketFormSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  type: z.string().min(2, "Type must be at least 2 characters"),
  openTime: z.string().min(5, "Open time is required"),
  closeTime: z.string().min(5, "Close time is required"),
});

export default function AdminMarketManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddMarketOpen, setIsAddMarketOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<SatamatkaMarket | null>(null);
  const [declareResultMarket, setDeclareResultMarket] = useState<SatamatkaMarket | null>(null);
  const queryClient = useQueryClient();

  // Form for result declaration
  const resultForm = useForm<z.infer<typeof resultFormSchema>>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      result: "",
    },
  });

  // Form for add/edit market
  const marketForm = useForm<z.infer<typeof marketFormSchema>>({
    resolver: zodResolver(marketFormSchema),
    defaultValues: {
      name: "",
      type: "",
      openTime: "",
      closeTime: "",
    },
  });

  // Query for all markets
  const { data: allMarkets = [], isLoading: isLoadingAll } = useQuery<SatamatkaMarket[]>({
    queryKey: ["/api/satamatka/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Mutations for market operations
  const updateMarketStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest(`/api/satamatka/markets/${id}/status`, "PATCH", { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      toast({
        title: "Market updated",
        description: "Market status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update market",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMarketResult = useMutation({
    mutationFn: async ({ id, result }: { id: number; result: string }) => {
      return apiRequest(`/api/satamatka/markets/${id}/results`, "PATCH", { 
        result 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      setDeclareResultMarket(null);
      resultForm.reset();
      toast({
        title: "Result declared",
        description: "Market result has been declared successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to declare result",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMarket = useMutation({
    mutationFn: async (data: z.infer<typeof marketFormSchema>) => {
      return apiRequest("/api/satamatka/markets", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      setIsAddMarketOpen(false);
      marketForm.reset();
      toast({
        title: "Market created",
        description: "New market has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create market",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMarket = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: z.infer<typeof marketFormSchema> }) => {
      return apiRequest(`/api/satamatka/markets/${id}`, "PATCH", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      setEditingMarket(null);
      marketForm.reset();
      toast({
        title: "Market updated",
        description: "Market has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update market",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter markets by status
  const openMarkets = allMarkets.filter(market => market.status === "open");
  const closedMarkets = allMarkets.filter(market => market.status === "closed" || market.status === "waiting_result");
  const resultedMarkets = allMarkets.filter(market => market.status === "resulted");

  // Get markets for current tab
  const getMarketsForTab = () => {
    switch (activeTab) {
      case "open": return openMarkets;
      case "closed": return closedMarkets;
      case "resulted": return resultedMarkets;
      default: return allMarkets;
    }
  };

  // Filter markets by search query
  const filteredMarkets = getMarketsForTab().filter(market => 
    market.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    market.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  };

  // Handle opening edit market dialog
  const handleEditMarket = (market: SatamatkaMarket) => {
    setEditingMarket(market);
    marketForm.reset({
      name: market.name,
      type: market.type,
      openTime: format(parseISO(market.openTime), "HH:mm"),
      closeTime: format(parseISO(market.closeTime), "HH:mm"),
    });
  };

  // Handle opening declare result dialog
  const handleDeclareResult = (market: SatamatkaMarket) => {
    setDeclareResultMarket(market);
    resultForm.reset({ result: "" });
  };

  // Handle submit for declaring result
  const onSubmitResult = (data: z.infer<typeof resultFormSchema>) => {
    if (declareResultMarket) {
      updateMarketResult.mutate({ id: declareResultMarket.id, result: data.result });
    }
  };

  // Handle submit for adding/editing market
  const onSubmitMarket = (data: z.infer<typeof marketFormSchema>) => {
    if (editingMarket) {
      updateMarket.mutate({ id: editingMarket.id, data });
    } else {
      createMarket.mutate(data);
    }
  };

  // Prepare to add a new market
  const handleAddMarket = () => {
    setIsAddMarketOpen(true);
    marketForm.reset({
      name: "",
      type: "",
      openTime: "",
      closeTime: "",
    });
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let color = "";
    switch (status) {
      case "open":
        color = "bg-green-500 hover:bg-green-600";
        break;
      case "closed":
      case "waiting_result":
        color = "bg-yellow-500 hover:bg-yellow-600";
        break;
      case "resulted":
        color = "bg-blue-500 hover:bg-blue-600";
        break;
      default:
        color = "bg-slate-500 hover:bg-slate-600";
    }
    return (
      <Badge className={color}>
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  // Get today's date for display
  const today = new Date();
  const dateString = format(today, "EEEE, MMMM d, yyyy");

  return (
    <DashboardLayout title="Market Management">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{dateString}</span>
          </div>
          
          <Button onClick={handleAddMarket} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Market
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage all markets, declare results, and create new markets
        </p>
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative flex items-center flex-1 min-w-[200px]">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search markets..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>All ({allMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="open" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>Open ({openMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center justify-center">
            <Timer className="h-4 w-4 mr-2" />
            <span>Closed ({closedMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="resulted" className="flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Resulted ({resultedMarkets.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <MarketTable 
            markets={filteredMarkets} 
            isLoading={isLoadingAll}
            handleEditMarket={handleEditMarket}
            handleDeclareResult={handleDeclareResult}
            updateMarketStatus={updateMarketStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="open" className="space-y-6">
          <MarketTable 
            markets={filteredMarkets} 
            isLoading={isLoadingAll}
            handleEditMarket={handleEditMarket}
            handleDeclareResult={handleDeclareResult}
            updateMarketStatus={updateMarketStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
          />
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-6">
          <MarketTable 
            markets={filteredMarkets} 
            isLoading={isLoadingAll}
            handleEditMarket={handleEditMarket}
            handleDeclareResult={handleDeclareResult}
            updateMarketStatus={updateMarketStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
          />
        </TabsContent>

        <TabsContent value="resulted" className="space-y-6">
          <MarketTable 
            markets={filteredMarkets} 
            isLoading={isLoadingAll}
            handleEditMarket={handleEditMarket}
            handleDeclareResult={handleDeclareResult}
            updateMarketStatus={updateMarketStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
          />
        </TabsContent>
      </Tabs>

      {/* Declare Result Dialog */}
      <Dialog open={!!declareResultMarket} onOpenChange={(open) => !open && setDeclareResultMarket(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Result</DialogTitle>
            <DialogDescription>
              Enter the result for {declareResultMarket?.name}. Results should be a two-digit number from 00 to 99.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resultForm}>
            <form onSubmit={resultForm.handleSubmit(onSubmitResult)} className="space-y-4">
              <FormField
                control={resultForm.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Result</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 42" maxLength={2} />
                    </FormControl>
                    <FormDescription>
                      Enter a two-digit number (00-99).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDeclareResultMarket(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMarketResult.isPending}
                >
                  {updateMarketResult.isPending ? "Saving..." : "Declare Result"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Market Dialog */}
      <Dialog 
        open={isAddMarketOpen || !!editingMarket} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddMarketOpen(false);
            setEditingMarket(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMarket ? "Edit Market" : "Add New Market"}</DialogTitle>
            <DialogDescription>
              {editingMarket 
                ? "Edit the details of the existing market." 
                : "Fill in the details to create a new market."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...marketForm}>
            <form onSubmit={marketForm.handleSubmit(onSubmitMarket)} className="space-y-4">
              <FormField
                control={marketForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Dishawar Morning" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={marketForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Type</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. morning" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={marketForm.control}
                  name="openTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={marketForm.control}
                  name="closeTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Close Time</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddMarketOpen(false);
                    setEditingMarket(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMarket.isPending || updateMarket.isPending}
                >
                  {createMarket.isPending || updateMarket.isPending 
                    ? "Saving..." 
                    : editingMarket ? "Update Market" : "Create Market"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

interface MarketTableProps {
  markets: SatamatkaMarket[];
  isLoading: boolean;
  handleEditMarket: (market: SatamatkaMarket) => void;
  handleDeclareResult: (market: SatamatkaMarket) => void;
  updateMarketStatus: any;
  formatDate: (date: string) => string;
  StatusBadge: React.FC<{ status: string }>;
}

// Market Table Component
function MarketTable({ 
  markets, 
  isLoading,
  handleEditMarket,
  handleDeclareResult,
  updateMarketStatus,
  formatDate,
  StatusBadge
}: MarketTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-6 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg">
        <h3 className="text-lg font-medium">No markets found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Market Name</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Open Time</TableHead>
            <TableHead>Close Time</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((market) => (
            <TableRow key={market.id}>
              <TableCell className="font-medium">{market.name}</TableCell>
              <TableCell>{market.type}</TableCell>
              <TableCell>{formatDate(market.openTime)}</TableCell>
              <TableCell>{formatDate(market.closeTime)}</TableCell>
              <TableCell>
                {market.openResult ? (
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded font-mono font-bold">
                    {market.openResult}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={market.status} />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleEditMarket(market)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Market
                    </DropdownMenuItem>
                    
                    {market.status === "open" && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "closed" })}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close Market
                      </DropdownMenuItem>
                    )}
                    
                    {(market.status === "closed" || market.status === "waiting_result") && (
                      <DropdownMenuItem onClick={() => handleDeclareResult(market)}>
                        <Check className="mr-2 h-4 w-4" />
                        Declare Result
                      </DropdownMenuItem>
                    )}
                    
                    {market.status === "closed" && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "open" })}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Reopen Market
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}