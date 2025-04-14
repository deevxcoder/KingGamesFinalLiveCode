import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { UserRole } from "@shared/schema";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import GamePage from "@/pages/game-page";
import UserManagementPage from "@/pages/user-management-page";
import SubadminManagementPage from "@/pages/subadmin-management-page";
import GameHistoryPage from "@/pages/game-history-page";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/play" component={GamePage} />
      <ProtectedRoute 
        path="/users" 
        component={UserManagementPage} 
        allowedRoles={[UserRole.ADMIN, UserRole.SUBADMIN]}
      />
      <ProtectedRoute 
        path="/subadmins" 
        component={SubadminManagementPage} 
        allowedRoles={[UserRole.ADMIN]}
      />
      <ProtectedRoute path="/history" component={GameHistoryPage} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
