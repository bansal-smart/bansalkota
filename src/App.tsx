import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import StudentLayout from "./components/StudentLayout";
import StudentDashboard from "./pages/StudentDashboard";
import TestListPage from "./pages/TestListPage";
import TestTakingPage from "./pages/TestTakingPage";
import TestResultPage from "./pages/TestResultPage";
import LiveClassRoomPage from "./pages/LiveClassRoomPage";
import QBankPage from "./pages/QBankPage";
import CompetePage from "./pages/CompetePage";
import DoubtPage from "./pages/DoubtPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoursesPage from "./pages/CoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import LecturePlayerPage from "./pages/LecturePlayerPage";
import ProfilePage from "./pages/ProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          {/* Immersive full-screen pages (no sidebar/bottom nav) */}
          <Route path="/tests/:id/take" element={<TestTakingPage />} />
          <Route path="/courses/:slug/learn" element={<LecturePlayerPage />} />
          {/* Student layout pages */}
          <Route element={<StudentLayout />}>
            <Route path="/dashboard" element={<StudentDashboard />} />
            <Route path="/tests" element={<TestListPage />} />
            <Route path="/tests/:id/result" element={<TestResultPage />} />
            <Route path="/live-classes/:id" element={<LiveClassRoomPage />} />
            <Route path="/qbank" element={<QBankPage />} />
            <Route path="/compete" element={<CompetePage />} />
            <Route path="/doubts" element={<DoubtPage />} />
            <Route path="/leaderboard" element={<LeaderboardPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/courses" element={<CoursesPage />} />
            <Route path="/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
