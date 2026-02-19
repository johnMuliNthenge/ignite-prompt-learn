import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { InstitutionProvider } from "@/contexts/InstitutionContext";

// Original pages
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import CheckoutPage from "./pages/CheckoutPage";
import AdminPage from "./pages/AdminPage";
import NotFound from "./pages/NotFound";

// LMS pages
import LMSAuthPage from "./pages/lms/LMSAuthPage";
import ResetPasswordPage from "./pages/lms/ResetPasswordPage";
import { LMSLayout } from "./components/lms/LMSLayout";
import LMSDashboard from "./pages/lms/LMSDashboard";
import UserManagement from "./pages/lms/admin/UserManagement";
import CategoryManagement from "./pages/lms/admin/CategoryManagement";
import SiteSettings from "./pages/lms/admin/SiteSettings";
import SmtpSettings from "./pages/lms/admin/SmtpSettings";
import AnalyticsDashboard from "./pages/lms/admin/AnalyticsDashboard";
import StudentManagement from "./pages/lms/admin/StudentManagement";
import AdministrationSettings from "./pages/lms/admin/AdministrationSettings";
import ClassManagement from "./pages/lms/admin/ClassManagement";
import RoleManagement from "./pages/lms/admin/RoleManagement";
import UserRoleAssignment from "./pages/lms/admin/UserRoleAssignment";
import MpesaSettings from "./pages/lms/admin/MpesaSettings";
import AccountSetup from "./pages/lms/admin/AccountSetup";
import TenantManagement from "./pages/lms/admin/TenantManagement";
import CreateCourse from "./pages/lms/courses/CreateCourse";
import CourseEditor from "./pages/lms/courses/CourseEditor";
import CourseCatalog from "./pages/lms/courses/CourseCatalog";
import CourseView from "./pages/lms/courses/CourseView";
import MyCourses from "./pages/lms/courses/MyCourses";
import InstructorCourses from "./pages/lms/instructor/InstructorCourses";

// Student Academics pages
import ExamsManagement from "./pages/lms/academics/ExamsManagement";
import MarksEntry from "./pages/lms/academics/MarksEntry";
import ResultsView from "./pages/lms/academics/ResultsView";
import StudentAttendance from "./pages/lms/academics/StudentAttendance";
import SubjectsManagement from "./pages/lms/academics/SubjectsManagement";
import ProgrammesManagement from "./pages/lms/academics/ProgrammesManagement";
import CurriculumManagement from "./pages/lms/academics/CurriculumManagement";
import SubjectRegistration from "./pages/lms/academics/SubjectRegistration";
import SubjectRegistrationList from "./pages/lms/academics/SubjectRegistrationList";
import MarksComputation from "./pages/lms/academics/MarksComputation";

