import React from "react";
import DashboardLayout from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This is a placeholder component as risk management has been removed
export default function RiskManagementPage() {
  return (
    <DashboardLayout title="Feature Removed">
      <Card>
        <CardHeader>
          <CardTitle>Risk Management Feature Removed</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This feature has been removed to simplify the platform.</p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}