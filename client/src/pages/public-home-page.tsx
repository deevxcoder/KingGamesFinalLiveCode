import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import ResponsiveHeader from "@/components/responsive-header";
import ProfessionalFooter from "@/components/professional-footer";
import GameCard from "@/components/game-card";
import HeroSlider from "@/components/hero-slider";
import { Trophy, Target, Shield, ArrowRight } from "lucide-react";

// Sample game data
const gameCards = [
  {
    id: "coinflip",
    title: "Coin Flip",
    description: "Classic heads or tails betting with 50/50 odds for instant wins.",
    imageBg: "linear-gradient(to right, #3b82f6, #8b5cf6)",
    path: "/games",
    popularity: "high" as const,
    winRate: 50
  },
  {
    id: "satamatka",
    title: "Satta Matka",
    description: "Traditional Indian betting game with multiple betting options.",
    imageBg: "linear-gradient(to right, #ec4899, #8b5cf6)",
    path: "/satamatka",
    popularity: "medium" as const,
    winRate: 36
  },
  {
    id: "cricket",
    title: "Cricket Betting",
    description: "Bet on your favorite cricket teams and matches.",
    imageBg: "linear-gradient(to right, #10b981, #3b82f6)",
    path: "/cricket",
    popularity: "high" as const,
    winRate: 42
  }
];

export default function PublicHomePage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    // If user is logged in, redirect to dashboard
    if (user) {
      setLocation("/dashboard");
    }
  }, [user, setLocation]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* Header */}
      <ResponsiveHeader />

      {/* Hero Slider Section */}
      <HeroSlider 
        slides={[
          {
            id: "slide1",
            title: "The Premier Betting Platform",
            description: "Experience the thrill of betting with real-time results and attractive payouts. Play anywhere, anytime.",
            backgroundImage: "linear-gradient(to right, #3b82f6, #8b5cf6)",
            buttonText: "Start Betting Now",
            buttonLink: "/auth"
          },
          {
            id: "slide2",
            title: "Satta Matka Games",
            description: "Play the traditional Indian betting game with multiple options and high payouts.",
            backgroundImage: "linear-gradient(to right, #ec4899, #8b5cf6)",
            buttonText: "Play Satta Matka",
            buttonLink: "/auth"
          },
          {
            id: "slide3",
            title: "Sports Betting",
            description: "Bet on your favorite sports teams and win big with our competitive odds.",
            backgroundImage: "linear-gradient(to right, #10b981, #3b82f6)",
            buttonText: "Start Sports Betting",
            buttonLink: "/auth"
          }
        ]}
        autoPlayInterval={5000}
      />

      {/* Game Cards Section */}
      <section className="py-16" id="games">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold">Popular Games</h2>
            <Button 
              variant="ghost" 
              className="text-primary"
              onClick={() => setLocation("/auth")}
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {gameCards.map((game) => (
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
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card/30" id="features">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">Why Choose Us</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border">
              <CardHeader>
                <div className="mb-2 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Simple Betting</CardTitle>
                <CardDescription>
                  Easy to understand games with excellent odds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Place bets on various games and win up to 95x your bet amount. Our intuitive interface makes betting easy for everyone.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardHeader>
                <div className="mb-2 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-Time Results</CardTitle>
                <CardDescription>
                  Watch games unfold in real-time as you wait for the outcome
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our beautiful animations and real-time updates show you the results as they happen. No waiting, no delays.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border">
              <CardHeader>
                <div className="mb-2 h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Safe & Secure</CardTitle>
                <CardDescription>
                  Your funds and data are protected with the highest security standards
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We use advanced encryption and security protocols to ensure your information and funds are always protected.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-12">How to Play</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4 shadow-md">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create an Account</h3>
              <p className="text-muted-foreground">
                Sign up for a free account in seconds to start playing and tracking your bets.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4 shadow-md">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Place Your Bet</h3>
              <p className="text-muted-foreground">
                Choose your game, set your bet amount, and make your prediction to start playing.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4 shadow-md">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Win Prizes</h3>
              <p className="text-muted-foreground">
                Watch the game unfold and collect your winnings instantly if you predicted correctly.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Button 
              className="px-6 py-6 text-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
              onClick={() => setLocation("/auth")}
            >
              Register Now
            </Button>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <ProfessionalFooter />
    </div>
  );
}