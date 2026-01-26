import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Settings,
  GraduationCap,
  FolderOpen,
  BarChart3,
  PlusCircle,
  LogOut,
  Shield,
  Menu,
  UserCheck,
  Cog,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  School,
  DollarSign,
  Receipt,
  CreditCard,
  FileText,
  Wallet,
  Building2,
  Calculator,
  PieChart,
  BookMarked,
  Landmark,
  Coins,
  ClipboardList,
  FileSpreadsheet,
  TrendingUp,
  BarChart2,
  ScrollText,
  Banknote,
  UserPlus,
  Calendar,
  Clock,
  Award,
  Briefcase,
  Building,
  Network,
  FileCheck,
  CalendarDays,
  ClipboardCheck,
  Star,
  AlertTriangle,
  UserCog,
  TreeDeciduous,
  Layers,
  BadgeCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'teacher' | 'student')[];
  subItems?: NavItem[];
}

interface NavModule {
  title: string;
  icon: React.ElementType;
  roles?: ('admin' | 'teacher' | 'student')[];
  items: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/lms/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'My Courses',
    href: '/lms/courses',
    icon: BookOpen,
  },
  {
    title: 'Course Catalog',
    href: '/lms/catalog',
    icon: GraduationCap,
  },
];

// Instructor Module
const instructorModule: NavModule = {
  title: 'Instructor',
  icon: UserCheck,
  roles: ['admin', 'teacher'],
  items: [
    {
      title: 'Create Course',
      href: '/lms/courses/create',
      icon: PlusCircle,
    },
    {
      title: 'My Created Courses',
      href: '/lms/instructor/courses',
      icon: FolderOpen,
    },
    {
      title: 'Student Management',
      href: '/lms/students',
      icon: Users,
      subItems: [
        {
          title: 'All Students',
          href: '/lms/students',
          icon: Users,
        },
        {
          title: 'Classes',
          href: '/lms/students/classes',
          icon: School,
        },
      ],
    },
  ],
};

// Administration Module
const administrationModule: NavModule = {
  title: 'Administration',
  icon: Shield,
  roles: ['admin'],
  items: [
    {
      title: 'User Management',
      href: '/lms/admin/users',
      icon: Users,
    },
    {
      title: 'Categories',
      href: '/lms/admin/categories',
      icon: FolderOpen,
    },
    {
      title: 'Analytics',
      href: '/lms/admin/analytics',
      icon: BarChart3,
    },
    {
      title: 'Administration',
      href: '/lms/admin/administration',
      icon: Cog,
    },
    {
      title: 'Site Settings',
      href: '/lms/admin/settings',
      icon: Settings,
    },
  ],
};

