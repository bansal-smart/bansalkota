import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "./pages/LandingPage";
import CareerPage from "./pages/CareerPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ForceChangePasswordPage from "./pages/ForceChangePasswordPage";
import StudentLayout from "./components/StudentLayout";
import TeacherLayout from "./components/TeacherLayout";
import AdminLayout from "./components/AdminLayout";
import StudentDashboard from "./pages/StudentDashboard";
import TestListPage from "./pages/TestListPage";
import TestTakingPage from "./pages/TestTakingPage";
import TestResultPage from "./pages/TestResultPage";
import LiveClassRoomPage from "./pages/LiveClassRoomPage";
import LiveClassesListPage from "./pages/LiveClassesListPage";
import TeacherQuestionBankPage from "./pages/TeacherQuestionBankPage";
import CompetePage from "./pages/CompetePage";
import DoubtPage from "./pages/DoubtPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoursesPage from "./pages/CoursesPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import LecturePlayerPage from "./pages/LecturePlayerPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import EducatorsPage from "./pages/EducatorsPage";
import SettingsPage from "./pages/SettingsPage";
import StorePage from "./pages/StorePage";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateTestPage from "./pages/CreateTestPage";
import TeacherDoubtQueuePage from "./pages/TeacherDoubtQueuePage";
import CreateCoursePage from "./pages/CreateCoursePage";
import TeacherCoursesPage from "./pages/TeacherCoursesPage";
import TeacherLiveClassesPage from "./pages/TeacherLiveClassesPage";
import TeacherStudentsPage from "./pages/TeacherStudentsPage";
import TeacherAnalyticsPage from "./pages/TeacherAnalyticsPage";
import TeacherSettingsPage from "./pages/TeacherSettingsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import AdminNotificationsPage from "./pages/AdminNotificationsPage";
import AdminCoursesPage from "./pages/AdminCoursesPage";
import AdminLiveClassesPage from "./pages/AdminLiveClassesPage";
import AdminTestsPage from "./pages/AdminTestsPage";
import AdminModerationPage from "./pages/AdminModerationPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminEducatorApplicationsPage from "./pages/AdminEducatorApplicationsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";
import AdminEnquiriesPage from "./pages/AdminEnquiriesPage";
import AdminCourseContentPage from "./pages/AdminCourseContentPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicLayout from "./components/PublicLayout";
import TestsLandingPage from "./pages/TestsLandingPage";
import LiveClassesLandingPage from "./pages/LiveClassesLandingPage";
import PricingPage from "./pages/PricingPage";
import MentorshipPage from "./pages/MentorshipPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AssociationPage from "./pages/AssociationPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import { AuthProvider } from "./context/AuthContext";
import NotFound from "./pages/NotFound";

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
            <Route path="/career" element={<CareerPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/change-password" element={<ForceChangePasswordPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Immersive full-screen pages (no sidebar/bottom nav) — students only */}
            <Route element={<ProtectedRoute allow={["student"]} />}>
              <Route path="/tests/:id/take" element={<TestTakingPage />} />
              <Route path="/courses/:slug/learn" element={<LecturePlayerPage />} />
            </Route>

            {/* Public marketing pages (PublicLayout: own navbar + footer) */}
            <Route element={<PublicLayout />}>
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/tests" element={<TestsLandingPage />} />
              <Route path="/live-classes" element={<LiveClassesLandingPage />} />
              <Route path="/educators" element={<EducatorsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/mentorship" element={<MentorshipPage />} />
              <Route path="/admissions" element={<AdmissionsPage />} />
              <Route path="/association" element={<AssociationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
            </Route>

            {/* Student layout — store kept inside student chrome */}
            <Route element={<StudentLayout />}>
              <Route path="/store" element={<StorePage />} />
            </Route>

            {/* Student layout — students only */}
            <Route element={<ProtectedRoute allow={["student"]} />}>
              <Route element={<StudentLayout />}>
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/my-tests" element={<TestListPage />} />
                <Route path="/tests/:id/result" element={<TestResultPage />} />
                <Route path="/my-live-classes" element={<LiveClassesListPage />} />
                <Route path="/live-classes/:id" element={<LiveClassRoomPage />} />
                
                <Route path="/compete" element={<CompetePage />} />
                <Route path="/doubts" element={<DoubtPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/my-courses" element={<MyCoursesPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* Teacher layout — teachers only */}
            <Route element={<ProtectedRoute allow={["teacher"]} />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/courses" element={<TeacherCoursesPage />} />
                <Route path="/teacher/live-classes" element={<TeacherLiveClassesPage />} />
                <Route path="/teacher/tests/create" element={<CreateTestPage />} />
                <Route path="/teacher/question-bank" element={<TeacherQuestionBankPage />} />
                <Route path="/teacher/doubts" element={<TeacherDoubtQueuePage />} />
                <Route path="/teacher/students" element={<TeacherStudentsPage />} />
                <Route path="/teacher/analytics" element={<TeacherAnalyticsPage />} />
                <Route path="/teacher/settings" element={<TeacherSettingsPage />} />
                <Route path="/teacher/courses/create" element={<CreateCoursePage />} />
              </Route>
            </Route>

            {/* Staff auth */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected staff/admin pages */}
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
              <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
              <Route path="/admin/course-content" element={<AdminCourseContentPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/courses" element={<AdminCoursesPage />} />
              <Route path="/admin/live-classes" element={<AdminLiveClassesPage />} />
              <Route path="/admin/tests" element={<AdminTestsPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/moderation" element={<AdminModerationPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/overview" element={<AdminDashboard />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
