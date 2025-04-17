import { useState, Fragment } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";
import DashboardLayout from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
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
  Plus,
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Edit,
  Filter
} from "lucide-react";
import { GiCricketBat } from "react-icons/gi";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameType, TeamMatchResult } from "@shared/schema";

// Type for Cricket Toss Game
type CricketTossGame = {
  id: number;
  userId: number;
  gameType: string;
  betAmount: number;
  prediction: string;
  status: string;
  result: string | null;
  payout: number;
  createdAt: string;
  gameData: {
    teamA: string;
    teamB: string;
    tossTime: string;
    description: string;
    oddTeamA: number;
    oddTeamB: number;
    imageUrl?: string;
  };
};

// Form schema for declaring toss results
const resultFormSchema = z.object({
  result: z.string().min(1, "Result is required")
});

// Form schema for creating/editing cricket toss games
const tossGameFormSchema = z.object({
  teamA: z.string().min(2, "Team A name must be at least 2 characters"),
  teamB: z.string().min(2, "Team B name must be at least 2 characters"),
  description: z.string().optional(),
  tossDate: z.string().min(1, "Toss date is required"),
  tossTime: z.string().min(1, "Toss time is required"),
  oddTeamA: z.number().min(100, "Odds must be at least 100").max(2000, "Odds can't exceed 2000"),
  oddTeamB: z.number().min(100, "Odds must be at least 100").max(2000, "Odds can't exceed 2000"),
  imageUrl: z.string().optional(),
});

