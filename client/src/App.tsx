import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Router, Route, Switch } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

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
      <TooltipProvider>
        <Router>
          <Switch>
            {/* Customer Routes */}
            <Route path="/" component={CustomerDashboard} />
            <Route path="/orders" component={CustomerOrders} />
            <Route path="/profile" component={CustomerProfile} />
            
            {/* Admin Routes */}
            <Route path="/admin">
              <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                  <AdminDashboard />
                </main>
              </div>
            </Route>
            
            <Route path="/admin/orders">
              <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                  <AdminOrders />
                </main>
              </div>
            </Route>
            
            <Route path="/admin/users">
              <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                  <AdminUsers />
                </main>
              </div>
            </Route>
            
            <Route path="/admin/transactions">
              <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                  <AdminTransactions />
                </main>
              </div>
            </Route>
            
            <Route path="/admin/approvals">
              <div className="flex h-screen bg-gray-50">
                <AdminSidebar />
                <main className="flex-1 overflow-y-auto">
                  <AdminApprovals />
                </main>
              </div>
            </Route>
            
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </Router>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;