// Finance pages
import FinanceDashboard from "./pages/lms/finance/FinanceDashboard";
import StudentFeesStatus from "./pages/lms/finance/StudentFeesStatus";
import SummarizedFeeStatement from "./pages/lms/finance/SummarizedFeeStatement";
import StudentFinance from "./pages/lms/finance/StudentFinance";
import StudentInvoice from "./pages/lms/finance/StudentInvoice";
import Receivables from "./pages/lms/finance/Receivables";
import Payables from "./pages/lms/finance/Payables";
import ReceivePayments from "./pages/lms/finance/receivables/ReceivePayments";
import Transactions from "./pages/lms/finance/receivables/Transactions";
import PaymentVouchers from "./pages/lms/finance/payables/PaymentVouchers";
import SupplierInvoices from "./pages/lms/finance/payables/SupplierInvoices";
import ExpenseClaims from "./pages/lms/finance/payables/ExpenseClaims";
import ImprestManagement from "./pages/lms/finance/payables/ImprestManagement";
import PettyCash from "./pages/lms/finance/payables/PettyCash";
import Budget from "./pages/lms/finance/Budget";
import CashBankManagement from "./pages/lms/finance/CashBankManagement";
import Cancellations from "./pages/lms/finance/Cancellations";
import JournalEntries from "./pages/lms/finance/JournalEntries";
// Finance Utilities
import ChartOfAccounts from "./pages/lms/finance/utilities/ChartOfAccounts";
import FeeAccounts from "./pages/lms/finance/utilities/FeeAccounts";
import Groups from "./pages/lms/finance/utilities/Groups";
import SubGroups from "./pages/lms/finance/utilities/SubGroups";
import FiscalYears from "./pages/lms/finance/utilities/FiscalYears";
import Currencies from "./pages/lms/finance/utilities/Currencies";
import ExchangeRates from "./pages/lms/finance/utilities/ExchangeRates";
import PaymentModes from "./pages/lms/finance/utilities/PaymentModes";
import TaxTypes from "./pages/lms/finance/utilities/TaxTypes";
import FeePolicies from "./pages/lms/finance/utilities/FeePolicies";
import VendorTypes from "./pages/lms/finance/utilities/VendorTypes";
import Ledger from "./pages/lms/finance/utilities/Ledger";
import ImprestLimits from "./pages/lms/finance/utilities/ImprestLimits";
// Finance Reports
import GeneralLedger from "./pages/lms/finance/reports/GeneralLedger";
import TrialBalance from "./pages/lms/finance/reports/TrialBalance";
import FinancialPerformance from "./pages/lms/finance/reports/FinancialPerformance";
import ProfitLoss from "./pages/lms/finance/reports/ProfitLoss";
import FinancialPosition from "./pages/lms/finance/reports/FinancialPosition";
import AnnualPosition from "./pages/lms/finance/reports/AnnualPosition";
import QuarterlyPerformance from "./pages/lms/finance/reports/QuarterlyPerformance";
import QuarterlyCashflow from "./pages/lms/finance/reports/QuarterlyCashflow";
import FinancialNotes from "./pages/lms/finance/reports/FinancialNotes";
import CashBook from "./pages/lms/finance/reports/CashBook";
import PettyCashReport from "./pages/lms/finance/reports/PettyCashReport";
import SupplierStatements from "./pages/lms/finance/reports/SupplierStatements";
import TaxSchedules from "./pages/lms/finance/reports/TaxSchedules";
import FeeReminder from "./pages/lms/finance/reports/FeeReminder";
import StudentSchedules from "./pages/lms/finance/reports/StudentSchedules";

