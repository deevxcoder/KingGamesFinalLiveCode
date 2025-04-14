import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { 
  LayoutDashboard, 
  Users, 
  Play, 
  Clock, 
  LogOut, 
  Menu, 
  X,
  ShieldCheck,
  History,
  Target,
  Dice1
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const canManageUsers = isAdmin || isSubadmin;
  
  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <LayoutDashboard className="w-5 h-5 mr-3" />,
      visible: true,
    },
    {
      name: "User Management",
      path: "/users",
      icon: <Users className="w-5 h-5 mr-3" />,
      visible: canManageUsers,
    },
    {
      name: "Subadmin Management",
      path: "/subadmins",
      icon: <ShieldCheck className="w-5 h-5 mr-3" />,
      visible: isAdmin,
    },
    {
      name: "Play Game",
      path: "/play",
      icon: <Play className="w-5 h-5 mr-3" />,
      visible: true,
    },
    {
      name: "Markets",
      path: "/markets",
      icon: <Target className="w-5 h-5 mr-3" />,
      visible: true,
    },
    {
      name: "Game History",
      path: "/history",
      icon: <Clock className="w-5 h-5 mr-3" />,
      visible: true,
    },
    {
      name: "Action History",
      path: "/actions",
      icon: <History className="w-5 h-5 mr-3" />,
      visible: true,
    },
    {
      name: "Back to Home",
      path: "/",
      icon: <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7m-7-7v14"></path>
            </svg>,
      visible: true,
    },
  ];
  
  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-card border-r border-border">
        <div className="p-4 flex items-center justify-center border-b border-border">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
            CoinFlip
          </h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul>
            {menuItems.filter(item => item.visible).map((item) => (
              <li key={item.path} className="mb-1">
                <Link href={item.path}
                  className={cn(
                    "flex items-center px-4 py-3 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg mx-2 transition-colors",
                    location === item.path && "bg-accent text-accent-foreground"
                  )}>
                    {item.icon}
                    {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* User Info */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-blue-400 flex items-center justify-center text-white font-bold">
              <span>{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">{user?.username}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="ml-auto rounded-full text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Mobile Nav */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-card border-b border-border p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-400">
          CoinFlip
        </h1>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleMobileMenu}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </Button>
      </div>
      
      {/* Mobile Menu */}
      <div className={cn(
        "lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40",
        isMobileMenuOpen ? "block" : "hidden"
      )}>
        <div className="w-64 h-full bg-card pt-16">
          <nav className="p-4">
            <ul className="space-y-2">
              {menuItems.filter(item => item.visible).map((item) => (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={cn(
                      "flex items-center px-4 py-3 text-foreground hover:bg-accent hover:text-accent-foreground rounded-lg transition-colors",
                      location === item.path && "bg-accent text-accent-foreground"
                    )}
                    onClick={toggleMobileMenu}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
            
            <Separator className="my-4" />
            
            <Button 
              variant="outline" 
              className="w-full flex items-center justify-center" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              <LogOut className="w-5 h-5 mr-2" />
              Sign Out
            </Button>
            
            <div className="mt-4 flex items-center">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                <span>{user?.username?.charAt(0).toUpperCase()}</span>
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium text-foreground">{user?.username}</p>
                <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
