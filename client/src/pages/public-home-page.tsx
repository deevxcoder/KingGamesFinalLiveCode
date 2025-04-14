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
import RecentResults from "@/components/recent-results";
import RecentWinners from "@/components/recent-winners";
import { Trophy, Target, Shield, ArrowRight } from "lucide-react";

// Sample recent results data
const sampleRecentResults = [
  {
    id: 1,
    name: "Mumbai Main",
    type: "day",
    openTime: "2023-04-14T10:00:00Z",
    closeTime: "2023-04-14T18:00:00Z",
    openResult: "234",
    closeResult: "567",
    status: "resulted",
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "Delhi Express",
    type: "morning",
    openTime: "2023-04-14T09:30:00Z",
    closeTime: "2023-04-14T13:30:00Z",
    openResult: "456",
    closeResult: "789",
    status: "resulted",
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 3,
    name: "Kalyan Day",
    type: "day",
    openTime: "2023-04-14T11:00:00Z",
    closeTime: "2023-04-14T17:00:00Z",
    openResult: "345",
    closeResult: "678",
    status: "resulted",
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 4,
    name: "Rajdhani Night",
    type: "night",
    openTime: "2023-04-14T19:00:00Z",
    closeTime: "2023-04-14T23:00:00Z",
    openResult: "567",
    closeResult: "890",
    status: "resulted",
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 5,
    name: "Milan Day",
    type: "day",
    openTime: "2023-04-14T10:30:00Z",
    closeTime: "2023-04-14T16:30:00Z",
    openResult: "678",
    closeResult: "901",
    status: "resulted",
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 6,
    name: "Sridevi Night",
    type: "night",
    openTime: "2023-04-14T18:30:00Z",
    closeTime: "2023-04-14T22:30:00Z",
    openResult: "789",
    closeResult: "012",
    status: "resulted",
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: 7,
    name: "Time Bazar",
    type: "day",
    openTime: "2023-04-14T12:00:00Z",
    closeTime: "2023-04-14T18:00:00Z",
    openResult: "890",
    closeResult: "123",
    status: "resulted",
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 8,
    name: "Madhur Day",
    type: "day",
    openTime: "2023-04-14T11:30:00Z",
    closeTime: "2023-04-14T17:30:00Z",
    openResult: "901",
    closeResult: "234",
    status: "resulted",
    createdAt: new Date(Date.now() - 25200000).toISOString(),
  },
  {
    id: 9,
    name: "Supreme Day",
    type: "day",
    openTime: "2023-04-14T13:00:00Z",
    closeTime: "2023-04-14T19:00:00Z",
    openResult: "012",
    closeResult: "345",
    status: "resulted",
    createdAt: new Date(Date.now() - 28800000).toISOString(),
  },
  {
    id: 10,
    name: "Worli Mumbai",
    type: "day",
    openTime: "2023-04-14T14:00:00Z",
    closeTime: "2023-04-14T20:00:00Z",
    openResult: "123",
    closeResult: "456",
    status: "resulted",
    createdAt: new Date(Date.now() - 32400000).toISOString(),
  }
];

// Sample recent winners data
const sampleRecentWinners = [
  {
    id: 1,
    username: "lucky777",
    game: "Coin Flip",
    amount: 5000,
    payout: 9500,
    createdAt: new Date(Date.now() - 300000).toISOString(),
  },
  {
    id: 2,
    username: "betmaster",
    game: "Satta Matka",
    amount: 10000,
    payout: 50000,
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 3,
    username: "winner123",
    game: "Cricket Betting",
    amount: 2000,
    payout: 6000,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 4,
    username: "highroller",
    game: "Coin Flip",
    amount: 20000,
    payout: 40000,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 5,
    username: "gameknight",
    game: "Satta Matka",
    amount: 5000,
    payout: 25000,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 6,
    username: "bettingpro",
    game: "Cricket Betting",
    amount: 15000,
    payout: 45000,
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 7,
    username: "levelupgamer",
    game: "Coin Flip",
    amount: 3000,
    payout: 6000,
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
  {
    id: 8,
    username: "wagermasters",
    game: "Satta Matka",
    amount: 7500,
    payout: 37500,
    createdAt: new Date(Date.now() - 21600000).toISOString(),
  },
  {
    id: 9,
    username: "luckybets",
    game: "Cricket Betting",
    amount: 4000,
    payout: 12000,
    createdAt: new Date(Date.now() - 25200000).toISOString(),
  },
  {
    id: 10,
    username: "fortuneplayer",
    game: "Coin Flip",
    amount: 10000,
    payout: 20000,
    createdAt: new Date(Date.now() - 28800000).toISOString(),
  }
];

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
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">How to Play</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0 shadow-sm">
                  1
                </div>
                <div>
                  <CardTitle className="text-xl mb-1">Create an Account</CardTitle>
                  <CardDescription>
                    Fast and secure sign-up process
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sign up for a free account in just a few seconds. Track your bets, manage your balance, and access exclusive offers.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0 shadow-sm">
                  2
                </div>
                <div>
                  <CardTitle className="text-xl mb-1">Place Your Bet</CardTitle>
                  <CardDescription>
                    Simple and intuitive betting
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Select from our variety of games, set your bet amount, and make your prediction. Our user-friendly interface makes betting straightforward.
                </p>
              </CardContent>
            </Card>
            
            <Card className="border-border shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2 flex flex-row items-start space-x-4">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold shrink-0 shadow-sm">
                  3
                </div>
                <div>
                  <CardTitle className="text-xl mb-1">Win Prizes</CardTitle>
                  <CardDescription>
                    Instant payouts on winning bets
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Watch the results in real-time and receive your winnings instantly. Withdraw your earnings or use them to place more bets.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <Button 
              className="px-6 py-6 text-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
              onClick={() => setLocation("/auth")}
            >
              Register Now
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="py-16 bg-card/20" id="recent-activity">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Recent Activity</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Results */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2 text-primary" />
                  Recent Results
                </CardTitle>
                <CardDescription>
                  Latest market results from our games
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentResults results={sampleRecentResults} />
              </CardContent>
            </Card>
            
            {/* Recent Winners */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-primary" />
                  Recent Winners
                </CardTitle>
                <CardDescription>
                  Players who recently won big on our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecentWinners winners={sampleRecentWinners} />
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <Button 
              variant="outline"
              className="border-primary/30"
              onClick={() => setLocation("/auth")}
            >
              Join Now to Start Winning
            </Button>
          </div>
        </div>
      </section>

      {/* Professional Footer */}
      <ProfessionalFooter />
    </div>
  );
}