// HR pages
import HRDashboard from "./pages/lms/hr/HRDashboard";
import EmployeeList from "./pages/lms/hr/employees/EmployeeList";
import AddEmployee from "./pages/lms/hr/employees/AddEmployee";
import EditEmployee from "./pages/lms/hr/employees/EditEmployee";
import BulkUpload from "./pages/lms/hr/employees/BulkUpload";
import Documents from "./pages/lms/hr/employees/Documents";
import Designations from "./pages/lms/hr/utilities/Designations";
import Ranks from "./pages/lms/hr/utilities/Ranks";
import EmploymentTerms from "./pages/lms/hr/utilities/EmploymentTerms";
import EmployeeCategories from "./pages/lms/hr/utilities/EmployeeCategories";
import CasualCategories from "./pages/lms/hr/utilities/CasualCategories";
import HRDepartments from "./pages/lms/hr/utilities/Departments";
import Skills from "./pages/lms/hr/utilities/Skills";
import SkillTypes from "./pages/lms/hr/utilities/SkillTypes";
import InsuranceTypes from "./pages/lms/hr/utilities/InsuranceTypes";
import LeaveApplications from "./pages/lms/hr/leave/LeaveApplications";
import LeaveTypes from "./pages/lms/hr/leave/LeaveTypes";
import LeaveBalances from "./pages/lms/hr/leave/LeaveBalances";
import LeaveCalendar from "./pages/lms/hr/leave/LeaveCalendar";
import LeaveGroups from "./pages/lms/hr/leave/config/LeaveGroups";
import LeavePeriods from "./pages/lms/hr/leave/config/LeavePeriods";
import WorkWeeks from "./pages/lms/hr/leave/config/WorkWeeks";
import Holidays from "./pages/lms/hr/leave/config/Holidays";
import ReservedPeriods from "./pages/lms/hr/leave/config/ReservedPeriods";
import DailyAttendance from "./pages/lms/hr/attendance/DailyAttendance";
import Overtime from "./pages/lms/hr/attendance/Overtime";
import TOIL from "./pages/lms/hr/attendance/TOIL";
import PerformanceReviews from "./pages/lms/hr/performance/PerformanceReviews";
import EvaluationPeriods from "./pages/lms/hr/performance/EvaluationPeriods";
import RatingScales from "./pages/lms/hr/performance/RatingScales";
import DisciplinaryRecords from "./pages/lms/hr/disciplinary/DisciplinaryRecords";
import Structure from "./pages/lms/hr/organization/Structure";
import HeadcountReport from "./pages/lms/hr/reports/HeadcountReport";
import LeaveLiability from "./pages/lms/hr/reports/LeaveLiability";
import AbsenteeismReport from "./pages/lms/hr/reports/AbsenteeismReport";
import TurnoverReport from "./pages/lms/hr/reports/TurnoverReport";
import ContractExpiry from "./pages/lms/hr/reports/ContractExpiry";
import ProbationTracking from "./pages/lms/hr/reports/ProbationTracking";

// Student Portal pages
import { StudentPortalLayout } from "./components/lms/StudentPortalLayout";
import StudentDashboard from "./pages/lms/student-portal/StudentDashboard";
import FeeBalance from "./pages/lms/student-portal/fees/FeeBalance";
import FeeStatement from "./pages/lms/student-portal/fees/FeeStatement";
import FeeReceipts from "./pages/lms/student-portal/fees/FeeReceipts";
import ResultSlip from "./pages/lms/student-portal/academics/ResultSlip";
import POEUpload from "./pages/lms/student-portal/poe/POEUpload";

// Admin POE Review
import POEReview from "./pages/lms/admin/POEReview";

