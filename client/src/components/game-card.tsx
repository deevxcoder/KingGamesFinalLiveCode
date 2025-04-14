import { useLocation } from "wouter";
import { Play, Trophy, ArrowRight } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface GameCardProps {
  id: string;
  title: string;
  description: string;
  imageBg: string;
  path: string;
  popularity?: "high" | "medium" | "low";
  winRate?: number;
}

export default function GameCard({ 
  id, 
  title, 
  description, 
  imageBg, 
  path,
  popularity = "medium",
  winRate
}: GameCardProps) {
  const [_, setLocation] = useLocation();
  const { user } = useAuth() || {};

  const getPopularityBadge = () => {
    switch (popularity) {
      case "high":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Popular
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200">
            Trending
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-md border-border">
      <div 
        className="h-40 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageBg})` }}
      >
        <div className="h-full w-full bg-gradient-to-b from-transparent to-black/70 flex items-end p-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            {popularity !== "low" && (
              <div className="mb-2">{getPopularityBadge()}</div>
            )}
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        
        {winRate !== undefined && (
          <div className="flex items-center mt-3 mb-1">
            <Trophy className="h-4 w-4 text-amber-500 mr-1.5" />
            <span className="text-sm font-medium">Win rate: {winRate}%</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-2">
        <Button 
          className="w-full bg-gradient-to-r from-primary to-blue-400"
          onClick={() => {
            // If user is logged in, go to the game or dashboard
            // If not, redirect to auth page
            if (user) {
              setLocation(path);
            } else {
              setLocation("/auth");
            }
          }}
        >
          <Play className="h-4 w-4 mr-2" />
          {user ? "Play Now" : "Login to Play"}
        </Button>
      </CardFooter>
    </Card>
  );
}