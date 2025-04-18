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
  comingSoon?: boolean;
}

export default function GameCard({ 
  id, 
  title, 
  description, 
  imageBg, 
  path,
  popularity = "medium",
  winRate,
  comingSoon = false
}: GameCardProps) {
  const [_, setLocation] = useLocation();
  const { user } = useAuth() || {};

  const getPopularityBadge = () => {
    switch (popularity) {
      case "high":
        return (
          <Badge variant="outline" className="bg-indigo-900/30 text-indigo-300 border-indigo-500/30">
            Popular
          </Badge>
        );
      case "medium":
        return (
          <Badge variant="outline" className="bg-blue-900/30 text-blue-300 border-blue-500/30">
            Trending
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Card className="overflow-hidden h-full transition-all duration-200 hover:shadow-lg border-slate-800 bg-slate-900/70 backdrop-blur-sm">
      <div 
        className="h-40 bg-cover bg-center relative"
        style={{ backgroundImage: imageBg }}
      >
        <div className="h-full w-full bg-gradient-to-b from-transparent to-black/80 flex items-end p-4">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">{title}</h3>
            <div className="mb-2 flex gap-2">
              {popularity !== "low" && getPopularityBadge()}
              
              {comingSoon && (
                <Badge variant="outline" className="bg-orange-900/30 text-orange-300 border-orange-500/30">
                  Coming Soon
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
        
        {winRate !== undefined && (
          <div className="flex items-center mt-3 mb-1">
            <Trophy className="h-4 w-4 text-blue-400 mr-1.5" />
            <span className="text-sm font-medium text-blue-100">Win rate: {winRate}%</span>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-4 pt-0 gap-2">
        <Button 
          className={`w-full ${
            comingSoon 
              ? "bg-gray-700 hover:bg-gray-600 cursor-not-allowed" 
              : "bg-gradient-to-r from-indigo-800 to-blue-600 hover:from-indigo-700 hover:to-blue-500"
          }`}
          onClick={() => {
            // For Coming Soon games, do nothing
            if (comingSoon) return;
            
            // If user is logged in, go to the game or dashboard
            // If not, redirect to auth page
            if (user) {
              setLocation(path);
            } else {
              setLocation("/auth");
            }
          }}
        >
          {comingSoon ? (
            <span>Coming Soon</span>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              {user ? "Play Now" : "Login to Play"}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}