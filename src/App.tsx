import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

// Eager: layouts, guards, marketing entry — required on first paint.
import StudentLayout from "./components/StudentLayout";
import TeacherLayout from "./components/TeacherLayout";
import AdminLayout from "./components/AdminLayout";
import CenterLayout from "./components/CenterLayout";
import ProtectedAdminRoute from "./components/ProtectedAdminRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedCenterRoute from "./components/ProtectedCenterRoute";
import ScrollToTop from "./components/ScrollToTop";
import PublicLayout from "./components/PublicLayout";
import Spinner from "./components/Spinner";
import { AuthProvider } from "./context/AuthContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import NotFound from "./pages/NotFound";

// Lazy: every other page. Each becomes its own JS chunk.
const CareerPage = lazy(() => import("./pages/CareerPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const AuthCallbackPage = lazy(() => import("./pages/AuthCallbackPage"));
const ForceChangePasswordPage = lazy(() => import("./pages/ForceChangePasswordPage"));
const UnsubscribePage = lazy(() => import("./pages/UnsubscribePage"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TestListPage = lazy(() => import("./pages/TestListPage"));
const TestInstructionsPage = lazy(() => import("./pages/TestInstructionsPage"));
const TestTakingPage = lazy(() => import("./pages/TestTakingPage"));
const TestResultPage = lazy(() => import("./pages/TestResultPage"));
const TestResponseSheetPage = lazy(() => import("./pages/TestResponseSheetPage"));
const TestSubjectBreakdownPage = lazy(() => import("./pages/TestSubjectBreakdownPage"));
const LiveClassRoomPage = lazy(() => import("./pages/LiveClassRoomPage"));
const LiveClassesListPage = lazy(() => import("./pages/LiveClassesListPage"));
const DoubtPage = lazy(() => import("./pages/DoubtPage"));
const LeaderboardPage = lazy(() => import("./pages/LeaderboardPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const CoursesPage = lazy(() => import("./pages/CoursesPage"));
const MyCoursesPage = lazy(() => import("./pages/MyCoursesPage"));
const CourseStudyMaterialPage = lazy(() => import("./pages/CourseStudyMaterialPage"));
const ChapterQuizPage = lazy(() => import("./pages/ChapterQuizPage"));
const CourseDetailPage = lazy(() => import("./pages/CourseDetailPage"));
const LecturePlayerPage = lazy(() => import("./pages/LecturePlayerPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const EducatorsPage = lazy(() => import("./pages/EducatorsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherDoubtQueuePage = lazy(() => import("./pages/TeacherDoubtQueuePage"));
const TeacherLiveClassesPage = lazy(() => import("./pages/TeacherLiveClassesPage"));
const TeacherLiveClassRoomPage = lazy(() => import("./pages/TeacherLiveClassRoomPage"));
const TeacherSettingsPage = lazy(() => import("./pages/TeacherSettingsPage"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminUsersPage = lazy(() => import("./pages/AdminUsersPage"));
const AdminStudentsPage = lazy(() => import("./pages/AdminStudentsPage"));
const AdminStudentReportsPage = lazy(() => import("./pages/AdminStudentReportsPage"));
const AdminPaymentsPage = lazy(() => import("./pages/AdminPaymentsPage"));
const AdminNotificationsPage = lazy(() => import("./pages/AdminNotificationsPage"));
const AdminCoursesPage = lazy(() => import("./pages/AdminCoursesPage"));
const CreateCoursePage = lazy(() => import("./pages/CreateCoursePage"));
const CreateTestPage = lazy(() => import("./pages/CreateTestPage"));
const AdminLiveClassesPage = lazy(() => import("./pages/AdminLiveClassesPage"));
const AdminTestPlatformHub = lazy(() => import("./pages/AdminTestPlatformHub"));
const AdminTestSupportPage = lazy(() => import("./pages/AdminTestSupportPage"));
const AdminTestDetailPage = lazy(() => import("./pages/AdminTestDetailPage"));
const AdminTestResultPage = lazy(() => import("./pages/AdminTestResultPage"));
const AdminCombinedResultPage = lazy(() => import("./pages/AdminCombinedResultPage"));
const AdminLectureBucketPage = lazy(() => import("./pages/AdminLectureBucketPage"));
const AdminExamsPage = lazy(() => import("./pages/AdminExamsPage"));
const AdminAdminsPage = lazy(() => import("./pages/AdminAdminsPage"));
const AdminModerationPage = lazy(() => import("./pages/AdminModerationPage"));
const AdminSettingsPage = lazy(() => import("./pages/AdminSettingsPage"));

const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const StaffDashboardPage = lazy(() => import("./pages/StaffDashboardPage"));
const AdminEnquiriesPage = lazy(() => import("./pages/AdminEnquiriesPage"));
const AdminCourseEnquiriesPage = lazy(() => import("./pages/AdminCourseEnquiriesPage"));
const AdminCourseContentPage = lazy(() => import("./pages/AdminCourseContentPage"));
const AdminReportsPage = lazy(() => import("./pages/AdminReportsPage"));
const AdminProfilePage = lazy(() => import("./pages/AdminProfilePage"));
const TestsLandingPage = lazy(() => import("./pages/TestsLandingPage"));
const LiveClassesLandingPage = lazy(() => import("./pages/LiveClassesLandingPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const AdmissionsPage = lazy(() => import("./pages/AdmissionsPage"));
const AssociationPage = lazy(() => import("./pages/AssociationPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const AccessDeniedPage = lazy(() => import("./pages/AccessDeniedPage"));
const AdminSchoolsPage = lazy(() => import("./pages/AdminSchoolsPage"));
const BansalPlaceholderPage = lazy(() => import("./pages/BansalPlaceholderPage"));
const CbtLoginPage = lazy(() => import("./pages/CbtLoginPage"));
const CbtLiveTestsPage = lazy(() => import("./pages/CbtLiveTestsPage"));
const CbtSubmittedPage = lazy(() => import("./pages/CbtSubmittedPage"));
const AdminBatchesPage = lazy(() => import("./pages/AdminBatchesPage"));
const BoostPage = lazy(() => import("./pages/BoostPage"));
const CentersPage = lazy(() => import("./pages/CentersPage"));
const CenterDetailPage = lazy(() => import("./pages/CenterDetailPage"));
const CentreGalleryPublicPage = lazy(() => import("./pages/CentreGalleryPublicPage"));
const CentreUpdatesPublicPage = lazy(() => import("./pages/CentreUpdatesPublicPage"));
const CentreUpdateDetailPage = lazy(() => import("./pages/CentreUpdateDetailPage"));
const AchievementsPage = lazy(() => import("./pages/AchievementsPage"));
const AlumniPage = lazy(() => import("./pages/AlumniPage"));
const LeadershipDetailPage = lazy(() => import("./pages/LeadershipDetailPage"));
const RefundPolicyPage = lazy(() => import("./pages/RefundPolicyPage"));
const DisclaimerPage = lazy(() => import("./pages/DisclaimerPage"));
const EStorePage = lazy(() => import("./pages/EStorePage"));
const BookDetailPage = lazy(() => import("./pages/BookDetailPage"));
const PackDetailPage = lazy(() => import("./pages/PackDetailPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PaymentReturnPage = lazy(() => import("./pages/PaymentReturnPage"));
const BoostPaymentReturnPage = lazy(() => import("./pages/BoostPaymentReturnPage"));

const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const TestSeriesCatalogPage = lazy(() => import("./pages/TestSeriesCatalogPage"));
const TestSeriesDetailPage = lazy(() => import("./pages/TestSeriesDetailPage"));
const AdminBooksPage = lazy(() => import("./pages/AdminBooksPage"));
const AdminCentersPage = lazy(() => import("./pages/AdminCentersPage"));
const AdminToppersPage = lazy(() => import("./pages/AdminToppersPage"));
const AdminAlumniSubmissionsPage = lazy(() => import("./pages/AdminAlumniSubmissionsPage"));
const AdminBannersPage = lazy(() => import("./pages/AdminBannersPage"));
const AdminBoostPage = lazy(() => import("./pages/AdminBoostPage"));
const AdminOrdersPage = lazy(() => import("./pages/AdminOrdersPage"));
const AdminTestimonialsPage = lazy(() => import("./pages/AdminTestimonialsPage"));
const AdminStatsPage = lazy(() => import("./pages/AdminStatsPage"));
const AdminLeadershipPage = lazy(() => import("./pages/AdminLeadershipPage"));
const AdminCenterSupportPage = lazy(() => import("./pages/AdminCenterSupportPage"));
const CenterDashboardPage = lazy(() => import("./pages/CenterDashboardPage"));
const CenterOnlineCoursesPage = lazy(() => import("./pages/CenterOnlineCoursesPage"));
const CenterOnlineCourseContentPage = lazy(() => import("./pages/CenterOnlineCourseContentPage"));
const CenterBannersPage = lazy(() => import("./pages/CenterBannersPage"));
const CenterContentPage = lazy(() => import("./pages/CenterContentPage"));
const CenterGalleryPage = lazy(() => import("./pages/CenterGalleryPage"));
const CenterUpdatesPage = lazy(() => import("./pages/CenterUpdatesPage"));
const CenterCoursesPage = lazy(() => import("./pages/CenterCoursesPage"));
const CenterLiveClassesPage = lazy(() => import("./pages/CenterLiveClassesPage"));
const CenterTestsPage = lazy(() => import("./pages/CenterTestsPage"));
const CenterTestResultsPage = lazy(() => import("./pages/CenterTestResultsPage"));
const CenterWebsiteEnquiriesPage = lazy(() => import("./pages/CenterWebsiteEnquiriesPage"));
const CenterCourseEnquiriesPage = lazy(() => import("./pages/CenterCourseEnquiriesPage"));
const CenterStudentsPage = lazy(() => import("./pages/CenterStudentsPage"));
const CenterSupportPage = lazy(() => import("./pages/CenterSupportPage"));
const LandingNewPage = lazy(() => import("./pages/LandingNewPage"));
const AdminLandingPage = lazy(() => import("./pages/AdminLandingPage"));
const AdminLandingLeadsPage = lazy(() => import("./pages/AdminLandingLeadsPage"));
const AdminSmsBroadcastsPage = lazy(() => import("./pages/AdminSmsBroadcastsPage"));

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

const RouteFallback = () => (
  <div className="flex h-[60vh] items-center justify-center">
    <Spinner />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <Suspense fallback={<RouteFallback />}>
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
            <Route path="/new" element={<LandingNewPage />} />


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
              <Route path="/centres" element={<CentersPage />} />
              <Route path="/centres/:slug" element={<CenterDetailPage />} />
              <Route path="/centres/:slug/gallery" element={<CentreGalleryPublicPage />} />
              <Route path="/centres/:slug/updates" element={<CentreUpdatesPublicPage />} />
              <Route path="/centres/:slug/updates/:id" element={<CentreUpdateDetailPage />} />
              <Route path="/achievements" element={<AchievementsPage />} />
              <Route path="/alumni" element={<AlumniPage />} />
              <Route path="/e-store" element={<EStorePage />} />
              <Route path="/e-store/checkout" element={<CheckoutPage />} />
              <Route path="/e-store/pack/:slug" element={<PackDetailPage />} />
              <Route path="/payments/return" element={<PaymentReturnPage />} />
              <Route path="/boost/payment-return" element={<BoostPaymentReturnPage />} />

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
                <Route path="/tests/:slug/result/:attemptId/responses" element={<TestResponseSheetPage />} />
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
              
              <Route path="/admin/enquiries" element={<AdminEnquiriesPage />} />
              <Route path="/admin/course-enquiries" element={<AdminCourseEnquiriesPage />} />
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
              <Route path="/admin/test-support" element={<AdminTestSupportPage />} />
              <Route path="/admin/tests" element={<Navigate to="/admin/tests-hub?tab=all" replace />} />
              <Route path="/admin/test-attempts" element={<Navigate to="/admin/tests-hub?tab=attempts" replace />} />
              <Route path="/admin/test-imports" element={<Navigate to="/admin/tests-hub?tab=imports" replace />} />
              <Route path="/admin/test-series" element={<Navigate to="/admin/tests-hub?tab=series" replace />} />
              <Route path="/admin/question-bank" element={<Navigate to="/admin/tests-hub?tab=bank" replace />} />
              {/* Editor flows keep their own routes */}
              <Route path="/admin/tests/new" element={<CreateTestPage />} />
              <Route path="/admin/tests/:slug/edit" element={<CreateTestPage />} />
              <Route path="/admin/tests/:slug/result" element={<AdminTestResultPage />} />
              <Route path="/admin/tests/:slug/combined" element={<AdminCombinedResultPage />} />
              <Route path="/admin/tests/:slug" element={<AdminTestDetailPage />} />
              <Route path="/admin/books" element={<AdminBooksPage />} />
              <Route path="/admin/orders" element={<AdminOrdersPage />} />
              <Route path="/admin/boost" element={<AdminBoostPage />} />
              <Route path="/admin/centres" element={<AdminCentersPage />} />
              <Route path="/admin/centers" element={<Navigate to="/admin/centres" replace />} />
              <Route path="/admin/centre-support" element={<AdminCenterSupportPage />} />
              <Route path="/admin/center-support" element={<Navigate to="/admin/centre-support" replace />} />
              <Route path="/admin/toppers" element={<AdminToppersPage />} />
              <Route path="/admin/alumni-submissions" element={<AdminAlumniSubmissionsPage />} />
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
              <Route path="/admin/landing-page" element={<AdminLandingPage />} />
              <Route path="/admin/landing-leads" element={<AdminLandingLeadsPage />} />
              <Route path="/admin/sms-broadcasts" element={<AdminSmsBroadcastsPage />} />
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
              <Route path="/center/gallery" element={<CenterGalleryPage />} />
              <Route path="/center/updates" element={<CenterUpdatesPage />} />
              <Route path="/center/online-courses" element={<CenterOnlineCoursesPage />} />
              <Route path="/center/online-courses/:courseId" element={<CenterOnlineCourseContentPage />} />
              <Route path="/center/live-classes" element={<CenterLiveClassesPage />} />
              <Route path="/center/tests" element={<CenterTestsPage />} />
              <Route path="/center/tests/:testId/results" element={<CenterTestResultsPage />} />
            </Route>


            <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
