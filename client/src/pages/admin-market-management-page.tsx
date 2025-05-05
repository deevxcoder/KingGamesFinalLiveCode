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
  type: z.string().optional().default("gali"), // Default type is 'gali' since all markets follow this style
  coverImage: z.string().optional(),
  marketDate: z.string().min(1, "Date is required"),
  openTime: z.string().min(5, "Open time is required"),
  closeTime: z.string().min(5, "Close time is required"),
  resultTime: z.string().min(5, "Result time is required"),
});

export default function AdminMarketManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddMarketOpen, setIsAddMarketOpen] = useState(false);
  const [editingMarket, setEditingMarket] = useState<SatamatkaMarket | null>(null);
  const [declareResultMarket, setDeclareResultMarket] = useState<SatamatkaMarket | null>(null);
  const [isTemplateSelectOpen, setIsTemplateSelectOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SatamatkaMarket | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [marketToDelete, setMarketToDelete] = useState<SatamatkaMarket | null>(null);
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
      return apiRequest("PATCH", `/api/satamatka/markets/${id}/status`, { status });
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
        return apiRequest("PATCH", `/api/satamatka/markets/${id}/results`, { 
          openResult: result 
        });
      } else if (market.status === "closed" || market.status === "waiting_result") {
        return apiRequest("PATCH", `/api/satamatka/markets/${id}/results`, { 
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
      // Set initial market status to "waiting_result" to ensure manual activation flow
      const marketData = {
        ...data,
        status: "waiting_result" // All markets start in waiting status
      };
      return apiRequest("POST", "/api/satamatka/markets", marketData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      setIsAddMarketOpen(false);
      setSelectedTemplate(null);
      marketForm.reset();
      toast({
        title: "Market created",
        description: "New market has been created successfully. It's in 'waiting' status and must be manually opened.",
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
      return apiRequest("PATCH", `/api/satamatka/markets/${id}`, data);
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
  
  // Delete market mutation
  const deleteMarket = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/satamatka/markets/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/satamatka/markets"] });
      setMarketToDelete(null);
      setDeleteConfirmOpen(false);
      toast({
        title: "Market template removed",
        description: "The market template has been successfully removed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to remove market template",
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
      // When editing, preserve the original status
      updateMarket.mutate({ id: editingMarket.id, data });
    } else {
      // When creating new, the mutation will set status to "waiting_result"
      createMarket.mutate(data);
      
      // Show informative toast about manual activation
      toast({
        title: "Reminder",
        description: "Remember to manually open the market when you're ready for betting to begin.",
        duration: 8000,
      });
    }
  };

  // Prepare to add a new market
  const handleAddMarket = () => {
    // First open the template selection dialog, not directly the add market dialog
    setIsTemplateSelectOpen(true);
    setSelectedTemplate(null);
    
    // Reset form values to defaults - if user selects "Create from Scratch"
    marketForm.reset({
      name: "",
      type: "gali", // Default to gali style 
      coverImage: "",
      marketDate: format(new Date(), "yyyy-MM-dd"),
      openTime: "",
      closeTime: "",
      resultTime: "",
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
          
          <Button 
            onClick={() => setIsTemplateSelectOpen(true)} 
            className="bg-gradient-to-r from-blue-600 to-indigo-600"
          >
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
            <DialogTitle>Declare Final Result</DialogTitle>
            <DialogDescription>
              Enter the final result for {declareResultMarket?.name}. 
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
                    <FormLabel>Final Result</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 42" maxLength={2} />
                    </FormControl>
                    <FormDescription>
                      Enter a two-digit number (00-99).
                      <div className="mt-1 text-amber-500">
                        Note: Declaring the final result will finalize the market and set its status to "resulted".
                      </div>
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

      {/* Template Selection Dialog */}
      <Dialog open={isTemplateSelectOpen} onOpenChange={setIsTemplateSelectOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Market</DialogTitle>
            <DialogDescription>
              Select a previous market to use as a template or create from scratch
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="mb-4">
              <h3 className="text-md font-semibold mb-2">Previous Markets</h3>
              <div className="grid gap-3 max-h-[60vh] overflow-y-auto">
                {allMarkets.length === 0 ? (
                  <p className="text-muted-foreground">No previous markets found</p>
                ) : (
                  allMarkets.map(market => (
                    <div 
                      key={market.id} 
                      className="border rounded-md p-3 hover:bg-accent/50 cursor-pointer flex justify-between items-center"
                      onClick={() => {
                        setSelectedTemplate(market);
                        setIsTemplateSelectOpen(false);
                        setIsAddMarketOpen(true);
                        marketForm.reset({
                          name: market.name,
                          type: market.type || "gali",
                          coverImage: market.coverImage || "",
                          marketDate: format(new Date(), "yyyy-MM-dd"),
                          openTime: format(parseISO(market.openTime), "HH:mm"),
                          closeTime: format(parseISO(market.closeTime), "HH:mm"),
                          resultTime: market.resultTime ? format(parseISO(market.resultTime), "HH:mm") : format(parseISO(market.closeTime), "HH:mm"),
                        });
                      }}
                    >
                      <div>
                        <p className="font-medium">{market.name}</p>
                        <div className="text-sm text-muted-foreground">
                          <span>Opens: {format(parseISO(market.openTime), "h:mm a")}</span>
                          <span className="mx-2">|</span>
                          <span>Closes: {format(parseISO(market.closeTime), "h:mm a")}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTemplate(market);
                            setIsTemplateSelectOpen(false);
                            setIsAddMarketOpen(true);
                            marketForm.reset({
                              name: market.name,
                              type: market.type || "gali",
                              coverImage: market.coverImage || "",
                              marketDate: format(new Date(), "yyyy-MM-dd"),
                              openTime: format(parseISO(market.openTime), "HH:mm"),
                              closeTime: format(parseISO(market.closeTime), "HH:mm"),
                              resultTime: market.resultTime ? format(parseISO(market.resultTime), "HH:mm") : format(parseISO(market.closeTime), "HH:mm"),
                            });
                          }}
                        >
                          Use Template
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMarketToDelete(market);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsTemplateSelectOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={() => {
                  setSelectedTemplate(null);
                  setIsTemplateSelectOpen(false);
                  setIsAddMarketOpen(true);
                  marketForm.reset({
                    name: "",
                    type: "gali",
                    coverImage: "",
                    marketDate: format(new Date(), "yyyy-MM-dd"),
                    openTime: "",
                    closeTime: "",
                    resultTime: "",
                  });
                }}
              >
                Create from Scratch
              </Button>
            </DialogFooter>
          </div>
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
                : selectedTemplate
                  ? `Using template: "${selectedTemplate.name}". New market will be created in "waiting" status.`
                  : "Fill in the details to create a new market. The market will start in waiting status and must be manually activated."}
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
              
              {/* Market Type removed as it's not needed - all markets follow the gali style */}
              
              <FormField
                control={marketForm.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Cover Banner Image</FormLabel>
                    <FormControl>
                      <div className="flex flex-col gap-3">
                        {field.value ? (
                          <div className="relative w-full h-40 rounded-md overflow-hidden border">
                            <img 
                              src={field.value} 
                              alt="Market banner preview" 
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-6 w-6 rounded-full"
                              onClick={() => field.onChange("")}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : null}
                        
                        {!field.value && (
                          <div className="flex items-center gap-3">
                            <Input 
                              type="file" 
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                
                                // Create form data for upload
                                const formData = new FormData();
                                formData.append('marketBannerImage', file);
                                
                                try {
                                  // Upload the image
                                  const response = await fetch('/api/upload/market-banner', {
                                    method: 'POST',
                                    body: formData,
                                    credentials: 'include'
                                  });
                                  
                                  if (!response.ok) {
                                    throw new Error('Image upload failed');
                                  }
                                  
                                  const data = await response.json();
                                  
                                  // Set the image URL to the form field
                                  field.onChange(data.imageUrl);
                                } catch (error) {
                                  console.error('Error uploading image:', error);
                                  toast({
                                    title: "Upload Failed",
                                    description: "There was an error uploading the image. Please try again.",
                                    variant: "destructive"
                                  });
                                } finally {
                                  // Clear the file input
                                  e.target.value = '';
                                }
                              }}
                              className="flex-1"
                            />
                            
                            <div className="text-muted-foreground">or</div>
                            
                            <Input 
                              placeholder="Direct image URL" 
                              onChange={(e) => field.onChange(e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Upload a banner image for the market or provide a direct URL (optional)
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

      {/* Delete Market Template Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Remove Market Template</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this market template?
              {marketToDelete && (
                <div className="mt-2 p-2 border rounded bg-muted">
                  <div className="font-semibold">{marketToDelete.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    <span>Opens: {format(parseISO(marketToDelete.openTime), "h:mm a")}</span>
                    <span className="mx-2">|</span>
                    <span>Closes: {format(parseISO(marketToDelete.closeTime), "h:mm a")}</span>
                  </div>
                </div>
              )}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setMarketToDelete(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (marketToDelete) {
                  deleteMarket.mutate(marketToDelete.id);
                }
              }}
              disabled={deleteMarket.isPending}
            >
              {deleteMarket.isPending ? 'Removing...' : 'Remove Template'}
            </Button>
          </DialogFooter>
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
                    <DropdownMenuLabel>Market Management</DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={() => handleEditMarket(market)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Market Details
                    </DropdownMenuItem>
                    
                    {/* Market Status Management Section */}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Status Controls</DropdownMenuLabel>
                    
                    {/* Waiting/Created Market Activation */}
                    {(market.status === "waiting_result" || market.status === "resulted") && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "open" })}
                        className="text-green-600 font-medium"
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Open Market for Betting
                      </DropdownMenuItem>
                    )}
                    
                    {/* Market Close Action */}
                    {market.status === "open" && (
                      <DropdownMenuItem 
                        onClick={() => updateMarketStatus.mutate({ id: market.id, status: "closed" })}
                        className="text-amber-600 font-medium"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close Market for Betting
                      </DropdownMenuItem>
                    )}
                    
                    {/* Results Management Section */}
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Results Management</DropdownMenuLabel>
                    
                    {/* Only show "Declare Final Result" option for closed markets */}
                    {market.status === "closed" && (
                      <DropdownMenuItem 
                        onClick={() => handleDeclareResult(market)}
                        className="text-indigo-600 font-medium"
                      >
                        <Check className="mr-2 h-4 w-4" />
                        Declare Final Result
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