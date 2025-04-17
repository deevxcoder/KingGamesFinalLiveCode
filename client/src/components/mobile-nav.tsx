import { Link, useLocation } from "wouter";
import { Home, Play, History, User, Wallet, BarChart2, Gamepad2, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function MobileNav() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const isPlayer = user?.role === UserRole.PLAYER;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Base menu items for all users
  const navItems = [
    {
      name: "Home",
      icon: <Home className="w-5 h-5" />,
      path: "/dashboard",
      visible: true,
    },
    // All Games (Browse) for players
    {
      name: "Games",
      icon: <Gamepad2 className="w-5 h-5" />,
      path: "/games",
      visible: isPlayer,
    },
    // History only for players
    {
      name: "History",
      icon: <History className="w-5 h-5" />,
      path: "/history",
      visible: isPlayer,
    },
    // Risk Management for admin/subadmin
    {
      name: "Risk",
      icon: <BarChart2 className="w-5 h-5" />,
      path: "/risk-management",
      visible: isAdmin || isSubadmin,
    },
    // Wallet for all users
    {
      name: "Wallet",
      icon: <Wallet className="w-5 h-5" />,
      path: "/wallet",
      visible: true,
      component: (
        <div className="flex flex-col items-center justify-center">
          <Wallet className="w-5 h-5" />
          <span className="text-xs mt-1 text-blue-300 font-semibold">₹{(user.balance / 100).toFixed(2)}</span>
        </div>
      ),
    },
    // Profile for all users
    {
      name: "Profile",
      icon: (
        <Avatar className="h-6 w-6 bg-gradient-to-r from-primary to-blue-400">
          <AvatarFallback className="text-white font-bold text-[10px]">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      ),
      path: "/profile",
      visible: true,
    },
    // Logout for all users
    {
      name: "Logout",
      icon: <LogOut className="w-5 h-5" />,
      path: "#",
      visible: true,
      onClick: handleLogout,
    },
  ].filter(item => item.visible);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 lg:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          // For items with onClick handlers (like logout)
          if (item.onClick) {
            return (
              <button
                key={item.path}
                onClick={item.onClick}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full text-xs",
                  "text-red-400 hover:text-red-300"
                )}
              >
                {item.component || (
                  <>
                    {item.icon}
                    <span className="mt-1">{item.name}</span>
                  </>
                )}
              </button>
            );
          }
          
          // Regular navigation items
          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full text-xs",
                location === item.path
                  ? "text-blue-400"
                  : "text-slate-400 hover:text-slate-200"
              )}
            >
              {item.component || (
                <>
                  {item.icon}
                  <span className="mt-1">{item.name}</span>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}