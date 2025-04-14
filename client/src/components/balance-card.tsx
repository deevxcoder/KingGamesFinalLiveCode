import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";

interface BalanceCardProps {
  balance: number;
}

export default function BalanceCard({ balance }: BalanceCardProps) {
  return (
    <Card className="bg-card shadow-lg border border-border w-full lg:w-auto">
      <CardContent className="p-4">
        <div className="flex items-center">
          <div className="p-2 rounded-full bg-gradient-to-r from-primary to-blue-500 mr-3">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Balance</p>
            <p className="text-xl font-bold">${(balance / 100).toFixed(2)}</p>
          </div>
          <Button variant="outline" size="sm" className="ml-4">
            Deposit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
