import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Landing from "@/pages/landing";
import StudentDashboard from "@/pages/student-dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400">
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-pink-400 to-pink-600 rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">🐷</span>
          </div>
          <p className="text-gray-600 text-lg text-center">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          {user?.role === "student" ? (
            <Route path="/" component={StudentDashboard} />
          ) : user?.role === "teacher" ? (
            <Route path="/" component={TeacherDashboard} />
          ) : (
            <Route path="/" component={Landing} />
          )}
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