// Finance Module with all submodules
const financeModule: NavModule = {
  title: 'Finance',
  icon: DollarSign,
  roles: ['admin'],
  items: [
    {
      title: 'Student Fees Status',
      href: '/lms/finance/fees-status',
      icon: Receipt,
    },
    {
      title: 'Summarized Fee Statement',
      href: '/lms/finance/fee-statement',
      icon: FileText,
    },
    {
      title: 'Student Finance',
      href: '/lms/finance/student-finance',
      icon: Wallet,
    },
    {
      title: 'Receivables',
      href: '/lms/finance/receivables',
      icon: CreditCard,
    },
    {
      title: 'Budget',
      href: '/lms/finance/budget',
      icon: Calculator,
    },
    {
      title: 'Cash and Bank Management',
      href: '/lms/finance/cash-bank',
      icon: Landmark,
    },
    {
      title: 'Payables',
      href: '/lms/finance/payables',
      icon: Banknote,
    },
    {
      title: 'Cancellations',
      href: '/lms/finance/cancellations',
      icon: FileText,
    },
    {
      title: 'Journal Entries',
      href: '/lms/finance/journals',
      icon: BookMarked,
    },
    {
      title: 'Utilities',
      href: '/lms/finance/utilities',
      icon: Settings,
      subItems: [
        {
          title: 'Chart of Accounts',
          href: '/lms/finance/utilities/chart-of-accounts',
          icon: ClipboardList,
        },
        {
          title: 'Fee Accounts',
          href: '/lms/finance/utilities/fee-accounts',
          icon: Coins,
        },
        {
          title: 'Groups',
          href: '/lms/finance/utilities/groups',
          icon: FolderOpen,
        },
        {
          title: 'Sub Groups',
          href: '/lms/finance/utilities/sub-groups',
          icon: FolderOpen,
        },
        {
          title: 'Fiscal Years',
          href: '/lms/finance/utilities/fiscal-years',
          icon: Calculator,
        },
        {
          title: 'Currencies',
          href: '/lms/finance/utilities/currencies',
          icon: Coins,
        },
        {
          title: 'Exchange Rates',
          href: '/lms/finance/utilities/exchange-rates',
          icon: TrendingUp,
        },
        {
          title: 'Payment Modes',
          href: '/lms/finance/utilities/payment-modes',
          icon: CreditCard,
        },
        {
          title: 'Tax Types',
          href: '/lms/finance/utilities/tax-types',
          icon: Receipt,
        },
        {
          title: 'Fee Policies',
          href: '/lms/finance/utilities/fee-policies',
          icon: FileText,
        },
        {
          title: 'Vendor Types',
          href: '/lms/finance/utilities/vendor-types',
          icon: Building2,
        },
        {
          title: 'Ledger',
          href: '/lms/finance/utilities/ledger',
          icon: BookMarked,
        },
        {
          title: 'Imprest Limit Setup',
          href: '/lms/finance/utilities/imprest-limits',
          icon: Wallet,
        },
      ],
    },
    {
      title: 'Reports',
      href: '/lms/finance/reports',
      icon: BarChart2,
      subItems: [
        {
          title: 'General Ledger',
          href: '/lms/finance/reports/general-ledger',
          icon: BookMarked,
        },
        {
          title: 'Trial Balance',
          href: '/lms/finance/reports/trial-balance',
          icon: Calculator,
        },
        {
          title: 'Statement of Financial Performance',
          href: '/lms/finance/reports/financial-performance',
          icon: TrendingUp,
        },
        {
          title: 'Profit and Loss Account',
          href: '/lms/finance/reports/profit-loss',
          icon: PieChart,
        },
        {
          title: 'Statement of Financial Position',
          href: '/lms/finance/reports/financial-position',
          icon: FileSpreadsheet,
        },
        {
          title: 'Annual Statement of Financial Position',
          href: '/lms/finance/reports/annual-position',
          icon: FileSpreadsheet,
        },
        {
          title: 'Quarterly Statement of Financial Performance',
          href: '/lms/finance/reports/quarterly-performance',
          icon: BarChart2,
        },
        {
          title: 'Quarterly Cashflow Statement',
          href: '/lms/finance/reports/quarterly-cashflow',
          icon: TrendingUp,
        },
        {
          title: 'Notes to Financial Statements',
          href: '/lms/finance/reports/notes',
          icon: ScrollText,
        },
        {
          title: 'Cash Book',
          href: '/lms/finance/reports/cash-book',
          icon: BookOpen,
        },
        {
          title: 'Petty Cash Report',
          href: '/lms/finance/reports/petty-cash',
          icon: Wallet,
        },
        {
          title: 'Supplier Statements',
          href: '/lms/finance/reports/supplier-statements',
          icon: FileText,
        },
        {
          title: 'Tax Schedules',
          href: '/lms/finance/reports/tax-schedules',
          icon: Receipt,
        },
        {
          title: 'Fee Reminder',
          href: '/lms/finance/reports/fee-reminder',
          icon: Receipt,
        },
        {
          title: 'Student Schedules',
          href: '/lms/finance/reports/student-schedules',
          icon: Users,
        },
      ],
    },
  ],
};

