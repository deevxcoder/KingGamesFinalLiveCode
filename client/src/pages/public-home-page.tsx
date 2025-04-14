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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="w-full bg-card/50 border-b border-border py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            CoinFlip
          </h1>
          <div>
            <Button
              variant="outline"
              className="mr-2"
              onClick={() => setLocation("/auth")}
            >
              Login
            </Button>
            <Button
              className="bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
              onClick={() => setLocation("/auth")}
            >
              Register
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-background to-background/95">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2">
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
                The Premier Coin Toss <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">Betting Platform</span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                Experience the thrill of coin toss betting with real-time results and attractive payouts.
              </p>
              <Button 
                className="px-8 py-6 text-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
                onClick={() => setLocation("/auth")}
              >
                Start Betting Now
              </Button>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative w-64 h-64 perspective-1000">
                <div className="absolute w-64 h-64 rounded-full flex items-center justify-center text-white text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 animate-pulse">
                  COIN FLIP
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Our Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Simple Betting</CardTitle>
                <CardDescription>
                  Easy to understand coin toss game with 50/50 odds
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Place bets on heads or tails and win up to 1.95x your bet amount. It's that simple!
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Real-Time Results</CardTitle>
                <CardDescription>
                  Watch the coin flip in real-time as you wait for the outcome
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our beautiful 3D coin animation shows you the actual result of your bet as it happens.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Game History</CardTitle>
                <CardDescription>
                  Keep track of all your bets and monitor your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View detailed statistics about your betting history, win rate, and overall performance.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How to Play</h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Create an Account</h3>
              <p className="text-muted-foreground">
                Sign up for a free account to start playing and tracking your bets.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">Place Your Bet</h3>
              <p className="text-muted-foreground">
                Choose heads or tails and set your bet amount to start playing.
              </p>
            </div>
            
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Win Prizes</h3>
              <p className="text-muted-foreground">
                Watch the coin flip and collect your winnings if you predicted correctly.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-12">
            <Button 
              className="px-8 py-6 text-lg bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
              onClick={() => setLocation("/auth")}
            >
              Register Now
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 bg-card border-t border-border">
        <div className="container mx-auto px-4 text-center">
          <p className="text-muted-foreground">
            &copy; {new Date().getFullYear()} CoinFlip. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}