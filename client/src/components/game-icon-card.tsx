import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons";

interface GameIconCardProps {
  id: string;
  title: string;
  icon: LucideIcon | IconType;
  path: string;
  gradient: string;
}

export default function GameIconCard({
  id,
  title,
  icon: Icon,
  path,
  gradient
}: GameIconCardProps) {
  const [_, setLocation] = useLocation();

  return (
    <Card 
      className="overflow-hidden cursor-pointer transition-all hover:scale-105 border-slate-700 shadow-sm"
      onClick={() => setLocation(path)}
    >
      <CardContent className="p-0">
        <div className={`flex flex-col items-center justify-center p-6 ${gradient}`}>
          <Icon className="h-10 w-10 text-white mb-3" />
          <h3 className="font-medium text-white text-lg text-center">{title}</h3>
        </div>
      </CardContent>
    </Card>
  );
}