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