export default function AdminCricketTossPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddGameOpen, setIsAddGameOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<CricketTossGame | null>(null);
  const [declareResultGame, setDeclareResultGame] = useState<CricketTossGame | null>(null);
  const queryClient = useQueryClient();

  // Form for result declaration
  const resultForm = useForm<z.infer<typeof resultFormSchema>>({
    resolver: zodResolver(resultFormSchema),
    defaultValues: {
      result: "",
    },
  });

  // Form for add/edit game
  const gameForm = useForm<z.infer<typeof tossGameFormSchema>>({
    resolver: zodResolver(tossGameFormSchema),
    defaultValues: {
      teamA: "",
      teamB: "",
      description: "",
      tossDate: format(new Date(), "yyyy-MM-dd"),
      tossTime: "12:00",
      oddTeamA: 200,
      oddTeamB: 200,
    },
  });

  // Mock data for Cricket Toss games (replace with API calls later)
  const mockGames: CricketTossGame[] = [
    {
      id: 1,
      userId: 1,
      gameType: GameType.CRICKET_TOSS,
      betAmount: 0,
      prediction: "",
      status: "open",
      result: null,
      payout: 0,
      createdAt: "2025-04-17T10:30:00",
      gameData: {
        teamA: "India",
        teamB: "Australia",
        tossTime: "2025-04-20T14:00:00",
        description: "T20 World Cup 2025",
        oddTeamA: 180,
        oddTeamB: 220,
        imageUrl: "/images/india-vs-australia.svg"
      }
    },
    {
      id: 2,
      userId: 1,
      gameType: GameType.CRICKET_TOSS,
      betAmount: 0,
      prediction: "",
      status: "open",
      result: null,
      payout: 0,
      createdAt: "2025-04-16T09:15:00",
      gameData: {
        teamA: "England",
        teamB: "New Zealand",
        tossTime: "2025-04-18T15:30:00",
        description: "Test Match Day 1",
        oddTeamA: 200,
        oddTeamB: 200,
        imageUrl: "/images/england-vs-nz.svg"
      }
    },
    {
      id: 3,
      userId: 1,
      gameType: GameType.CRICKET_TOSS,
      betAmount: 0,
      prediction: "",
      status: "resulted",
      result: "team_a",
      payout: 0,
      createdAt: "2025-04-14T11:20:00",
      gameData: {
        teamA: "Pakistan",
        teamB: "South Africa",
        tossTime: "2025-04-15T13:00:00",
        description: "ODI Series Match 2",
        oddTeamA: 210,
        oddTeamB: 190,
        imageUrl: "/images/pakistan-vs-sa.svg"
      }
    }
  ];

  // Query for all cricket toss games
  const { data: allGames = [], isLoading: isLoadingGames } = useQuery<CricketTossGame[]>({
    queryKey: ["/api/cricket-toss"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Filter games by status
  const openGames = allGames.filter(game => game.status === "open");
  const closedGames = allGames.filter(game => game.status === "closed");
  const resultedGames = allGames.filter(game => game.status === "resulted");

  // Get games for current tab
  const getGamesForTab = () => {
    switch (activeTab) {
      case "open": return openGames;
      case "closed": return closedGames;
      case "resulted": return resultedGames;
      default: return allGames;
    }
  };

  // Filter games by search query
  const filteredGames = getGamesForTab().filter(game => {
    if (!game.gameData) return false;
    return game.gameData.teamA.toLowerCase().includes(searchQuery.toLowerCase()) || 
    game.gameData.teamB.toLowerCase().includes(searchQuery.toLowerCase()) ||
    game.gameData.description?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Format date for display
  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), "MMM d, yyyy h:mm a");
  };

  // Handle opening edit game dialog
  const handleEditGame = (game: CricketTossGame) => {
    if (!game.gameData) return;
    
    setEditingGame(game);
    const tossDate = parseISO(game.gameData.tossTime);
    gameForm.reset({
      teamA: game.gameData.teamA,
      teamB: game.gameData.teamB,
      description: game.gameData.description || "",
      tossDate: format(tossDate, "yyyy-MM-dd"),
      tossTime: format(tossDate, "HH:mm"),
      oddTeamA: game.gameData.oddTeamA,
      oddTeamB: game.gameData.oddTeamB,
      imageUrl: game.gameData.imageUrl || "",
    });
  };

  // Handle opening declare result dialog
  const handleDeclareResult = (game: CricketTossGame) => {
    setDeclareResultGame(game);
    resultForm.reset({ result: game.result || "" });
  };

  // Mutation for declaring toss result
  const updateTossResult = useMutation({
    mutationFn: ({ id, result }: { id: number, result: string }) => {
      return apiRequest(
        'PATCH',
        `/api/cricket-toss/${id}/result`,
        { result }
      );
    },
    onSuccess: () => {
      setDeclareResultGame(null);
      resultForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss"] });
      toast({
        title: "Result declared",
        description: "Toss result has been declared successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to declare result. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle submit for declaring result
  const onSubmitResult = (data: z.infer<typeof resultFormSchema>) => {
    if (declareResultGame) {
      updateTossResult.mutate({ id: declareResultGame.id, result: data.result });
    }
  };

  // Mutation for creating a cricket toss game
  const createTossGame = useMutation({
    mutationFn: (data: any) => {
      return apiRequest(
        'POST',
        '/api/cricket-toss',
        data
      );
    },
    onSuccess: () => {
      setIsAddGameOpen(false);
      gameForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/cricket-toss"] });
      toast({
        title: "Game created",
        description: "New Cricket Toss game has been created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create game. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle submit for adding/editing game
  const onSubmitGame = (formData: z.infer<typeof tossGameFormSchema>) => {
    // Combine date and time into a single ISO string for tossTime
    const { tossDate, tossTime, ...restData } = formData;
    const combinedDateTime = `${tossDate}T${tossTime}:00`;
    
    // Create the data object with combined date/time
    const data = {
      ...restData,
      tossTime: combinedDateTime,
    };
    
    if (editingGame) {
      // Not implemented - need to update the API for this
      toast({
        title: "Editing not implemented",
        description: "Editing cricket toss games is not yet implemented. Please create a new game instead.",
        variant: "destructive"
      });
      setEditingGame(null);
    } else {
      // Create a new cricket toss game
      createTossGame.mutate(data);
    }
  };

  // Prepare to add a new game
  const handleAddGame = () => {
    setIsAddGameOpen(true);
    gameForm.reset({
      teamA: "",
      teamB: "",
      description: "",
      tossDate: format(new Date(), "yyyy-MM-dd"),
      tossTime: "12:00",
      oddTeamA: 200,
      oddTeamB: 200,
      imageUrl: "",
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

  // Get result display
  const getResultDisplay = (result: string | null, game: CricketTossGame) => {
    if (result === null || result === "" || result === "pending") return "Pending";
    if (result === "team_a") {
      return game.gameData ? game.gameData.teamA : "Team A";
    }
    if (result === "team_b") {
      return game.gameData ? game.gameData.teamB : "Team B";
    }
    return result;
  };

  // Get today's date for display
  const today = new Date();
  const dateString = format(today, "EEEE, MMMM d, yyyy");

  return (
    <DashboardLayout title="Cricket Toss Management">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{dateString}</span>
          </div>
          
          <Button onClick={handleAddGame} className="bg-gradient-to-r from-blue-600 to-indigo-600">
            <Plus className="h-4 w-4 mr-2" />
            Add Cricket Toss Game
          </Button>
        </div>
        <p className="text-muted-foreground">
          Create and manage Cricket Toss games for users to bet on which team will win the toss
        </p>
      </div>

      {/* Search and filter bar */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div className="relative flex items-center flex-1 min-w-[200px]">
          <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search games..." 
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
            <span>All ({allGames.length})</span>
          </TabsTrigger>
          <TabsTrigger value="open" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>Open ({openGames.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center justify-center">
            <X className="h-4 w-4 mr-2" />
            <span>Closed ({closedGames.length})</span>
          </TabsTrigger>
          <TabsTrigger value="resulted" className="flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Resulted ({resultedGames.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-6">
          <CricketTossTable 
            games={filteredGames} 
            isLoading={isLoadingGames}
            handleEditGame={handleEditGame}
            handleDeclareResult={handleDeclareResult}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
        
        <TabsContent value="open" className="space-y-6">
          <CricketTossTable 
            games={filteredGames} 
            isLoading={isLoadingGames}
            handleEditGame={handleEditGame}
            handleDeclareResult={handleDeclareResult}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-6">
          <CricketTossTable 
            games={filteredGames} 
            isLoading={isLoadingGames}
            handleEditGame={handleEditGame}
            handleDeclareResult={handleDeclareResult}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>

        <TabsContent value="resulted" className="space-y-6">
          <CricketTossTable 
            games={filteredGames} 
            isLoading={isLoadingGames}
            handleEditGame={handleEditGame}
            handleDeclareResult={handleDeclareResult}
            formatDate={formatDate}
            StatusBadge={StatusBadge}
            getResultDisplay={getResultDisplay}
          />
        </TabsContent>
      </Tabs>

      {/* Declare Result Dialog */}
      <Dialog open={!!declareResultGame} onOpenChange={(open) => !open && setDeclareResultGame(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declare Toss Result</DialogTitle>
            <DialogDescription>
              {declareResultGame && declareResultGame.gameData ? (
                <span>
                  Select which team won the toss: {declareResultGame.gameData.teamA} vs {declareResultGame.gameData.teamB}.
                </span>
              ) : (
                <span>
                  Select which team won the toss for Game #{declareResultGame?.id}.
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
                    <FormLabel>Toss Winner</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select winner" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={TeamMatchResult.TEAM_A}>
                          {declareResultGame?.gameData ? declareResultGame.gameData.teamA : "Team A"} Won the Toss
                        </SelectItem>
                        <SelectItem value={TeamMatchResult.TEAM_B}>
                          {declareResultGame?.gameData ? declareResultGame.gameData.teamB : "Team B"} Won the Toss
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
                  onClick={() => setDeclareResultGame(null)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                >
                  Declare Result
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Cricket Toss Game Dialog */}
      <Dialog 
        open={isAddGameOpen || !!editingGame} 
        onOpenChange={(open) => {
          if (!open) {
            setIsAddGameOpen(false);
            setEditingGame(null);
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingGame ? "Edit Cricket Toss Game" : "Add New Cricket Toss Game"}</DialogTitle>
            <DialogDescription>
              {editingGame 
                ? "Edit the details of the existing Cricket Toss game." 
                : "Fill in the details to create a new Cricket Toss game."}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...gameForm}>
            <form onSubmit={gameForm.handleSubmit(onSubmitGame)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gameForm.control}
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
                  control={gameForm.control}
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
              
              <FormField
                control={gameForm.control}
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
              
              {/* Toss Date and Time Selection */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gameForm.control}
                  name="tossDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toss Date</FormLabel>
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
                  control={gameForm.control}
                  name="tossTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toss Time</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select time" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Array.from({ length: 24 }).map((_, hour) => (
                            <div key={hour}>
                              <SelectItem value={`${hour.toString().padStart(2, '0')}:00`}>{hour.toString().padStart(2, '0')}:00</SelectItem>
                              <SelectItem value={`${hour.toString().padStart(2, '0')}:30`}>{hour.toString().padStart(2, '0')}:30</SelectItem>
                            </div>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Banner Image URL */}
              <FormField
                control={gameForm.control}
                name="imageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Banner Image URL</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="e.g. https://example.com/image.jpg" 
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormDescription>
                      Enter a URL for the banner image (optional)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={gameForm.control}
                  name="oddTeamA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team A Odds</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))}
                          min={100}
                          max={500}
                        />
                      </FormControl>
                      <FormDescription>
                        Range: 100-500
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={gameForm.control}
                  name="oddTeamB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team B Odds</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(Number(e.target.value))}
                          min={100}
                          max={500}
                        />
                      </FormControl>
                      <FormDescription>
                        Range: 100-500
                      </FormDescription>
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
                    setIsAddGameOpen(false);
                    setEditingGame(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingGame ? "Update Game" : "Create Game"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// Cricket Toss Table Component
interface CricketTossTableProps {
  games: CricketTossGame[];
  isLoading: boolean;
  handleEditGame: (game: CricketTossGame) => void;
  handleDeclareResult: (game: CricketTossGame) => void;
  formatDate: (date: string) => string;
  StatusBadge: React.FC<{ status: string }>;
  getResultDisplay: (result: string | null, game: CricketTossGame) => string;
}

function CricketTossTable({ 
  games, 
  isLoading,
  handleEditGame,
  handleDeclareResult,
  formatDate,
  StatusBadge,
  getResultDisplay
}: CricketTossTableProps) {
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
        <Skeleton className="w-full h-12" />
      </div>
    );
  }
  
  if (games.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg bg-background">
        <GiCricketBat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-xl font-medium">No Cricket Toss games found</p>
        <p className="text-muted-foreground mt-1">
          Create a new Cricket Toss game to get started
        </p>
      </div>
    );
  }

  // Check if games have gameData property
  const hasValidGameData = games.some(game => game.gameData);
  
  if (!hasValidGameData) {
    return (
      <div className="border rounded-lg bg-background p-6">
        <div className="text-center mb-6">
          <GiCricketBat className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-xl font-medium">Game Data Missing</p>
          <p className="text-muted-foreground mt-1">
            The Cricket Toss games exist but do not have complete data.
            Please create new games with proper game data.
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game ID</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {games.map((game) => (
                <TableRow key={game.id}>
                  <TableCell>
                    <div className="font-medium">
                      Game #{game.id}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      User ID: {game.userId}
                    </div>
                  </TableCell>
                  <TableCell>{formatDate(game.createdAt)}</TableCell>
                  <TableCell>
                    <StatusBadge status={game.status} />
                  </TableCell>
                  <TableCell className="font-medium">
                    {game.result || "Pending"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant={game.status === "resulted" ? "outline" : "default"}
                      size="sm" 
                      onClick={() => handleDeclareResult(game)}
                      disabled={game.status !== "open"}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      {game.status === "resulted" ? "Update Result" : "Declare Result"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Teams</TableHead>
            <TableHead>Toss Time</TableHead>
            <TableHead>Odds (A/B)</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Result</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {games.map((game) => (
            <TableRow key={game.id}>
              <TableCell>
                {game.gameData ? (
                  <>
                    <div className="font-medium">
                      {game.gameData.teamA} vs {game.gameData.teamB}
                    </div>
                    {game.gameData.description && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {game.gameData.description}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="font-medium">
                    Game #{game.id}
                  </div>
                )}
              </TableCell>
              <TableCell>{game.gameData ? formatDate(game.gameData.tossTime) : formatDate(game.createdAt)}</TableCell>
              <TableCell>{game.gameData ? `${game.gameData.oddTeamA} / ${game.gameData.oddTeamB}` : '-'}</TableCell>
              <TableCell>
                <StatusBadge status={game.status} />
              </TableCell>
              <TableCell className="font-medium">
                {getResultDisplay(game.result, game)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-2">
                  {game.gameData && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleEditGame(game)}
                      disabled={game.status !== "open"}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  )}
                  <Button 
                    variant={game.status === "resulted" ? "outline" : "default"}
                    size="sm" 
                    onClick={() => handleDeclareResult(game)}
                    disabled={game.status !== "open"}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    {game.status === "resulted" ? "Update Result" : "Declare Result"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}