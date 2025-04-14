import { Link } from "wouter";
import { 
  Mail, 
  Phone, 
  Globe, 
  Shield, 
  HelpCircle,
  FileText,
  AlertTriangle,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function ProfessionalFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border py-12 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Column 1: About */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-foreground">CoinFlip</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Experience the thrill of betting with our secure and fair gaming platform.
              We provide a premium betting experience with real-time results and attractive payouts.
            </p>
            <div className="flex space-x-3">
              <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                <Mail className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                <Globe className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="rounded-full h-8 w-8">
                <Phone className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/dashboard"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link 
                  href="/games"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Games
                </Link>
              </li>
              <li>
                <Link 
                  href="/game-history"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Game History
                </Link>
              </li>
              <li>
                <Link 
                  href="/markets"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Markets
                </Link>
              </li>
              <li>
                <Link 
                  href="/auth"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm"
                >
                  Login/Register
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3: Support */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-foreground">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link 
                  href="/help"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center"
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Help Center
                </Link>
              </li>
              <li>
                <Link 
                  href="/faq"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  FAQ
                </Link>
              </li>
              <li>
                <Link 
                  href="/responsible-gaming"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Responsible Gaming
                </Link>
              </li>
              <li>
                <Link 
                  href="/security"
                  className="text-muted-foreground hover:text-primary transition-colors text-sm flex items-center"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Security
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 4: Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4 text-foreground">Stay Updated</h3>
            <p className="text-muted-foreground text-sm mb-3">
              Subscribe to receive updates about new features and promotions.
            </p>
            <div className="flex mb-4">
              <input 
                type="email" 
                placeholder="Your email" 
                className="flex-1 px-3 py-2 text-sm rounded-l-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button 
                className="rounded-l-none bg-gradient-to-r from-primary to-blue-400"
              >
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              By subscribing, you agree to our Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
        
        <Separator className="my-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground mb-4 md:mb-0">
            &copy; {currentYear} CoinFlip. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link 
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link 
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link 
              href="/cookies"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
        
        {/* Made with love */}
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground flex items-center justify-center">
            Made with <Heart className="h-3 w-3 mx-1 text-red-500" /> by CoinFlip Team
          </p>
        </div>
      </div>
    </footer>
  );
}