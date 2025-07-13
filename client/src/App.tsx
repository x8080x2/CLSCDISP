
import { Router, Route, Switch } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import Transactions from "@/pages/transactions";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <div className="flex h-screen bg-gray-50">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
              <main className="flex-1 overflow-auto">
                <Switch>
                  <Route path="/" component={Dashboard} />
                  <Route path="/orders" component={Orders} />
                  <Route path="/transactions" component={Transactions} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
