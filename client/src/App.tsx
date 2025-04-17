import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { UserRole } from "./lib/types";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import PublicHomePage from "@/pages/public-home-page";
import GamePage from "@/pages/game-page";
import GamesPage from "@/pages/games-page";
import ProfilePage from "@/pages/profile-page";
import UserManagementPage from "@/pages/user-management-page";
import SubadminManagementPage from "@/pages/subadmin-management-page";
import GameHistoryPage from "@/pages/game-history-page";
import RiskManagementPage from "@/pages/risk-management-page";
import MarketListPage from "@/pages/market-list-page";
import SatamatkaGamePage from "@/pages/satamatka-game-page";
import TeamMatchPage from "@/pages/team-match-page";
import CricketTossPage from "@/pages/cricket-toss-page";
import AdminMarketManagementPage from "@/pages/admin-market-management-page";
import AdminTeamMatchPage from "@/pages/admin-team-match-page";
import AdminCricketTossPage from "@/pages/admin-cricket-toss-page";
import JantriManagementPage from "@/pages/jantri-management-page";
import WalletPage from "@/pages/wallet-page";
import AdminSettingsPage from "@/pages/admin-settings-page";
import SubadminSettingsPage from "@/pages/subadmin-settings-page";
import FundManagementPage from "@/pages/fund-management-page";

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={PublicHomePage} />
      <Route path="/auth" component={AuthPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/dashboard" component={HomePage} />
      
      {/* Player routes - only for normal players (not admin/subadmin) */}
      <ProtectedRoute 
        path="/coinflip" 
        component={GamePage} 
        allowedRoles={[UserRole.PLAYER]}
      />
      <ProtectedRoute 
        path="/history" 
        component={GameHistoryPage} 
        allowedRoles={[UserRole.PLAYER]}
      />
      <ProtectedRoute 
        path="/risk-management" 
        component={RiskManagementPage}
        allowedRoles={[UserRole.ADMIN, UserRole.SUBADMIN]}
      />
      <ProtectedRoute 
        path="/jantri-management" 
        component={JantriManagementPage}
        allowedRoles={[UserRole.ADMIN, UserRole.SUBADMIN]}
      />
      <ProtectedRoute 
        path="/fund-management" 
        component={FundManagementPage}
        allowedRoles={[UserRole.ADMIN]}
      />
      
      {/* Admin/Subadmin routes */}
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
      
      {/* Admin Market and Team Management routes */}
      <ProtectedRoute 
        path="/manage-markets" 
        component={AdminMarketManagementPage} 
        allowedRoles={[UserRole.ADMIN]}
      />
      <ProtectedRoute 
        path="/manage-teams" 
        component={AdminTeamMatchPage} 
        allowedRoles={[UserRole.ADMIN]}
      />
      <ProtectedRoute 
        path="/manage-cricket-toss" 
        component={AdminCricketTossPage} 
        allowedRoles={[UserRole.ADMIN]}
      />
      
      {/* Settings routes */}
      <ProtectedRoute 
        path="/settings" 
        component={AdminSettingsPage} 
        allowedRoles={[UserRole.ADMIN]}
      />
      <ProtectedRoute 
        path="/settings/subadmin" 
        component={SubadminSettingsPage} 
        allowedRoles={[UserRole.SUBADMIN]}
      />
      
      {/* Game routes - only for normal players */}
      <ProtectedRoute 
        path="/markets" 
        component={MarketListPage}
        allowedRoles={[UserRole.PLAYER]} 
      />
      <ProtectedRoute 
        path="/game/satamatka/:id" 
        component={SatamatkaGamePage}
        allowedRoles={[UserRole.PLAYER]} 
      />
      <ProtectedRoute 
        path="/sports" 
        component={TeamMatchPage}
        allowedRoles={[UserRole.PLAYER]} 
      />
      <ProtectedRoute 
        path="/cricket-toss" 
        component={CricketTossPage}
        allowedRoles={[UserRole.PLAYER]} 
      />
      
      {/* New player pages - games and profile */}
      <ProtectedRoute
        path="/games"
        component={GamesPage}
        allowedRoles={[UserRole.PLAYER]}
      />
      <ProtectedRoute
        path="/profile"
        component={ProfilePage}
      />
      
      {/* Wallet route - accessible to all authenticated users */}
      <ProtectedRoute
        path="/wallet"
        component={WalletPage}
      />
      
      {/* 404 route */}
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
