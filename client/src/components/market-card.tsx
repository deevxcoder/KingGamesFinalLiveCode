import { useLocation } from "wouter";
import { formatDistanceToNow, format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Clock, Calendar, Target, Dice1, ArrowRightCircle } from "lucide-react";

interface MarketCardProps {
  id: number;
  name: string;
  type: string;
  openTime: string;
  closeTime: string;
  openResult?: string;
  closeResult?: string;
  status: string;
  showFullInfo?: boolean;
}

export default function MarketCard({
  id,
  name,
  type,
  openTime,
  closeTime,
  openResult,
  closeResult,
  status,
  showFullInfo = false,
}: MarketCardProps) {
  const [_, setLocation] = useLocation();

  // Parse dates
  const openTimeDate = new Date(openTime);
  const closeTimeDate = new Date(closeTime);
  
  // Format times
  const openTimeFormatted = format(openTimeDate, "h:mm a");
  const closeTimeFormatted = format(closeTimeDate, "h:mm a");
  
  // Time remaining until close (if market is open)
  const timeRemainingText = status === "open" 
    ? formatDistanceToNow(closeTimeDate, { addSuffix: true })
    : "";
  
  // Get appropriate status badge color
  const getStatusBadge = () => {
    switch (status) {
      case "open":
        return <Badge className="bg-green-500 hover:bg-green-600 text-white">Open</Badge>;
      case "closed":
        return <Badge variant="destructive">Closed</Badge>;
      case "resulted":
        return <Badge variant="secondary">Resulted</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // Get market icon based on type
  const getMarketIcon = () => {
    switch (type) {
      case "dishawar":
        return <Calendar className="h-14 w-14 text-primary" />;
      case "gali":
        return <Target className="h-14 w-14 text-primary" />;
      case "mumbai":
        return <Dice1 className="h-14 w-14 text-primary" />;
      case "kalyan":
        return <Clock className="h-14 w-14 text-primary" />;
      default:
        return <Calendar className="h-14 w-14 text-primary" />;
    }
  };

  return (
    <Card className="overflow-hidden h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-xl font-bold">{name}</CardTitle>
          <CardDescription>
            {openTimeFormatted} - {closeTimeFormatted}
          </CardDescription>
        </div>
        <div>{getStatusBadge()}</div>
      </CardHeader>
      <CardContent className="py-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-col space-y-2">
            {openResult && (
              <div className="flex items-center">
                <span className="text-sm font-medium">Open Result:</span>
                <Badge variant="outline" className="ml-2 text-xl font-bold">
                  {openResult}
                </Badge>
              </div>
            )}
            {closeResult && (
              <div className="flex items-center">
                <span className="text-sm font-medium">Close Result:</span>
                <Badge variant="outline" className="ml-2 text-xl font-bold">
                  {closeResult}
                </Badge>
              </div>
            )}
            {status === "open" && (
              <div className="text-sm opacity-80">
                Closes {timeRemainingText}
              </div>
            )}
          </div>
          <div className="flex items-center justify-center ml-4">
            {getMarketIcon()}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 pt-2 pb-2">
        {status === "open" && (
          <Button 
            className="w-full"
            onClick={() => setLocation(`/game/satamatka/${id}`)}
          >
            Place Bet <ArrowRightCircle className="ml-2 h-4 w-4" />
          </Button>
        )}
        {status !== "open" && showFullInfo && (
          <Button 
            className="w-full" 
            variant="outline"
            onClick={() => setLocation(`/game/satamatka/${id}/games`)}
          >
            View Games
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}