// Human Resource Module
const hrModule: NavModule = {
  title: 'Human Resource',
  icon: Briefcase,
  roles: ['admin'],
  items: [
    {
      title: 'HR Dashboard',
      href: '/lms/hr/dashboard',
      icon: LayoutDashboard,
    },
    {
      title: 'Employees',
      href: '/lms/hr/employees',
      icon: Users,
      subItems: [
        {
          title: 'All Employees',
          href: '/lms/hr/employees',
          icon: Users,
        },
        {
          title: 'Add Employee',
          href: '/lms/hr/employees/add',
          icon: UserPlus,
        },
        {
          title: 'Bulk Upload',
          href: '/lms/hr/employees/bulk-upload',
          icon: FileSpreadsheet,
        },
        {
          title: 'Documents',
          href: '/lms/hr/employees/documents',
          icon: FileCheck,
        },
      ],
    },
    {
      title: 'Leave Management',
      href: '/lms/hr/leave',
      icon: CalendarDays,
      subItems: [
        {
          title: 'Leave Applications',
          href: '/lms/hr/leave/applications',
          icon: ClipboardCheck,
        },
        {
          title: 'Leave Balances',
          href: '/lms/hr/leave/balances',
          icon: Calculator,
        },
        {
          title: 'Leave Calendar',
          href: '/lms/hr/leave/calendar',
          icon: Calendar,
        },
        {
          title: 'Leave Configuration',
          href: '/lms/hr/leave/config',
          icon: Settings,
          subItems: [
            {
              title: 'Leave Types',
              href: '/lms/hr/leave/config/types',
              icon: Layers,
            },
            {
              title: 'Leave Groups',
              href: '/lms/hr/leave/config/groups',
              icon: FolderOpen,
            },
            {
              title: 'Leave Periods',
              href: '/lms/hr/leave/config/periods',
              icon: Calendar,
            },
            {
              title: 'Work Weeks',
              href: '/lms/hr/leave/config/work-weeks',
              icon: CalendarDays,
            },
            {
              title: 'Holidays',
              href: '/lms/hr/leave/config/holidays',
              icon: TreeDeciduous,
            },
            {
              title: 'Reserved Periods',
              href: '/lms/hr/leave/config/reserved',
              icon: Calendar,
            },
          ],
        },
      ],
    },
    {
      title: 'Attendance',
      href: '/lms/hr/attendance',
      icon: Clock,
      subItems: [
        {
          title: 'Daily Attendance',
          href: '/lms/hr/attendance/daily',
          icon: ClipboardCheck,
        },
        {
          title: 'Overtime',
          href: '/lms/hr/attendance/overtime',
          icon: Clock,
        },
        {
          title: 'Time Off In Lieu',
          href: '/lms/hr/attendance/toil',
          icon: Calendar,
        },
      ],
    },
    {
      title: 'Performance',
      href: '/lms/hr/performance',
      icon: Award,
      subItems: [
        {
          title: 'Performance Reviews',
          href: '/lms/hr/performance/reviews',
          icon: Star,
        },
        {
          title: 'Evaluation Periods',
          href: '/lms/hr/performance/periods',
          icon: Calendar,
        },
        {
          title: 'Rating Scales',
          href: '/lms/hr/performance/scales',
          icon: BarChart2,
        },
      ],
    },
    {
      title: 'Disciplinary',
      href: '/lms/hr/disciplinary',
      icon: AlertTriangle,
    },
    {
      title: 'Organization',
      href: '/lms/hr/organization',
      icon: Network,
      subItems: [
        {
          title: 'Structure',
          href: '/lms/hr/organization/structure',
          icon: Building,
        },
        {
          title: 'Departments',
          href: '/lms/hr/organization/departments',
          icon: Building2,
        },
      ],
    },
    {
      title: 'HR Utilities',
      href: '/lms/hr/utilities',
      icon: Settings,
      subItems: [
        {
          title: 'Designations',
          href: '/lms/hr/utilities/designations',
          icon: BadgeCheck,
        },
        {
          title: 'Ranks',
          href: '/lms/hr/utilities/ranks',
          icon: Award,
        },
        {
          title: 'Employment Terms',
          href: '/lms/hr/utilities/employment-terms',
          icon: FileText,
        },
        {
          title: 'Employee Categories',
          href: '/lms/hr/utilities/categories',
          icon: FolderOpen,
        },
        {
          title: 'Casual Categories',
          href: '/lms/hr/utilities/casual-categories',
          icon: UserCog,
        },
        {
          title: 'Skills',
          href: '/lms/hr/utilities/skills',
          icon: Star,
        },
        {
          title: 'Skill Types',
          href: '/lms/hr/utilities/skill-types',
          icon: Layers,
        },
        {
          title: 'Insurance Types',
          href: '/lms/hr/utilities/insurance-types',
          icon: Shield,
        },
      ],
    },
    {
      title: 'HR Reports',
      href: '/lms/hr/reports',
      icon: BarChart2,
      subItems: [
        {
          title: 'Headcount Report',
          href: '/lms/hr/reports/headcount',
          icon: Users,
        },
        {
          title: 'Leave Liability',
          href: '/lms/hr/reports/leave-liability',
          icon: Calculator,
        },
        {
          title: 'Absenteeism Report',
          href: '/lms/hr/reports/absenteeism',
          icon: Clock,
        },
        {
          title: 'Turnover Report',
          href: '/lms/hr/reports/turnover',
          icon: TrendingUp,
        },
        {
          title: 'Contract Expiry',
          href: '/lms/hr/reports/contract-expiry',
          icon: FileText,
        },
        {
          title: 'Probation Tracking',
          href: '/lms/hr/reports/probation',
          icon: ClipboardCheck,
        },
      ],
    },
  ],
};

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

