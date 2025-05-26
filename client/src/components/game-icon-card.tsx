import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";
import { Badge } from "@/components/ui/badge";

interface GameIconCardProps {
  id: string;
  title: string;
  icon: LucideIcon | IconType;
  path: string;
  gradient: string;
  comingSoon?: boolean;
}

export default function GameIconCard({
  id,
  title,
  icon: Icon,
  path,
  gradient,
  comingSoon = false
}: GameIconCardProps) {
  const [_, setLocation] = useLocation();

  const handleClick = () => {
    if (!comingSoon) {
      setLocation(path);
    }
  };

  return (
    <Card 
      className={`overflow-hidden transition-all hover:scale-105 border-slate-700 shadow-sm ${!comingSoon ? 'cursor-pointer' : 'cursor-default'}`}
      onClick={handleClick}
    >
      <CardContent className="p-0 relative">
        <div className={`flex flex-col items-center justify-center p-6 h-full ${gradient}`}>
          <Icon className="h-10 w-10 text-white mb-2" />
          <h3 className="font-medium text-white text-lg text-center">{title}</h3>
          
          {comingSoon && (
            <Badge className="mt-2 bg-orange-900/70 text-orange-300 border-orange-500/30">
              Coming Soon
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}