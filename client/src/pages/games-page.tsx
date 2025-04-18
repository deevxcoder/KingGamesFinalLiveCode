import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import DashboardLayout from "@/components/dashboard-layout";
import GameCard from "@/components/game-card";
import { Play, Gamepad2 } from "lucide-react";

// All available games in the platform
const allGames = [
  {
    id: "marketgame",
    title: "Market Game",
    description: "Strategic market betting game with multiple betting options.",
    imageBg: "linear-gradient(to right, #1a1d30, #4e3a9a)",
    path: "/markets", // Updated to point to markets page
    popularity: "high" as const,
    winRate: 40
  },
  {
    id: "crickettoss",
    title: "Cricket Toss",
    description: "Predict the cricket match toss outcome for quick wins.",
    imageBg: "linear-gradient(to right, #1e3a30, #2a8062)",
    path: "/cricket-toss",
    popularity: "high" as const,
    winRate: 50
  },
  {
    id: "sportsbetting",
    title: "Sports Betting",
    description: "Bet on your favorite cricket teams and matches.",
    imageBg: "linear-gradient(to right, #2d2339, #784cb3)",
    path: "/team-match",
    popularity: "medium" as const,
    winRate: 36
  },
  {
    id: "coinflip",
    title: "Coin Flip",
    description: "Classic heads or tails betting with 50/50 odds for instant wins.",
    imageBg: "linear-gradient(to right, #1e293b, #3b5cb8)",
    path: "/coinflip",
    popularity: "high" as const,
    winRate: 50
  },
  {
    id: "slots",
    title: "Slot Machine",
    description: "Try your luck with our virtual slot machine games.",
    imageBg: "linear-gradient(to right, #2d1b36, #9d4e82)",
    path: "/slots",
    popularity: "medium" as const,
    winRate: 30
  },
  {
    id: "roulette",
    title: "Roulette",
    description: "Place your bets on the spinning wheel of fortune.",
    imageBg: "linear-gradient(to right, #1f2c33, #2b7a78)",
    path: "/roulette",
    popularity: "medium" as const,
    winRate: 35
  },
  {
    id: "cardgames",
    title: "Card Games",
    description: "Play your favorite card games and win big.",
    imageBg: "linear-gradient(to right, #302626, #a44a3f)",
    path: "/cards",
    popularity: "low" as const,
    winRate: 40
  },
  {
    id: "lottery",
    title: "Lottery",
    description: "Try your luck in our daily and weekly lottery draws.",
    imageBg: "linear-gradient(to right, #1e241e, #4e7561)",
    path: "/lottery",
    popularity: "low" as const,
    winRate: 20
  }
];

export default function GamesPage() {
  const { user } = useAuth();
  const isPlayer = user?.role === UserRole.PLAYER;

  if (!isPlayer) {
    return (
      <DashboardLayout title="Games">
        <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h2 className="text-xl font-bold mb-3 text-slate-200">Admin Restricted Area</h2>
          <p className="text-slate-400">
            As an administrator, you don't have permission to play games.
            Your role is to manage the platform and users only.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="All Games">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          <Gamepad2 className="h-5 w-5 mr-2 text-blue-500" />
          <h2 className="text-lg font-medium text-slate-200">
            Browse All Available Games
          </h2>
        </div>
        <p className="text-slate-400 text-sm">
          Explore our complete collection of games and start playing now
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {allGames.map((game) => (
          <GameCard 
            key={game.id}
            id={game.id}
            title={game.title}
            description={game.description}
            imageBg={game.imageBg}
            path={game.path}
            popularity={game.popularity}
            winRate={game.winRate}
          />
        ))}
      </div>
    </DashboardLayout>
  );
}