// Finance Setup
import FinanceSetup from "./pages/lms/finance/FinanceSetup";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <InstitutionProvider>
          <Routes>
            {/* Original routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/checkout/:packageId" element={<CheckoutPage />} />

            {/* LMS Routes */}
            <Route path="/lms/auth" element={<LMSAuthPage />} />
            <Route path="/lms/reset-password" element={<ResetPasswordPage />} />
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
              
              {/* Admin Routes */}
              <Route path="admin/users" element={<UserManagement />} />
              <Route path="admin/roles" element={<RoleManagement />} />
              <Route path="admin/user-roles" element={<UserRoleAssignment />} />
              <Route path="admin/categories" element={<CategoryManagement />} />
              <Route path="admin/analytics" element={<AnalyticsDashboard />} />
              <Route path="admin/administration" element={<AdministrationSettings />} />
              <Route path="admin/settings" element={<SiteSettings />} />
              <Route path="admin/smtp" element={<SmtpSettings />} />
              <Route path="admin/mpesa" element={<MpesaSettings />} />
              <Route path="admin/setup/account" element={<AccountSetup />} />
              <Route path="admin/setup/tenants" element={<TenantManagement />} />
              <Route path="admin/poe-review" element={<POEReview />} />
              
              {/* Student Academics Routes */}
              <Route path="academics/exams" element={<ExamsManagement />} />
              <Route path="academics/marks" element={<MarksEntry />} />
              <Route path="academics/results" element={<ResultsView />} />
              <Route path="academics/subjects" element={<SubjectsManagement />} />
              <Route path="academics/programmes" element={<ProgrammesManagement />} />
              <Route path="academics/curriculum" element={<CurriculumManagement />} />
              <Route path="academics/attendance" element={<StudentAttendance />} />
              <Route path="academics/subject-registration" element={<SubjectRegistrationList />} />
              <Route path="academics/subject-registration/register" element={<SubjectRegistration />} />
              <Route path="academics/marks-computation" element={<MarksComputation />} />
              {/* Finance Routes */}
              <Route path="finance" element={<FinanceDashboard />} />
              <Route path="finance/fees-status" element={<StudentFeesStatus />} />
              <Route path="finance/fee-statement" element={<SummarizedFeeStatement />} />
              <Route path="finance/student-finance" element={<StudentFinance />} />
              <Route path="finance/student-invoice" element={<StudentInvoice />} />
              <Route path="finance/receivables" element={<Receivables />} />
              <Route path="finance/receivables/receive-payments" element={<ReceivePayments />} />
              <Route path="finance/receivables/transactions" element={<Transactions />} />
              <Route path="finance/payables" element={<Payables />} />
              <Route path="finance/payables/vouchers" element={<PaymentVouchers />} />
              <Route path="finance/payables/supplier-invoices" element={<SupplierInvoices />} />
              <Route path="finance/payables/expense-claims" element={<ExpenseClaims />} />
              <Route path="finance/payables/imprest" element={<ImprestManagement />} />
              <Route path="finance/payables/petty-cash" element={<PettyCash />} />
              <Route path="finance/budget" element={<Budget />} />
              <Route path="finance/cash-bank" element={<CashBankManagement />} />
              <Route path="finance/cancellations" element={<Cancellations />} />
              <Route path="finance/journals" element={<JournalEntries />} />
              <Route path="finance/setup" element={<FinanceSetup />} />
              {/* Finance Utilities */}
              <Route path="finance/utilities/chart-of-accounts" element={<ChartOfAccounts />} />
              <Route path="finance/utilities/fee-accounts" element={<FeeAccounts />} />
              <Route path="finance/utilities/groups" element={<Groups />} />
              <Route path="finance/utilities/sub-groups" element={<SubGroups />} />
              <Route path="finance/utilities/fiscal-years" element={<FiscalYears />} />
              <Route path="finance/utilities/currencies" element={<Currencies />} />
              <Route path="finance/utilities/exchange-rates" element={<ExchangeRates />} />
              <Route path="finance/utilities/payment-modes" element={<PaymentModes />} />
              <Route path="finance/utilities/tax-types" element={<TaxTypes />} />
              <Route path="finance/utilities/fee-policies" element={<FeePolicies />} />
              <Route path="finance/utilities/vendor-types" element={<VendorTypes />} />
              <Route path="finance/utilities/ledger" element={<Ledger />} />
              <Route path="finance/utilities/imprest-limits" element={<ImprestLimits />} />
              {/* Finance Reports */}
              <Route path="finance/reports/general-ledger" element={<GeneralLedger />} />
              <Route path="finance/reports/trial-balance" element={<TrialBalance />} />
              <Route path="finance/reports/financial-performance" element={<FinancialPerformance />} />
              <Route path="finance/reports/profit-loss" element={<ProfitLoss />} />
              <Route path="finance/reports/financial-position" element={<FinancialPosition />} />
              <Route path="finance/reports/annual-position" element={<AnnualPosition />} />
              <Route path="finance/reports/quarterly-performance" element={<QuarterlyPerformance />} />
              <Route path="finance/reports/quarterly-cashflow" element={<QuarterlyCashflow />} />
              <Route path="finance/reports/notes" element={<FinancialNotes />} />
              <Route path="finance/reports/cash-book" element={<CashBook />} />
              <Route path="finance/reports/petty-cash" element={<PettyCashReport />} />
              <Route path="finance/reports/supplier-statements" element={<SupplierStatements />} />
              <Route path="finance/reports/tax-schedules" element={<TaxSchedules />} />
              <Route path="finance/reports/fee-reminder" element={<FeeReminder />} />
              <Route path="finance/reports/student-schedules" element={<StudentSchedules />} />
              
              {/* HR Routes */}
              <Route path="hr/dashboard" element={<HRDashboard />} />
              <Route path="hr/employees" element={<EmployeeList />} />
              <Route path="hr/employees/add" element={<AddEmployee />} />
              <Route path="hr/employees/:id/edit" element={<EditEmployee />} />
              <Route path="hr/employees/bulk-upload" element={<BulkUpload />} />
              <Route path="hr/employees/documents" element={<Documents />} />
              <Route path="hr/organization/structure" element={<Structure />} />
              <Route path="hr/organization/departments" element={<HRDepartments />} />
              {/* HR Leave */}
              <Route path="hr/leave/applications" element={<LeaveApplications />} />
              <Route path="hr/leave/balances" element={<LeaveBalances />} />
              <Route path="hr/leave/calendar" element={<LeaveCalendar />} />
              <Route path="hr/leave/config/types" element={<LeaveTypes />} />
              <Route path="hr/leave/config/groups" element={<LeaveGroups />} />
              <Route path="hr/leave/config/periods" element={<LeavePeriods />} />
              <Route path="hr/leave/config/work-weeks" element={<WorkWeeks />} />
              <Route path="hr/leave/config/holidays" element={<Holidays />} />
              <Route path="hr/leave/config/reserved-periods" element={<ReservedPeriods />} />
              {/* HR Attendance */}
              <Route path="hr/attendance/daily" element={<DailyAttendance />} />
              <Route path="hr/attendance/overtime" element={<Overtime />} />
              <Route path="hr/attendance/toil" element={<TOIL />} />
              {/* HR Performance */}
              <Route path="hr/performance/reviews" element={<PerformanceReviews />} />
              <Route path="hr/performance/periods" element={<EvaluationPeriods />} />
              <Route path="hr/performance/scales" element={<RatingScales />} />
              {/* HR Disciplinary */}
              <Route path="hr/disciplinary/records" element={<DisciplinaryRecords />} />
              {/* HR Utilities */}
              <Route path="hr/utilities/designations" element={<Designations />} />
              <Route path="hr/utilities/ranks" element={<Ranks />} />
              <Route path="hr/utilities/employment-terms" element={<EmploymentTerms />} />
              <Route path="hr/utilities/categories" element={<EmployeeCategories />} />
              <Route path="hr/utilities/casual-categories" element={<CasualCategories />} />
              <Route path="hr/utilities/departments" element={<HRDepartments />} />
              <Route path="hr/utilities/skills" element={<Skills />} />
              <Route path="hr/utilities/skill-types" element={<SkillTypes />} />
              <Route path="hr/utilities/insurance-types" element={<InsuranceTypes />} />
              {/* HR Reports */}
              <Route path="hr/reports/headcount" element={<HeadcountReport />} />
              <Route path="hr/reports/leave-liability" element={<LeaveLiability />} />
              <Route path="hr/reports/absenteeism" element={<AbsenteeismReport />} />
              <Route path="hr/reports/turnover" element={<TurnoverReport />} />
              <Route path="hr/reports/contract-expiry" element={<ContractExpiry />} />
              <Route path="hr/reports/probation" element={<ProbationTracking />} />
            </Route>

            {/* Student Portal Routes */}
            <Route path="/lms/student-portal" element={<StudentPortalLayout />}>
              <Route index element={<StudentDashboard />} />
              <Route path="fees/balance" element={<FeeBalance />} />
              <Route path="fees/statement" element={<FeeStatement />} />
              <Route path="fees/receipts" element={<FeeReceipts />} />
              <Route path="academics/results" element={<ResultSlip />} />
              <Route path="poe/upload" element={<POEUpload />} />
            </Route>

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </InstitutionProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
