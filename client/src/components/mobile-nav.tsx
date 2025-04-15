import { Link, useLocation } from "wouter";
import { Home, Play, History, User, Wallet } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { UserRole } from "@shared/schema";

export default function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const isAdmin = user?.role === UserRole.ADMIN;
  const isSubadmin = user?.role === UserRole.SUBADMIN;
  const isPlayer = user?.role === UserRole.PLAYER;

  // Base menu items for all users
  const navItems = [
    {
      name: "Home",
      icon: <Home className="w-5 h-5" />,
      path: "/dashboard",
      visible: true,
    },
    // Games only for players
    {
      name: "Games",
      icon: <Play className="w-5 h-5" />,
      path: "/play",
      visible: isPlayer,
    },
    // History only for players
    {
      name: "History",
      icon: <History className="w-5 h-5" />,
      path: "/history",
      visible: isPlayer,
    },
    // Balance for all users
    {
      name: "Balance",
      icon: <Wallet className="w-5 h-5" />,
      path: "/balance",
      visible: true,
      component: (
        <div className="flex flex-col items-center justify-center">
          <Wallet className="w-5 h-5" />
          <span className="text-xs mt-1 text-blue-300">${(user.balance / 100).toFixed(2)}</span>
        </div>
      ),
    },
    // Profile for all users
    {
      name: "Profile",
      icon: <User className="w-5 h-5" />,
      path: "/profile",
      visible: true,
    },
  ].filter(item => item.visible);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 z-50 lg:hidden">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
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
        ))}
      </div>
    </div>
  );
}