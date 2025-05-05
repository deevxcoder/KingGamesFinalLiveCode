import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IndianRupee } from "lucide-react";
import { Link, useLocation } from "wouter";

interface BalanceCardProps {
  balance: number;
}

export default function BalanceCard({ balance }: BalanceCardProps) {
  const [location] = useLocation();
  
  // Determine if we're in the admin or subadmin dashboard to create the right deposit link
  const baseUrl = location.includes('/admin') ? '/admin' : '/subadmin';
  const depositUrl = `${baseUrl}/wallet/deposit`;
  
  return (
    <Card className="bg-slate-900/70 shadow-lg border border-slate-800 w-full lg:w-auto">
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-600 mr-3">
            <IndianRupee className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Your Balance</p>
            <p className="text-xl font-bold text-fuchsia-300">₹{(balance / 100).toFixed(2)}</p>
          </div>
          <Link href={depositUrl}>
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-4 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Deposit
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
