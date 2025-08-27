import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./contexts/auth-context";
import { AuthGuard } from "./components/auth/auth-guard";
import { AdminGuard } from "./components/AdminGuard";
import AuthPage from "./pages/auth";

// Customer Interface
import CustomerDashboard from "./pages/customer-dashboard";
import CustomerOrders from "./pages/customer-orders";
import CustomerProfile from "./pages/customer-profile";

// Admin Interface
import AdminSidebar from "./components/layout/admin-sidebar";
import AdminDashboard from "./pages/admin-dashboard";
import AdminOrders from "./pages/admin-orders";
import AdminUsers from "./pages/admin-users";
import AdminTransactions from "./pages/admin-transactions";
import AdminApprovals from "./pages/admin-approvals";

import NotFound from "./pages/not-found";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Router>
            <Switch>
              {/* Authentication Route */}
              <Route path="/auth" component={AuthPage} />
              {/* Customer Routes */}
              <Route path="/">
                <AuthGuard>
                  <CustomerDashboard />
                </AuthGuard>
              </Route>
              <Route path="/orders">
                <AuthGuard>
                  <CustomerOrders />
                </AuthGuard>
              </Route>
              <Route path="/profile">
                <AuthGuard>
                  <CustomerProfile />
                </AuthGuard>
              </Route>
            
              {/* Admin Routes */}
              <Route path="/admin">
                <AdminGuard>
                  <div className="flex h-screen bg-gray-50">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto">
                      <AdminDashboard />
                    </main>
                  </div>
                </AdminGuard>
              </Route>
            
              <Route path="/admin/orders">
                <AdminGuard>
                  <div className="flex h-screen bg-gray-50">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto">
                      <AdminOrders />
                    </main>
                  </div>
                </AdminGuard>
              </Route>
              
              <Route path="/admin/users">
                <AdminGuard>
                  <div className="flex h-screen bg-gray-50">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto">
                      <AdminUsers />
                    </main>
                  </div>
                </AdminGuard>
              </Route>
              
              <Route path="/admin/transactions">
                <AdminGuard>
                  <div className="flex h-screen bg-gray-50">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto">
                      <AdminTransactions />
                    </main>
                  </div>
                </AdminGuard>
              </Route>
              
              <Route path="/admin/approvals">
                <AdminGuard>
                  <div className="flex h-screen bg-gray-50">
                    <AdminSidebar />
                    <main className="flex-1 overflow-y-auto">
                      <AdminApprovals />
                    </main>
                  </div>
                </AdminGuard>
              </Route>
            
              <Route component={NotFound} />
            </Switch>
            <Toaster />
          </Router>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;