import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import AdminConsole from "@/pages/AdminConsole";
import PerformanceDashboard from "@/pages/PerformanceDashboard";
import StressAnalytics from "@/pages/StressAnalytics";
import TeamMonitoring from "@/pages/TeamMonitoring";
import AlertManagement from "@/pages/AlertManagement";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/admin" component={AdminConsole} />
      <Route path="/performance" component={PerformanceDashboard} />
      <Route path="/analytics" component={StressAnalytics} />
      <Route path="/monitoring" component={TeamMonitoring} />
      <Route path="/alerts" component={AlertManagement} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background text-foreground">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
