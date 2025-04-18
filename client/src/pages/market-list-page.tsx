import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import MarketCard from "@/components/market-card";
import DashboardLayout from "@/components/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Timer, CheckCircle2, AlertCircle } from "lucide-react";

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

export default function MarketListPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("active");

  // Query for all markets
  const { data: allMarkets = [], isLoading: isLoadingAll } = useQuery<SatamatkaMarket[]>({
    queryKey: ["/api/satamatka/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Query for active markets
  const { data: activeMarkets = [], isLoading: isLoadingActive } = useQuery<SatamatkaMarket[]>({
    queryKey: ["/api/satamatka/markets/active"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Loading state
  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingAll;

  // Markets to display based on active tab
  const markets = activeTab === "active" ? activeMarkets : allMarkets;

  // Filter markets by status
  const openMarkets = allMarkets.filter(market => market.status === "open");
  const closedMarkets = allMarkets.filter(market => market.status === "closed" || market.status === "waiting_result");
  const resultedMarkets = allMarkets.filter(market => market.status === "resulted");
  
  // Get today's date for display
  const today = new Date();
  const dateString = format(today, "EEEE, MMMM d, yyyy");
  
  return (
    <DashboardLayout title="Satamatka Markets">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-muted-foreground">
            <Calendar className="h-5 w-5 mr-2" />
            <span>{dateString}</span>
          </div>
        </div>
        <p className="text-muted-foreground">Place bets on various market games to win big prizes</p>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 grid w-full grid-cols-4">
          <TabsTrigger value="active" className="flex items-center justify-center">
            <Clock className="h-4 w-4 mr-2" />
            <span>Active ({activeMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="closed" className="flex items-center justify-center">
            <Timer className="h-4 w-4 mr-2" />
            <span>Waiting ({closedMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="resulted" className="flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            <span>Results ({resultedMarkets.length})</span>
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center justify-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span>All ({allMarkets.length})</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Clock className="h-5 w-5 mr-2 text-green-500" />
              Active Markets
            </h2>
            <p className="text-sm text-muted-foreground">These markets are currently open for betting</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingActive ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-4" />
                  <div className="flex justify-between mb-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-14 w-14 rounded-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))
            ) : activeMarkets.length > 0 ? (
              activeMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  id={market.id}
                  name={market.name}
                  type={market.type}
                  openTime={market.openTime}
                  closeTime={market.closeTime}
                  openResult={market.openResult}
                  closeResult={market.closeResult}
                  status={market.status}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">No active markets available at the moment.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="closed" className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Timer className="h-5 w-5 mr-2 text-yellow-500" />
              Waiting for Results
            </h2>
            <p className="text-sm text-muted-foreground">These markets are closed for betting and waiting for results</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingAll ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-28 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              ))
            ) : closedMarkets.length > 0 ? (
              closedMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  id={market.id}
                  name={market.name}
                  type={market.type}
                  openTime={market.openTime}
                  closeTime={market.closeTime}
                  openResult={market.openResult}
                  closeResult={market.closeResult}
                  status={market.status}
                  showFullInfo={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">No markets waiting for results.</p>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="resulted" className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <CheckCircle2 className="h-5 w-5 mr-2 text-blue-500" />
              Results Declared
            </h2>
            <p className="text-sm text-muted-foreground">These markets have their results declared</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingAll ? (
              // Loading skeletons
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-28 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              ))
            ) : resultedMarkets.length > 0 ? (
              resultedMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  id={market.id}
                  name={market.name}
                  type={market.type}
                  openTime={market.openTime}
                  closeTime={market.closeTime}
                  openResult={market.openResult}
                  closeResult={market.closeResult}
                  status={market.status}
                  showFullInfo={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">No markets with declared results.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="p-4 bg-muted/50 rounded-lg mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-primary" />
              All Markets
            </h2>
            <p className="text-sm text-muted-foreground">Complete list of all markets</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingAll ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <Skeleton className="h-28 w-full mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2 mb-2" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              ))
            ) : allMarkets.length > 0 ? (
              allMarkets.map((market) => (
                <MarketCard
                  key={market.id}
                  id={market.id}
                  name={market.name}
                  type={market.type}
                  openTime={market.openTime}
                  closeTime={market.closeTime}
                  openResult={market.openResult}
                  closeResult={market.closeResult}
                  status={market.status}
                  showFullInfo={true}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p className="text-muted-foreground">No markets available.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
}