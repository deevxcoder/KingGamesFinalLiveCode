import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import MobileNav from "@/components/mobile-nav";
import { useAuth } from "@/hooks/use-auth";
import { Wallet } from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user } = useAuth();
  
  return (
    <div className="flex min-h-screen h-screen bg-slate-950 text-slate-200">
      {/* Sidebar - Hidden on mobile */}
      <div className="hidden lg:block h-screen">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1 overflow-hidden">
        
        <main className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {title && (
            <div className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
              <div className="px-4 py-3 flex justify-between items-center">
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-500">
                  {title}
                </h1>
                {user && (
                  <div className="flex items-center bg-slate-800/60 px-3 py-1.5 rounded-full">
                    <Wallet className="h-4 w-4 mr-2 text-primary" />
                    <span className="font-medium">₹{(user.balance / 100).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="container mx-auto px-4 py-4">
            {children}
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <MobileNav />
    </div>
  );
}