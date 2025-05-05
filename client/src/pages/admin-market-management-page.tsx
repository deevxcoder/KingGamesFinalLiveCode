import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import DashboardLayout from "@/components/dashboard-layout";
import { Checkbox } from "@/components/ui/checkbox";
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
  coverImage?: string;
  marketDate: string;
  openTime: string;
  closeTime: string;
  resultTime: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  createdAt: string;
  isRecurring?: boolean;
  recurrencePattern?: string;
  nextOpenTime?: string;
  nextCloseTime?: string;
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
  type: z.string().min(2, "Type is required"),
  coverImage: z.string().optional(),
  marketDate: z.string().min(1, "Date is required"),
  openTime: z.string().min(5, "Open time is required"),
  closeTime: z.string().min(5, "Close time is required"),
  resultTime: z.string().min(5, "Result time is required"),
  isRecurring: z.boolean().default(false),
  recurrencePattern: z.string().optional(),
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
      coverImage: "",
      marketDate: format(new Date(), "yyyy-MM-dd"),
      openTime: "",
      closeTime: "",
      resultTime: "",
      isRecurring: false,
      recurrencePattern: "daily",
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
      // Determine if this is the open or close result based on market status
      const market = declareResultMarket;
      
      if (!market) {
        throw new Error("Market not found");
      }
      
      // If market is open, set the openResult
      // If market is closed or waiting_result, set the closeResult
      if (market.status === "open") {
        return apiRequest(`/api/satamatka/markets/${id}/results`, "PATCH", { 
          openResult: result 
        });
      } else if (market.status === "closed" || market.status === "waiting_result") {
        return apiRequest(`/api/satamatka/markets/${id}/results`, "PATCH", { 
          closeResult: result 
        });
      } else {
        throw new Error("Market status does not allow result declaration");
      }
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
      coverImage: market.coverImage || "",
      marketDate: format(parseISO(market.marketDate || market.openTime), "yyyy-MM-dd"),
      openTime: format(parseISO(market.openTime), "HH:mm"),
      closeTime: format(parseISO(market.closeTime), "HH:mm"),
      resultTime: market.resultTime ? format(parseISO(market.resultTime), "HH:mm") : format(parseISO(market.closeTime), "HH:mm"),
      isRecurring: market.isRecurring || false,
      recurrencePattern: market.recurrencePattern || "daily",
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
      coverImage: "",
      marketDate: format(new Date(), "yyyy-MM-dd"),
      openTime: "",
      closeTime: "",
      resultTime: "",
      isRecurring: false,
      recurrencePattern: "daily",
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
            <DialogTitle>
              {declareResultMarket?.status === "open" 
                ? "Declare Open Result" 
                : "Declare Close Result"
              }
            </DialogTitle>
            <DialogDescription>
              Enter the {declareResultMarket?.status === "open" ? "open" : "close"} result for {declareResultMarket?.name}. 
              Results should be a two-digit number from 00 to 99.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resultForm}>
            <form onSubmit={resultForm.handleSubmit(onSubmitResult)} className="space-y-4">
              <FormField
                control={resultForm.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {declareResultMarket?.status === "open" ? "Open Result" : "Close Result"}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 42" maxLength={2} />
                    </FormControl>
                    <FormDescription>
                      Enter a two-digit number (00-99).
                      {declareResultMarket?.status === "open" && (
                        <div className="mt-1 text-amber-500">
                          Note: Declaring open result will keep the market open for betting.
                        </div>
                      )}
                      {(declareResultMarket?.status === "closed" || declareResultMarket?.status === "waiting_result") && (
                        <div className="mt-1 text-amber-500">
                          Note: Declaring close result will finalize the market and set its status to "resulted".
                        </div>
                      )}
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
                      <Input {...field} placeholder="e.g. dishawar, gali, mumbai, or custom type" />
                    </FormControl>
                    <FormDescription>
                      Standard types: dishawar, gali, mumbai, kalyan. You can also enter a custom type.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={marketForm.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Banner Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://example.com/banner.jpg" />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for the market banner image (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={marketForm.control}
                name="marketDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Market Date</FormLabel>
                    <FormControl>
                      <Input {...field} type="date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={marketForm.control}
                  name="openTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open Time</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select time</option>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            Array.from({ length: 4 }).map((_, minute) => {
                              const h = hour;
                              const m = minute * 15;
                              const timeValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              const displayHour = h % 12 === 0 ? 12 : h % 12;
                              const ampm = h < 12 ? 'AM' : 'PM';
                              const displayTime = `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
                              return (
                                <option key={timeValue} value={timeValue}>
                                  {displayTime}
                                </option>
                              );
                            })
                          ))}
                        </select>
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
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select time</option>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            Array.from({ length: 4 }).map((_, minute) => {
                              const h = hour;
                              const m = minute * 15;
                              const timeValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              const displayHour = h % 12 === 0 ? 12 : h % 12;
                              const ampm = h < 12 ? 'AM' : 'PM';
                              const displayTime = `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
                              return (
                                <option key={timeValue} value={timeValue}>
                                  {displayTime}
                                </option>
                              );
                            })
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={marketForm.control}
                  name="resultTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Result Time</FormLabel>
                      <FormControl>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                        >
                          <option value="">Select time</option>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            Array.from({ length: 4 }).map((_, minute) => {
                              const h = hour;
                              const m = minute * 15;
                              const timeValue = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                              const displayHour = h % 12 === 0 ? 12 : h % 12;
                              const ampm = h < 12 ? 'AM' : 'PM';
                              const displayTime = `${displayHour}:${m.toString().padStart(2, '0')} ${ampm}`;
                              return (
                                <option key={timeValue} value={timeValue}>
                                  {displayTime}
                                </option>
                              );
                            })
                          ))}
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Recurring Market options */}
              <div className="space-y-4 border border-input rounded-md p-4 bg-muted/10">
                <h3 className="font-semibold text-sm">Recurring Market Settings</h3>
                
                <FormField
                  control={marketForm.control}
                  name="isRecurring"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md">
                      <FormControl>
                        <Checkbox 
                          checked={field.value} 
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Make this a recurring market
                        </FormLabel>
                        <FormDescription>
                          Recurring markets automatically reset after results are declared
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
                
                {marketForm.watch("isRecurring") && (
                  <FormField
                    control={marketForm.control}
                    name="recurrencePattern"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recurrence Pattern</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="daily">Daily (Every day)</option>
                            <option value="weekdays">Weekdays (Monday to Friday)</option>
                            <option value="weekly">Weekly (Same day every week)</option>
                            <option value="custom">Custom (Advanced scheduling)</option>
                          </select>
                        </FormControl>
                        <FormDescription>
                          Choose how often this market should repeat
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
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
            <TableHead>Recurring</TableHead>
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
              <TableCell>
                {market.isRecurring ? (
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {market.recurrencePattern || "Daily"}
                  </Badge>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
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
                    
                    {/* Open Result Declaration */}
                    {market.status === "open" && (
                      <DropdownMenuItem onClick={() => handleDeclareResult(market)}>
                        <Check className="mr-2 h-4 w-4" />
                        Declare Open Result
                      </DropdownMenuItem>
                    )}
                    
                    {/* Market Close Action */}
                    {market.status === "open" && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "closed" })}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close Market
                      </DropdownMenuItem>
                    )}
                    
                    {/* Close Result Declaration */}
                    {(market.status === "closed" || market.status === "waiting_result") && (
                      <DropdownMenuItem onClick={() => handleDeclareResult(market)}>
                        <Check className="mr-2 h-4 w-4" />
                        Declare Final Result
                      </DropdownMenuItem>
                    )}
                    
                    {/* Reopen Market */}
                    {(market.status === "closed" || market.status === "waiting_result") && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "open" })}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Reopen Market
                      </DropdownMenuItem>
                    )}
                    
                    {/* Market Cycle Management */}
                    {market.status === "resulted" && market.isRecurring && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "open" })}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Activate Next Cycle
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