function SidebarContent({ 
  onNavigate, 
  collapsed = false 
}: { 
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const { profile, role, signOut, isAdmin, isTeacher } = useAuth();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [openModules, setOpenModules] = useState<string[]>([]);

  const toggleMenu = (title: string) => {
    setOpenMenus((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const toggleModule = (title: string) => {
    setOpenModules((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  const isActiveRoute = (href: string, subItems?: NavItem[]) => {
    if (location.pathname === href) return true;
    if (subItems) {
      return subItems.some((sub) => isActiveRoute(sub.href, sub.subItems));
    }
    return false;
  };

  const isModuleActive = (module: NavModule) => {
    return module.items.some((item) => isActiveRoute(item.href, item.subItems));
  };

  const renderNavItem = (item: NavItem, depth: number = 0) => {
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isOpen = openMenus.includes(item.title);
    const isActive = isActiveRoute(item.href, item.subItems);

    if (collapsed && depth === 0) {
      return (
        <Tooltip key={item.title}>
          <TooltipTrigger asChild>
            <Link
              to={hasSubItems ? item.subItems![0].href : item.href}
              onClick={onNavigate}
              className={cn(
                'flex items-center justify-center rounded-lg p-2 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{item.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    if (hasSubItems) {
      return (
        <Collapsible
          key={item.title}
          open={isOpen}
          onOpenChange={() => toggleMenu(item.title)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                isActive
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                depth > 0 && 'text-xs'
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 pt-1 space-y-1">
            {item.subItems!
              .filter((sub) => !sub.roles || (role && sub.roles.includes(role)))
              .map((subItem) => renderNavItem(subItem, depth + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        key={item.href}
        to={item.href}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          location.pathname === item.href
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          depth > 0 && 'text-xs'
        )}
      >
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{item.title}</span>
      </Link>
    );
  };

  const renderModule = (module: NavModule) => {
    const isOpen = openModules.includes(module.title);
    const isActive = isModuleActive(module);

    if (collapsed) {
      return (
        <Tooltip key={module.title}>
          <TooltipTrigger asChild>
            <Link
              to={module.items[0]?.href || '#'}
              className={cn(
                'flex items-center justify-center rounded-lg p-2 transition-colors',
                isActive
                  ? 'bg-muted/50 text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <module.icon className="h-5 w-5" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{module.title}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Collapsible
        key={module.title}
        open={isOpen}
        onOpenChange={() => toggleModule(module.title)}
      >
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-muted/50 text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <module.icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{module.title}</span>
            </div>
            {isOpen ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-2 pt-1 space-y-1">
          {module.items
            .filter((item) => !item.roles || (role && item.roles.includes(role)))
            .map((item) => renderNavItem(item))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const renderNavItems = (items: NavItem[]) =>
    items
      .filter((item) => !item.roles || (role && item.roles.includes(role)))
      .map((item) => renderNavItem(item));

  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className={cn(
        "flex h-16 items-center gap-2 border-b shrink-0",
        collapsed ? "justify-center px-2" : "px-6"
      )}>
        <GraduationCap className="h-8 w-8 text-primary shrink-0" />
        {!collapsed && <span className="text-xl font-bold">LearnHub</span>}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-2 py-4">
        <div className={cn("space-y-1", collapsed && "flex flex-col items-center")}>
          {renderNavItems(navItems)}
        </div>

        {/* Instructor Module */}
        {(isAdmin || isTeacher) && (
          <>
            <Separator className="my-4" />
            <div className={collapsed ? "flex flex-col items-center space-y-1" : ""}>
              {renderModule(instructorModule)}
            </div>
          </>
        )}

        {/* Administration Module */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <div className={collapsed ? "flex flex-col items-center space-y-1" : ""}>
              {renderModule(administrationModule)}
            </div>
          </>
        )}

        {/* Finance Module */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <div className={collapsed ? "flex flex-col items-center space-y-1" : ""}>
              {renderModule(financeModule)}
            </div>
          </>
        )}

        {/* HR Module */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            <div className={collapsed ? "flex flex-col items-center space-y-1" : ""}>
              {renderModule(hrModule)}
            </div>
          </>
        )}
      </ScrollArea>

      {/* User section */}
      <div className="border-t p-4 shrink-0">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 mx-auto cursor-pointer">
                <span className="text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{role || 'student'}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <>
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 shrink-0">
                <span className="text-sm font-medium text-primary">
                  {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="flex-1 overflow-hidden min-w-0">
                <p className="truncate text-sm font-medium">
                  {profile?.full_name || 'User'}
                </p>
                <div className="flex items-center gap-1">
                  {isAdmin && <Shield className="h-3 w-3 text-destructive shrink-0" />}
                  <p className="truncate text-xs capitalize text-muted-foreground">
                    {role || 'student'}
                  </p>
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={signOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function Sidebar({ open, onOpenChange, collapsed, onCollapsedChange }: SidebarProps) {
  const isMobile = useIsMobile();

  // Mobile: Use Sheet
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-64 p-0">
          <SidebarContent onNavigate={() => onOpenChange?.(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar with collapse toggle
  return (
    <div className={cn(
      "hidden md:flex h-screen flex-col border-r bg-card shrink-0 transition-all duration-300 relative",
      collapsed ? "w-16" : "w-64"
    )}>
      <SidebarContent collapsed={collapsed} />
      
      {/* Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md hover:bg-muted"
        onClick={() => onCollapsedChange?.(!collapsed)}
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
}

export function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex md:hidden h-14 items-center gap-4 border-b bg-card px-4 shrink-0">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </Button>
      <div className="flex items-center gap-2">
        <GraduationCap className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">LearnHub</span>
      </div>
    </header>
  );
}
