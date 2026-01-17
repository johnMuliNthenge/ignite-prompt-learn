import React from 'react';
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
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  roles?: ('admin' | 'teacher' | 'student')[];
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

const teacherItems: NavItem[] = [
  {
    title: 'Create Course',
    href: '/lms/courses/create',
    icon: PlusCircle,
    roles: ['admin', 'teacher'],
  },
  {
    title: 'My Created Courses',
    href: '/lms/instructor/courses',
    icon: FolderOpen,
    roles: ['admin', 'teacher'],
  },
];

const adminItems: NavItem[] = [
  {
    title: 'User Management',
    href: '/lms/admin/users',
    icon: Users,
    roles: ['admin'],
  },
  {
    title: 'Categories',
    href: '/lms/admin/categories',
    icon: FolderOpen,
    roles: ['admin'],
  },
  {
    title: 'Analytics',
    href: '/lms/admin/analytics',
    icon: BarChart3,
    roles: ['admin'],
  },
  {
    title: 'Site Settings',
    href: '/lms/admin/settings',
    icon: Settings,
    roles: ['admin'],
  },
];

interface SidebarProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { profile, role, signOut, isAdmin, isTeacher } = useAuth();
  const location = useLocation();

  const renderNavItems = (items: NavItem[]) =>
    items
      .filter((item) => !item.roles || (role && item.roles.includes(role)))
      .map((item) => (
        <Link
          key={item.href}
          to={item.href}
          onClick={onNavigate}
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
            location.pathname === item.href
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.title}</span>
        </Link>
      ));

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

        {(isAdmin || isTeacher) && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Instructor
            </p>
            <div className="space-y-1">{renderNavItems(teacherItems)}</div>
          </>
        )}

        {isAdmin && (
          <>
            <Separator className="my-4" />
            <p className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Administration
            </p>
            <div className="space-y-1">{renderNavItems(adminItems)}</div>
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
