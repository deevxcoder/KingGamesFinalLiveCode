import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { BarChart2, Clock, Calendar, Target, ArrowRight } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

interface MarketResult {
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

interface RecentResultsProps {
  results: MarketResult[];
}

export default function RecentResults({ results }: RecentResultsProps) {
  const [_, setLocation] = useLocation();
  const [tab, setTab] = useState("today");
  
  const formatResult = (result?: string) => {
    if (!result) return "-";
    return result;
  };
  
  if (results.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center">
            <BarChart2 className="w-5 h-5 text-primary mr-2" />
            Recent Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-6">
            <Target className="h-12 w-12 text-muted-foreground/50 mb-2" />
            <p className="text-muted-foreground text-sm">No recent results available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xl flex items-center">
          <BarChart2 className="w-5 h-5 text-primary mr-2" />
          Recent Results
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0 pb-1">
        <Tabs defaultValue={tab} onValueChange={setTab} className="px-6">
          <TabsList className="mb-4">
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="all">All Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="today" className="mt-0">
            <div className="space-y-3">
              {results.slice(0, 5).map((result) => (
                <ResultItem key={result.id} result={result} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="all" className="mt-0">
            <div className="space-y-3">
              {results.slice(0, 8).map((result) => (
                <ResultItem key={result.id} result={result} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="pt-1">
        <Button 
          variant="ghost" 
          className="w-full text-primary flex items-center justify-center"
          onClick={() => setLocation("/markets")}
        >
          View All Results
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </CardFooter>
    </Card>
  );
}

function ResultItem({ result }: { result: MarketResult }) {
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Open</Badge>;
      case "closed":
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Closed</Badge>;
      case "resulted":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">Resulted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(result.createdAt), { addSuffix: true });
  
  return (
    <div className="p-3 rounded-lg border border-border bg-card/50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-sm">{result.name}</h4>
          <div className="flex items-center text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3 mr-1" />
            <span>{timeAgo}</span>
          </div>
        </div>
        {getStatusBadge(result.status)}
      </div>
      
      <div className="flex justify-between mt-3 text-sm">
        <div className="flex-1">
          <p className="text-xs text-muted-foreground">Open Result</p>
          <p className="font-medium">{formatResult(result.openResult)}</p>
        </div>
        <div className="flex-1 text-right">
          <p className="text-xs text-muted-foreground">Close Result</p>
          <p className="font-medium">{formatResult(result.closeResult)}</p>
        </div>
      </div>
    </div>
  );
}