import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { toast } from "sonner";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Playground from "./pages/Playground";
import CodeIDE from "./pages/CodeIDE";
import Install from "./pages/Install";
import SharedConversation from "./pages/SharedConversation";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";

const queryClient = new QueryClient();

const GlobalErrorHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handler = (event: PromiseRejectionEvent) => {
      console.error("Unhandled rejection:", event.reason);
      toast.error("An unexpected error occurred. Please try again.");
      event.preventDefault();
    };

    const errorHandler = (event: ErrorEvent) => {
      console.error("Uncaught error:", event.error);
      event.preventDefault();
    };

    window.addEventListener("unhandledrejection", handler);
    window.addEventListener("error", errorHandler);
    return () => {
      window.removeEventListener("unhandledrejection", handler);
      window.removeEventListener("error", errorHandler);
    };
  }, []);

  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <ThemeProvider attribute="class" defaultTheme="system" storageKey="theme" enableSystem>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <GlobalErrorHandler>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/auth" element={<Auth />} />
                <Route path="/install" element={<Install />} />
                <Route path="/shared/:token" element={<SharedConversation />} />
                <Route 
                  path="/" 
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/playground" 
                  element={
                    <ProtectedRoute>
                      <Playground />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/ide" 
                  element={
                    <ProtectedRoute>
                      <CodeIDE />
                    </ProtectedRoute>
                  } 
                />
                <Route 
                  path="/admin" 
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  } 
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </GlobalErrorHandler>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;