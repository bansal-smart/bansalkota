import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import AdminLayout from "./components/AdminLayout";
import AdminEducatorApplicationsPage from "./pages/AdminEducatorApplicationsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import { AuthProvider } from "./context/AuthContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />

            {/* Staff auth */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected staff dashboard */}
            <Route
              element={
                <ProtectedAdminRoute>
                  <AdminLayout />
                </ProtectedAdminRoute>
              }
            >
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/dashboard" element={<StaffDashboardPage />} />
              <Route path="/admin/educator-applications" element={<AdminEducatorApplicationsPage />} />
            </Route>

            {/* Catch-all → landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
