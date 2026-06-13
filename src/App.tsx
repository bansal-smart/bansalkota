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
import UnsubscribePage from "./pages/UnsubscribePage";
import StudentLayout from "./components/StudentLayout";
import TeacherLayout from "./components/TeacherLayout";
import AdminLayout from "./components/AdminLayout";
import StudentDashboard from "./pages/StudentDashboard";
import TestListPage from "./pages/TestListPage";
import TestInstructionsPage from "./pages/TestInstructionsPage";
import TestTakingPage from "./pages/TestTakingPage";
import TestResultPage from "./pages/TestResultPage";
import TestSubjectBreakdownPage from "./pages/TestSubjectBreakdownPage";
import LiveClassRoomPage from "./pages/LiveClassRoomPage";
import LiveClassesListPage from "./pages/LiveClassesListPage";

import DoubtPage from "./pages/DoubtPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CoursesPage from "./pages/CoursesPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import CourseStudyMaterialPage from "./pages/CourseStudyMaterialPage";
import ChapterQuizPage from "./pages/ChapterQuizPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import LecturePlayerPage from "./pages/LecturePlayerPage";
import ProfilePage from "./pages/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import EducatorsPage from "./pages/EducatorsPage";
import SettingsPage from "./pages/SettingsPage";
import StorePage from "./pages/StorePage";
import TeacherDashboard from "./pages/TeacherDashboard";
import TeacherDoubtQueuePage from "./pages/TeacherDoubtQueuePage";
import TeacherLiveClassesPage from "./pages/TeacherLiveClassesPage";
import TeacherLiveClassRoomPage from "./pages/TeacherLiveClassRoomPage";
import TeacherSettingsPage from "./pages/TeacherSettingsPage";
import AdminDashboard from "./pages/AdminDashboard";
import AdminUsersPage from "./pages/AdminUsersPage";
import AdminStudentsPage from "./pages/AdminStudentsPage";
import AdminStudentReportsPage from "./pages/AdminStudentReportsPage";
import AdminPaymentsPage from "./pages/AdminPaymentsPage";
import AdminNotificationsPage from "./pages/AdminNotificationsPage";
import AdminCoursesPage from "./pages/AdminCoursesPage";
import CreateCoursePage from "./pages/CreateCoursePage";
import CreateTestPage from "./pages/CreateTestPage";
import AdminLiveClassesPage from "./pages/AdminLiveClassesPage";
import AdminTestPlatformHub from "./pages/AdminTestPlatformHub";
import AdminTestDetailPage from "./pages/AdminTestDetailPage";
import AdminLectureBucketPage from "./pages/AdminLectureBucketPage";
import AdminExamsPage from "./pages/AdminExamsPage";
import AdminAdminsPage from "./pages/AdminAdminsPage";
import AdminModerationPage from "./pages/AdminModerationPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import AdminEducatorApplicationsPage from "./pages/AdminEducatorApplicationsPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import StaffDashboardPage from "./pages/StaffDashboardPage";
import AdminEnquiriesPage from "./pages/AdminEnquiriesPage";
import AdminCourseContentPage from "./pages/AdminCourseContentPage";
import AdminReportsPage from "./pages/AdminReportsPage";
import AdminProfilePage from "./pages/AdminProfilePage";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import PublicLayout from "./components/PublicLayout";
import TestsLandingPage from "./pages/TestsLandingPage";
import LiveClassesLandingPage from "./pages/LiveClassesLandingPage";
import PricingPage from "./pages/PricingPage";
import AdmissionsPage from "./pages/AdmissionsPage";
import AssociationPage from "./pages/AssociationPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPolicyPage from "./pages/PrivacyPolicyPage";
import TermsOfServicePage from "./pages/TermsOfServicePage";
import AccessDeniedPage from "./pages/AccessDeniedPage";
import AdminSchoolsPage from "./pages/AdminSchoolsPage";
import { AuthProvider } from "./context/AuthContext";
import NotFound from "./pages/NotFound";
import BansalPlaceholderPage from "./pages/BansalPlaceholderPage";
import CbtLoginPage from "./pages/CbtLoginPage";
import CbtLiveTestsPage from "./pages/CbtLiveTestsPage";
import CbtSubmittedPage from "./pages/CbtSubmittedPage";
import AdminBatchesPage from "./pages/AdminBatchesPage";
import BoostPage from "./pages/BoostPage";
import CentersPage from "./pages/CentersPage";
import CenterDetailPage from "./pages/CenterDetailPage";
import AchievementsPage from "./pages/AchievementsPage";
import AlumniPage from "./pages/AlumniPage";
import LeadershipDetailPage from "./pages/LeadershipDetailPage";
import RefundPolicyPage from "./pages/RefundPolicyPage";
import DisclaimerPage from "./pages/DisclaimerPage";
import EStorePage from "./pages/EStorePage";
import BookDetailPage from "./pages/BookDetailPage";
import PackDetailPage from "./pages/PackDetailPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrdersPage from "./pages/OrdersPage";
import TestSeriesCatalogPage from "./pages/TestSeriesCatalogPage";
import TestSeriesDetailPage from "./pages/TestSeriesDetailPage";
import AdminBooksPage from "./pages/AdminBooksPage";
// AdminTestSeriesPage is now embedded inside AdminTestPlatformHub
import AdminCentersPage from "./pages/AdminCentersPage";
import AdminToppersPage from "./pages/AdminToppersPage";
import AdminBannersPage from "./pages/AdminBannersPage";
import AdminBoostPage from "./pages/AdminBoostPage";
import AdminOrdersPage from "./pages/AdminOrdersPage";
import AdminTestimonialsPage from "./pages/AdminTestimonialsPage";
import AdminStatsPage from "./pages/AdminStatsPage";
import AdminLeadershipPage from "./pages/AdminLeadershipPage";
import AdminCenterSupportPage from "./pages/AdminCenterSupportPage";
import CenterLayout from "./components/CenterLayout";
import ProtectedCenterRoute from "./components/ProtectedCenterRoute";
import CenterDashboardPage from "./pages/CenterDashboardPage";
import CenterBannersPage from "./pages/CenterBannersPage";
import CenterContentPage from "./pages/CenterContentPage";
import CenterCoursesPage from "./pages/CenterCoursesPage";
import CenterWebsiteEnquiriesPage from "./pages/CenterWebsiteEnquiriesPage";
import CenterCourseEnquiriesPage from "./pages/CenterCourseEnquiriesPage";
import CenterStudentsPage from "./pages/CenterStudentsPage";
import CenterSupportPage from "./pages/CenterSupportPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/auth/change-password" element={<ForceChangePasswordPage />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />
            <Route path="/unsubscribe" element={<UnsubscribePage />} />
            <Route path="/cbt" element={<CbtLoginPage />} />
            <Route path="/cbt/tests" element={<CbtLiveTestsPage />} />
            <Route path="/cbt/submitted" element={<CbtSubmittedPage />} />


            {/* Immersive full-screen pages (no sidebar/bottom nav) — students only */}
            <Route element={<ProtectedRoute allow={["student"]} />}>
              <Route path="/tests/:slug/take" element={<TestTakingPage />} />
              <Route path="/courses/:slug/learn" element={<LecturePlayerPage />} />
            </Route>

            {/* Public marketing pages (PublicLayout: own navbar + footer) */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/courses/:slug" element={<CourseDetailPage />} />
              <Route path="/tests" element={<TestsLandingPage />} />
              <Route path="/test-series" element={<TestSeriesCatalogPage />} />
              <Route path="/test-series/:slug" element={<TestSeriesDetailPage />} />
              <Route path="/live-classes" element={<LiveClassesLandingPage />} />
              <Route path="/educators" element={<EducatorsPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/admissions" element={<AdmissionsPage />} />
              <Route path="/association" element={<AssociationPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/about/:slug" element={<LeadershipDetailPage />} />
              <Route path="/career" element={<CareerPage />} />
              <Route path="/careers" element={<Navigate to="/career" replace />} />
              {/* Secret super-admin entry — do not link publicly */}
              <Route path="/bansal-control-room-9F2K" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/terms" element={<TermsOfServicePage />} />
              <Route path="/boost" element={<BoostPage />} />
              <Route path="/centers" element={<CentersPage />} />
              <Route path="/centers/:slug" element={<CenterDetailPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/alumni" element={<AlumniPage />} />
              <Route path="/e-store" element={<EStorePage />} />
              <Route path="/e-store/checkout" element={<CheckoutPage />} />
              <Route path="/e-store/pack/:slug" element={<PackDetailPage />} />
              <Route path="/e-store/:slug" element={<BookDetailPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/refund-policy" element={<RefundPolicyPage />} />
              <Route path="/disclaimer" element={<DisclaimerPage />} />
              <Route
                path="/blog"
                element={
                  <BansalPlaceholderPage
                    title="Bansal Blog"
                    description="Insights, exam tips, and student stories — coming soon."
                  />
                }
              />
              {/* Removed pages → redirects */}
              <Route path="/mentorship" element={<Navigate to="/" replace />} />
            </Route>

            {/* Legacy /store redirect */}
            <Route path="/store" element={<Navigate to="/explore-courses" replace />} />

            {/* Student layout — students only */}
            <Route element={<ProtectedRoute allow={["student"]} />}>
              <Route element={<StudentLayout />}>
                <Route path="/dashboard" element={<StudentDashboard />} />
                <Route path="/my-tests" element={<TestListPage />} />
                <Route path="/tests/:slug/instructions" element={<TestInstructionsPage />} />
                <Route path="/tests/:slug/result/:attemptId" element={<TestResultPage />} />
                <Route path="/tests/:slug/result/:attemptId/subject/:subject" element={<TestSubjectBreakdownPage />} />
                <Route path="/my-live-classes" element={<LiveClassesListPage />} />
                <Route path="/live-classes/:slug" element={<LiveClassRoomPage />} />

                <Route path="/doubts" element={<DoubtPage />} />
                <Route path="/leaderboard" element={<LeaderboardPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/my-courses" element={<MyCoursesPage />} />
                <Route path="/my-courses/:slug" element={<CourseStudyMaterialPage />} />
                <Route path="/my-courses/:slug/chapters/:chapterId/quiz/:quizId" element={<ChapterQuizPage />} />
                <Route path="/explore-courses" element={<StorePage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                {/* Removed mentor/compete redirects */}
                <Route path="/compete" element={<Navigate to="/dashboard" replace />} />
                <Route path="/mentor-chat" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Route>

            {/* Teacher layout — teachers only. */}
            <Route element={<ProtectedRoute allow={["teacher"]} />}>
              <Route element={<TeacherLayout />}>
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/live-classes" element={<TeacherLiveClassesPage />} />
                <Route path="/teacher/live-classes/:slug" element={<TeacherLiveClassRoomPage />} />
                <Route path="/teacher/doubts" element={<TeacherDoubtQueuePage />} />
                <Route path="/teacher/settings" element={<TeacherSettingsPage />} />
                <Route path="/teacher/courses" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/courses/create" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/tests/create" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/question-bank" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/students" element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="/teacher/analytics" element={<Navigate to="/teacher/dashboard" replace />} />
              </Route>
            </Route>

            {/* Mentor routes removed → redirect to home */}
            <Route path="/mentor/*" element={<Navigate to="/" replace />} />

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
              <Route path="/admin/students" element={<AdminStudentsPage />} />
              <Route path="/admin/student-reports" element={<AdminStudentReportsPage />} />
              <Route path="/admin/schools" element={<AdminSchoolsPage />} />
              <Route path="/admin/courses" element={<AdminCoursesPage />} />
              <Route path="/admin/batches" element={<AdminBatchesPage />} />
              <Route path="/admin/courses/new" element={<CreateCoursePage />} />
              <Route path="/admin/courses/:courseId/edit" element={<CreateCoursePage />} />
              <Route path="/admin/courses/:courseId/content" element={<AdminCourseContentPage />} />
              <Route path="/admin/live-classes" element={<AdminLiveClassesPage />} />
              {/* Unified Test Platform hub (tabs: overview, all, upcoming, series, bank, attempts, imports) */}
              <Route path="/admin/tests-hub" element={<AdminTestPlatformHub />} />
              <Route path="/admin/tests" element={<Navigate to="/admin/tests-hub?tab=all" replace />} />
              <Route path="/admin/test-attempts" element={<Navigate to="/admin/tests-hub?tab=attempts" replace />} />
              <Route path="/admin/test-imports" element={<Navigate to="/admin/tests-hub?tab=imports" replace />} />
              <Route path="/admin/test-series" element={<Navigate to="/admin/tests-hub?tab=series" replace />} />
              <Route path="/admin/question-bank" element={<Navigate to="/admin/tests-hub?tab=bank" replace />} />
              {/* Editor flows keep their own routes */}
              <Route path="/admin/tests/new" element={<CreateTestPage />} />
              <Route path="/admin/tests/:slug/edit" element={<CreateTestPage />} />
              <Route path="/admin/tests/:slug" element={<AdminTestDetailPage />} />
              <Route path="/admin/books" element={<AdminBooksPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/boost" element={<AdminBoostPage />} />
              <Route path="/admin/centers" element={<AdminCentersPage />} />
              <Route path="/admin/center-support" element={<AdminCenterSupportPage />} />
              <Route path="/admin/toppers" element={<AdminToppersPage />} />
              <Route path="/admin/banners" element={<AdminBannersPage />} />
              <Route path="/admin/testimonials" element={<AdminTestimonialsPage />} />
              <Route path="/admin/stats" element={<AdminStatsPage />} />
              <Route path="/admin/leadership" element={<AdminLeadershipPage />} />
              <Route path="/admin/lecture-bucket" element={<AdminLectureBucketPage />} />
              {/* Removed: compete-questions, mentor-assignments, mentor-handovers */}
              <Route path="/admin/compete-questions" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/mentor-assignments" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/mentor-handovers" element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="/admin/exams" element={<AdminExamsPage />} />
              <Route path="/admin/payments" element={<AdminPaymentsPage />} />
              <Route path="/admin/notifications" element={<AdminNotificationsPage />} />
              <Route path="/admin/moderation" element={<AdminModerationPage />} />
              <Route path="/admin/settings" element={<AdminSettingsPage />} />
              <Route path="/admin/admins" element={<AdminAdminsPage />} />
              <Route path="/admin/profile" element={<AdminProfilePage />} />
              <Route path="/admin/overview" element={<AdminDashboard />} />
            </Route>

            {/* Centre admin portal */}
            <Route
              element={
                <ProtectedCenterRoute>
                  <CenterLayout />
                </ProtectedCenterRoute>
              }
            >
              <Route path="/center" element={<CenterDashboardPage />} />
              <Route path="/center/content" element={<CenterContentPage />} />
              <Route path="/center/banners" element={<CenterBannersPage />} />
              <Route path="/center/courses" element={<CenterCoursesPage />} />
              <Route path="/center/enquiries" element={<CenterWebsiteEnquiriesPage />} />
              <Route path="/center/course-enquiries" element={<CenterCourseEnquiriesPage />} />
              <Route path="/center/students" element={<CenterStudentsPage />} />
              <Route path="/center/support" element={<CenterSupportPage />} />
            </Route>


            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
