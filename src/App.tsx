import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Original pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

// LMS pages
import LMSAuthPage from "./pages/lms/LMSAuthPage";
import { LMSLayout } from "./components/lms/LMSLayout";
import LMSDashboard from "./pages/lms/LMSDashboard";
import UserManagement from "./pages/lms/admin/UserManagement";
import CategoryManagement from "./pages/lms/admin/CategoryManagement";
import SiteSettings from "./pages/lms/admin/SiteSettings";
import AnalyticsDashboard from "./pages/lms/admin/AnalyticsDashboard";
import StudentManagement from "./pages/lms/admin/StudentManagement";
import AdministrationSettings from "./pages/lms/admin/AdministrationSettings";
import ClassManagement from "./pages/lms/admin/ClassManagement";
import CreateCourse from "./pages/lms/courses/CreateCourse";
import CourseEditor from "./pages/lms/courses/CourseEditor";
import CourseCatalog from "./pages/lms/courses/CourseCatalog";
import CourseView from "./pages/lms/courses/CourseView";
import MyCourses from "./pages/lms/courses/MyCourses";
import InstructorCourses from "./pages/lms/instructor/InstructorCourses";

// Finance pages
import FinanceDashboard from "./pages/lms/finance/FinanceDashboard";
import StudentFeesStatus from "./pages/lms/finance/StudentFeesStatus";
import Receivables from "./pages/lms/finance/Receivables";
import Payables from "./pages/lms/finance/Payables";
import Budget from "./pages/lms/finance/Budget";
import CashBankManagement from "./pages/lms/finance/CashBankManagement";
import Cancellations from "./pages/lms/finance/Cancellations";
import JournalEntries from "./pages/lms/finance/JournalEntries";
import ChartOfAccounts from "./pages/lms/finance/utilities/ChartOfAccounts";
import GeneralLedger from "./pages/lms/finance/reports/GeneralLedger";
import TrialBalance from "./pages/lms/finance/reports/TrialBalance";
import FinancialPerformance from "./pages/lms/finance/reports/FinancialPerformance";
import FinancialPosition from "./pages/lms/finance/reports/FinancialPosition";
import CashBook from "./pages/lms/finance/reports/CashBook";
import StudentSchedules from "./pages/lms/finance/reports/StudentSchedules";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Original routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/checkout/:packageId" element={<CheckoutPage />} />

            {/* LMS Routes */}
            <Route path="/lms/auth" element={<LMSAuthPage />} />
            <Route path="/lms" element={<LMSLayout />}>
              <Route path="dashboard" element={<LMSDashboard />} />
              <Route path="courses" element={<MyCourses />} />
              <Route path="courses/create" element={<CreateCourse />} />
              <Route path="courses/:id" element={<CourseView />} />
              <Route path="courses/:id/edit" element={<CourseEditor />} />
              <Route path="catalog" element={<CourseCatalog />} />
              <Route path="instructor/courses" element={<InstructorCourses />} />
              <Route path="students" element={<StudentManagement />} />
              <Route path="students/classes" element={<ClassManagement />} />
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/categories" element={<CategoryManagement />} />
              <Route path="admin/analytics" element={<AnalyticsDashboard />} />
              <Route path="admin/administration" element={<AdministrationSettings />} />
              <Route path="admin/settings" element={<SiteSettings />} />
              
              {/* Finance Routes */}
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="finance/fees-status" element={<StudentFeesStatus />} />
              <Route path="finance/receivables" element={<Receivables />} />
              <Route path="finance/payables" element={<Payables />} />
              <Route path="finance/budget" element={<Budget />} />
              <Route path="finance/cash-bank" element={<CashBankManagement />} />
              <Route path="finance/cancellations" element={<Cancellations />} />
              <Route path="finance/journal-entries" element={<JournalEntries />} />
              <Route path="finance/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="finance/reports/general-ledger" element={<GeneralLedger />} />
              <Route path="finance/reports/trial-balance" element={<TrialBalance />} />
              <Route path="finance/reports/financial-performance" element={<FinancialPerformance />} />
              <Route path="finance/reports/financial-position" element={<FinancialPosition />} />
              <Route path="finance/reports/cash-book" element={<CashBook />} />
              <Route path="finance/reports/student-schedules" element={<StudentSchedules />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
