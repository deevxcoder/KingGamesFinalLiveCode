import { useState } from "react";
import { useLocation } from "wouter";
import { Menu, X, Wallet, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger, 
  SheetClose 
} from "@/components/ui/sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { UserRole } from "@shared/schema";

export default function ResponsiveHeader() {
  const [_, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;

  if (!user) {
    // Public header for non-authenticated users
    return (
      <header className="w-full bg-card/50 border-b border-border py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            CoinFlip
          </h1>
          <div className="flex">
            <Button
              className="bg-gradient-to-r from-primary to-blue-400 hover:from-primary/90 hover:to-blue-600"
              onClick={() => setLocation("/auth")}
            >
              Login / Register
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Authenticated header
  return (
    <header className="w-full bg-card/50 border-b border-border py-3 sticky top-0 z-40">
      <div className="container mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            CoinFlip
          </h1>
        </div>
        
        <div className="flex items-center">
          {/* Balance display */}
          <div className="mr-4 flex items-center bg-muted/50 px-3 py-1.5 rounded-full">
            <Wallet className="h-4 w-4 mr-2 text-primary" />
            <span className="font-medium">${(user.balance / 100).toFixed(2)}</span>
          </div>
          
          {/* User dropdown menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <div className="w-7 h-7 rounded-full bg-gradient-to-r from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                  <span>{user.username.charAt(0).toUpperCase()}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Mobile menu trigger - only shown on very small screens */}
          <Sheet>
            <SheetTrigger asChild className="lg:hidden ml-2">
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
                    CoinFlip
                  </h2>
                  <SheetClose asChild>
                    <Button variant="ghost" size="icon">
                      <X className="h-5 w-5" />
                    </Button>
                  </SheetClose>
                </div>
                
                <div className="flex items-center mb-6 p-3 bg-muted/50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-blue-400 flex items-center justify-center text-white font-bold text-lg mr-3">
                    <span>{user.username.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                  </div>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg mb-6 flex items-center justify-between">
                  <div className="flex items-center">
                    <Wallet className="h-5 w-5 mr-2 text-primary" />
                    <span className="font-medium">Balance</span>
                  </div>
                  <span className="font-bold">${(user.balance / 100).toFixed(2)}</span>
                </div>
                
                <div className="mt-auto">
                  <SheetClose asChild>
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleLogout}
                    >
                      Logout
                    </Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}