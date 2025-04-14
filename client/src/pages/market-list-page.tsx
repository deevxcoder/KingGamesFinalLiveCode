import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getQueryFn } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import MarketCard from "@/components/market-card";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: allMarkets, isLoading: isLoadingAll } = useQuery({
    queryKey: ["/api/satamatka/markets"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Query for active markets
  const { data: activeMarkets, isLoading: isLoadingActive } = useQuery({
    queryKey: ["/api/satamatka/markets/active"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Loading state
  const isLoading = activeTab === "active" ? isLoadingActive : isLoadingAll;

  // Markets to display based on active tab
  const markets = activeTab === "active" ? activeMarkets : allMarkets;

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Satamatka Markets</h1>
        <p className="text-muted-foreground">Place bets on various market games</p>
      </div>

      <Tabs defaultValue="active" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="active">Active Markets</TabsTrigger>
          <TabsTrigger value="all">All Markets</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
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
            ) : activeMarkets && activeMarkets.length > 0 ? (
              activeMarkets.map((market: SatamatkaMarket) => (
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

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoadingAll ? (
              // Loading skeletons
              Array.from({ length: 6 }).map((_, i) => (
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
            ) : allMarkets && allMarkets.length > 0 ? (
              allMarkets.map((market: SatamatkaMarket) => (
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
    </div>
  );
}