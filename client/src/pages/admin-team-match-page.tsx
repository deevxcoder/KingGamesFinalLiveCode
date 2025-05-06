import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import DashboardLayout from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GiCricketBat } from "react-icons/gi";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
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
  Search, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  MoreVertical,
  Edit,
  X,
  Check,
  Filter
} from "lucide-react";
import { IoFootball, IoBasketball } from "react-icons/io5";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TeamMatchResult } from "@shared/schema";

// Type for Team Match
type TeamMatch = {
  id: number;
  teamA: string;
  teamB: string;
  category: string;
  description: string | null;
  matchTime: string;
  result: string;
  oddTeamA: number;
  oddTeamB: number;
  oddDraw: number | null;
  status: string;
  createdAt: string;
};

// Form schema for declaring results
const resultFormSchema = z.object({
  result: z.string().min(1, "Result is required")
});

// Form schema for creating/editing team matches
const matchFormSchema = z.object({
  teamA: z.string().min(2, "Team A name must be at least 2 characters"),
  teamB: z.string().min(2, "Team B name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  matchDate: z.string().min(1, "Match date is required"),
  matchTime: z.string().min(1, "Match time is required"),
  coverImage: z.string().optional(),
});

export default function AdminTeamMatchPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<TeamMatch | null>(null);
  const [declareResultMatch, setDeclareResultMatch] = useState<TeamMatch | null>(null);
  const queryClient = useQueryClient();

  // Form for result declaration
  const resultForm = useForm<z.infer<typeof resultFormSchema>>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      result: "",
    },
  });

  // Form for add/edit match
  const matchForm = useForm<z.infer<typeof matchFormSchema>>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      teamA: "",
      teamB: "",
      category: "cricket",
      description: "",
      matchDate: format(new Date(), "yyyy-MM-dd"),
      matchTime: "12:00",
      coverImage: "",
    },
  });

  // Query for all team matches
  const { data: allMatches = [], isLoading: isLoadingAll } = useQuery<TeamMatch[]>({
    queryKey: ["/api/team-matches"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Mutations for team match operations
  const updateMatchStatus = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return apiRequest("PATCH", `/api/team-matches/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-matches"] });
      toast({
        title: "Match updated",
        description: "Match status has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMatchResult = useMutation({
    mutationFn: async ({ id, result }: { id: number; result: string }) => {
      return apiRequest("PATCH", `/api/team-matches/${id}/result`, { result });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-matches"] });
      setDeclareResultMatch(null);
      resultForm.reset();
      toast({
        title: "Result declared",
        description: "Match result has been declared successfully",
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

  const createMatch = useMutation({
    mutationFn: async (data: {
      teamA: string;
      teamB: string;
      category: string;
      description?: string;
      matchTime: Date;
      oddTeamA: number;
      oddTeamB: number;
      oddDraw?: number;
    }) => {
      return apiRequest("POST", "/api/team-matches", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-matches"] });
      setIsAddMatchOpen(false);
      matchForm.reset();
      toast({
        title: "Match created",
        description: "New match has been created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMatch = useMutation({
    mutationFn: async ({ id, data }: { 
      id: number; 
      data: {
        teamA: string;
        teamB: string;
        category: string;
        description?: string;
        matchTime: Date;
        oddTeamA: number;
        oddTeamB: number;
        oddDraw?: number;
      }
    }) => {
      return apiRequest("PATCH", `/api/team-matches/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team-matches"] });
      setEditingMatch(null);
      matchForm.reset();
      toast({
        title: "Match updated",
        description: "Match has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update match",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter matches by status
  const openMatches = allMatches.filter(match => match.status === "open");
  const closedMatches = allMatches.filter(match => match.status === "closed");
  const resultedMatches = allMatches.filter(match => match.status === "resulted");

  // Get matches for current tab
  const getMatchesForTab = () => {
    switch (activeTab) {
      case "open": return openMatches;
      case "closed": return closedMatches;
      case "resulted": return resultedMatches;
      default: return allMatches;
    }
  };

  // Filter matches by category
  const getMatchesByCategory = (matches: TeamMatch[]) => {
    if (activeCategory === "all") return matches;
    return matches.filter(match => match.category === activeCategory);
  };

  // Filter matches by search query
  const filteredMatches = getMatchesByCategory(getMatchesForTab()).filter(match => 
    match.teamA.toLowerCase().includes(searchQuery.toLowerCase()) || 
    match.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
    match.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  };

  // Handle opening edit match dialog
  const handleEditMatch = (match: TeamMatch) => {
    setEditingMatch(match);
    const matchDate = match.matchTime ? parseISO(match.matchTime) : new Date();
    matchForm.reset({
      teamA: match.teamA,
      teamB: match.teamB,
      category: match.category,
      description: match.description || "",
      matchDate: format(matchDate, "yyyy-MM-dd"),
      matchTime: format(matchDate, "HH:mm"),
      coverImage: "",
      oddTeamA: match.oddTeamA,
      oddTeamB: match.oddTeamB,
      oddDraw: match.oddDraw || undefined,
    });
  };

  // Handle opening declare result dialog
  const handleDeclareResult = (match: TeamMatch) => {
    setDeclareResultMatch(match);
    resultForm.reset({ result: match.result || "" });
  };

  // Handle submit for declaring result
  const onSubmitResult = (data: z.infer<typeof resultFormSchema>) => {
    if (declareResultMatch) {
      updateMatchResult.mutate({ id: declareResultMatch.id, result: data.result });
    }
  };

  // Handle submit for adding/editing match
  const onSubmitMatch = (formData: z.infer<typeof matchFormSchema>) => {
    // Combine date and time into a single ISO string for matchTime
    const { matchDate, matchTime, ...restData } = formData;
    const combinedDateTime = `${matchDate}T${matchTime}:00`;
    
    // Create the data object to send to the API
    // Since the backend schema now handles string-to-date conversion
    // we can send the ISO string directly
    const apiData = {
      teamA: restData.teamA,
      teamB: restData.teamB,
      category: restData.category,
      description: restData.description,
      matchTime: combinedDateTime, // Send as ISO string
      oddTeamA: restData.oddTeamA,
      oddTeamB: restData.oddTeamB,
      oddDraw: restData.oddDraw,
    };
    
    if (editingMatch) {
      updateMatch.mutate({ id: editingMatch.id, data: apiData });
    } else {
      createMatch.mutate(apiData);
    }
  };

  // Prepare to add a new match
  const handleAddMatch = () => {
    setIsAddMatchOpen(true);
    matchForm.reset({
      teamA: "",
      teamB: "",
      category: "cricket",
      description: "",
      matchDate: format(new Date(), "yyyy-MM-dd"),
      matchTime: "12:00",
      coverImage: "",
      oddTeamA: 100,
      oddTeamB: 100,
      oddDraw: 300,
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

  // Category badge component
  const CategoryBadge = ({ category }: { category: string }) => {
    switch (category) {
      case "cricket":
        return (
          <div className="flex items-center">
            <GiCricketBat className="h-4 w-4 mr-1 text-indigo-400" />
            <span>Cricket</span>
          </div>
        );
      case "football":
        return (
          <div className="flex items-center">
            <IoFootball className="h-4 w-4 mr-1 text-emerald-400" />
            <span>Football</span>
          </div>
        );
      case "basketball":
        return (
          <div className="flex items-center">
            <IoBasketball className="h-4 w-4 mr-1 text-amber-400" />
            <span>Basketball</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center">
            <Trophy className="h-4 w-4 mr-1 text-violet-400" />
            <span>{category}</span>
          </div>
        );
    }
  };

  // Get result display
  const getResultDisplay = (result: string, match: TeamMatch) => {
    if (result === "pending" || !result) return "Pending";
    if (result === "team_a") return match.teamA;
    if (result === "team_b") return match.teamB;
    if (result === "draw") return "Draw";
    return result;
  };

  // Get today's date for display
  const today = new Date();
  const dateString = format(today, "EEEE, MMMM d, yyyy");

  return (
    <DashboardLayout title="Team Match Management">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{dateString}</span>
          </div>
          
          <Button onClick={handleAddMatch} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Match
          </Button>
        </div>
        <p className="text-muted-foreground">
          Manage team matches, declare results, and create new matches
        </p>
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative flex items-center flex-1 min-w-[200px]">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search matches..." 
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="flex items-center">
              <Filter className="h-4 w-4 mr-2" />
              Category: {activeCategory === "all" ? "All" : activeCategory}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52">
            <div className="space-y-2">
              <Button 
                variant={activeCategory === "all" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setActiveCategory("all")}
              >
                <Trophy className="h-4 w-4 mr-2" />
                All Categories
              </Button>
              <Button 
                variant={activeCategory === "football" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setActiveCategory("football")}
              >
                <IoFootball className="h-4 w-4 mr-2" />
                Football
              </Button>
              <Button 
                variant={activeCategory === "basketball" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setActiveCategory("basketball")}
              >
                <IoBasketball className="h-4 w-4 mr-2" />
                Basketball
              </Button>
              <Button 
                variant={activeCategory === "other" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setActiveCategory("other")}
              >
                <Trophy className="h-4 w-4 mr-2" />
                Other
              </Button>
              <Button 
                variant={activeCategory === "cricket" ? "default" : "ghost"} 
                className="w-full justify-start"
                onClick={() => setActiveCategory("cricket")}
              >
                <GiCricketBat className="h-4 w-4 mr-2" />
                Cricket
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="all" className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>All ({allMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="open" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>Open ({openMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center justify-center">
            <X className="h-4 w-4 mr-2" />
            <span>Closed ({closedMatches.length})</span>
          </TabsTrigger>
          <TabsTrigger value="resulted" className="flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Resulted ({resultedMatches.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <MatchTable 
            matches={filteredMatches} 
            isLoading={isLoadingAll}
            handleEditMatch={handleEditMatch}
            handleDeclareResult={handleDeclareResult}
            updateMatchStatus={updateMatchStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            CategoryBadge={CategoryBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
        
        <TabsContent value="open" className="space-y-6">
          <MatchTable 
            matches={filteredMatches} 
            isLoading={isLoadingAll}
            handleEditMatch={handleEditMatch}
            handleDeclareResult={handleDeclareResult}
            updateMatchStatus={updateMatchStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            CategoryBadge={CategoryBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-6">
          <MatchTable 
            matches={filteredMatches} 
            isLoading={isLoadingAll}
            handleEditMatch={handleEditMatch}
            handleDeclareResult={handleDeclareResult}
            updateMatchStatus={updateMatchStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            CategoryBadge={CategoryBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>

        <TabsContent value="resulted" className="space-y-6">
          <MatchTable 
            matches={filteredMatches} 
            isLoading={isLoadingAll}
            handleEditMatch={handleEditMatch}
            handleDeclareResult={handleDeclareResult}
            updateMatchStatus={updateMatchStatus}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            CategoryBadge={CategoryBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
      </Tabs>

      {/* Declare Result Dialog */}
      <Dialog open={!!declareResultMatch} onOpenChange={(open) => !open && setDeclareResultMatch(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Match Result</DialogTitle>
            <DialogDescription>
              {declareResultMatch && (
                <span>
                  Select the result for {declareResultMatch.teamA} vs {declareResultMatch.teamB}.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...resultForm}>
            <form onSubmit={resultForm.handleSubmit(onSubmitResult)} className="space-y-4">
              <FormField
                control={resultForm.control}
                name="result"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Result</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select result" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TeamMatchResult.TEAM_A}>
                          {declareResultMatch?.teamA} Won
                        </SelectItem>
                        <SelectItem value={TeamMatchResult.TEAM_B}>
                          {declareResultMatch?.teamB} Won
                        </SelectItem>
                        <SelectItem value={TeamMatchResult.DRAW}>
                          Match Drawn
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDeclareResultMatch(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updateMatchResult.isPending}
                >
                  {updateMatchResult.isPending ? "Saving..." : "Declare Result"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Match Dialog */}
      <Dialog 
        open={isAddMatchOpen || !!editingMatch} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddMatchOpen(false);
            setEditingMatch(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingMatch ? "Edit Match" : "Add New Match"}</DialogTitle>
            <DialogDescription>
              {editingMatch 
                ? "Edit the details of the existing match." 
                : "Fill in the details to create a new match."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...matchForm}>
            <form onSubmit={matchForm.handleSubmit(onSubmitMatch)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="teamA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team A</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Mumbai Indians" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={matchForm.control}
                  name="teamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. Chennai Super Kings" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cricket">Cricket</SelectItem>
                          <SelectItem value="football">Football</SelectItem>
                          <SelectItem value="basketball">Basketball</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={matchForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. IPL 2025 Match #12" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Match Date and Time Selection - improved UX with separate fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={matchForm.control}
                  name="matchDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Date</FormLabel>
                      <FormControl>
                        <Input 
                          type="date" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={matchForm.control}
                  name="matchTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Time</FormLabel>
                      <FormControl>
                        <Input 
                          type="time" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Cover Banner Upload */}
              <FormField
                control={matchForm.control}
                name="coverImage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cover Banner Image (Optional)</FormLabel>
                    <div className="grid gap-2">
                      <FormControl>
                        <div className="flex flex-col gap-2">
                          <Input
                            type="file"
                            accept="image/*"
                            className="cursor-pointer"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                // Create form data to send the file
                                const formData = new FormData();
                                formData.append('matchBannerImage', file);
                                
                                try {
                                  // Upload the file using the API
                                  const response = await fetch('/api/upload/match-banner', {
                                    method: 'POST',
                                    body: formData,
                                    // No need to set Content-Type header, browser will set it automatically with boundary
                                  });
                                  
                                  if (response.ok) {
                                    const data = await response.json();
                                    if (data.success) {
                                      // Set the field value to the returned URL
                                      field.onChange(data.imageUrl);
                                      toast({
                                        title: "Image uploaded successfully",
                                        variant: "success",
                                        duration: 2000,
                                      });
                                    } else {
                                      throw new Error('Upload failed');
                                    }
                                  } else {
                                    throw new Error('Upload failed');
                                  }
                                } catch (error) {
                                  console.error('Error uploading banner:', error);
                                  toast({
                                    title: "Image upload failed",
                                    description: "Please try again later",
                                    variant: "destructive",
                                    duration: 3000,
                                  });
                                }
                              }
                            }}
                          />
                          {field.value && (
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => field.onChange('')}
                              >
                                Clear
                              </Button>
                              <span className="text-xs text-muted-foreground truncate">{field.value}</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      
                      {field.value && (
                        <div className="p-2 border rounded-md">
                          <img 
                            src={field.value} 
                            alt="Cover preview" 
                            className="w-full h-40 object-cover rounded-md"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://placehold.co/600x400?text=Image+Preview+Unavailable";
                            }}
                          />
                        </div>
                      )}
                      
                      <FormDescription>
                        Recommended size: 1200×400 pixels. Select an image file from your device.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              

              
              <div className="p-4 bg-muted/30 rounded-lg border border-dashed mt-4">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Match odds will be automatically set based on configured system settings.
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAddMatchOpen(false);
                    setEditingMatch(null);
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMatch.isPending || updateMatch.isPending}
                >
                  {createMatch.isPending || updateMatch.isPending 
                    ? "Saving..." 
                    : editingMatch ? "Update Match" : "Create Match"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

interface MatchTableProps {
  matches: TeamMatch[];
  isLoading: boolean;
  handleEditMatch: (match: TeamMatch) => void;
  handleDeclareResult: (match: TeamMatch) => void;
  updateMatchStatus: any;
  formatDate: (date: string) => string;
  StatusBadge: React.FC<{ status: string }>;
  CategoryBadge: React.FC<{ category: string }>;
  getResultDisplay: (result: string, match: TeamMatch) => string;
}

// Match Table Component
function MatchTable({ 
  matches, 
  isLoading,
  handleEditMatch,
  handleDeclareResult,
  updateMatchStatus,
  formatDate,
  StatusBadge,
  CategoryBadge,
  getResultDisplay
}: MatchTableProps) {
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

  if (matches.length === 0) {
    return (
      <div className="text-center py-10 border rounded-lg">
        <h3 className="text-lg font-medium">No matches found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your filters or search query.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Match</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Match Time</TableHead>
            <TableHead>Odds (A/Draw/B)</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {matches.map((match) => (
            <TableRow key={match.id}>
              <TableCell className="font-medium">
                {match.teamA} vs {match.teamB}
                {match.description && (
                  <div className="text-xs text-muted-foreground mt-1">{match.description}</div>
                )}
              </TableCell>
              <TableCell>
                <CategoryBadge category={match.category} />
              </TableCell>
              <TableCell>{formatDate(match.matchTime)}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">{(match.oddTeamA / 100).toFixed(2)}</span>
                  <span>/</span>
                  <span className="text-purple-400">{(match.oddDraw ? match.oddDraw / 100 : 3).toFixed(2)}</span>
                  <span>/</span>
                  <span className="text-green-400">{(match.oddTeamB / 100).toFixed(2)}</span>
                </div>
              </TableCell>
              <TableCell>
                {match.result && match.result !== "pending" ? (
                  <Badge className="bg-indigo-600 hover:bg-indigo-700">
                    {getResultDisplay(match.result, match)}
                  </Badge>
                ) : (
                  <span className="text-slate-400">Pending</span>
                )}
              </TableCell>
              <TableCell>
                <StatusBadge status={match.status} />
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
                    
                    <DropdownMenuItem onClick={() => handleEditMatch(match)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Match
                    </DropdownMenuItem>
                    
                    {match.status === "open" && (
                      <DropdownMenuItem 
                        onClick={() => updateMatchStatus.mutate({ id: match.id, status: "closed" })}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Close Match
                      </DropdownMenuItem>
                    )}
                    
                    {match.status === "closed" && (
                      <DropdownMenuItem onClick={() => handleDeclareResult(match)}>
                        <Check className="mr-2 h-4 w-4" />
                        Declare Result
                      </DropdownMenuItem>
                    )}
                    
                    {match.status === "closed" && (
                      <DropdownMenuItem 
                        onClick={() => updateMatchStatus.mutate({ id: match.id, status: "open" })}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        Reopen Match
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