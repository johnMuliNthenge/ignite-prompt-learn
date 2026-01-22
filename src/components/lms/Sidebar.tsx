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

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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

    if (hasSubItems) {
      return (
        <Collapsible
          key={item.title}
          open={isOpen || isActive}
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
              {isOpen || isActive ? (
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

    return (
      <Collapsible
        key={module.title}
        open={isOpen || isActive}
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
            {isOpen || isActive ? (
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
      <div className="flex h-16 items-center gap-2 border-b px-6 shrink-0">
        <GraduationCap className="h-8 w-8 text-primary shrink-0" />
        <span className="text-xl font-bold">LearnHub</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-1">{renderNavItems(navItems)}</div>

        {/* Instructor Module */}
        {(isAdmin || isTeacher) && (
          <>
            <Separator className="my-4" />
            {renderModule(instructorModule)}
          </>
        )}

        {/* Administration Module */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            {renderModule(administrationModule)}
          </>
        )}

        {/* Finance Module */}
        {isAdmin && (
          <>
            <Separator className="my-4" />
            {renderModule(financeModule)}
          </>
        )}
      </ScrollArea>

      {/* User section */}
      <div className="border-t p-4 shrink-0">
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
      </div>
    </div>
  );
}

export function Sidebar({ open, onOpenChange }: SidebarProps) {
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

  // Desktop: Fixed sidebar
  return (
    <div className="hidden md:flex h-screen w-64 flex-col border-r bg-card shrink-0">
      <SidebarContent />
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
