import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Loader2,
  Menu,
  LogOut,
  DollarSign,
  Receipt,
  FileText,
  CreditCard,
  GraduationCap,
  ClipboardList,
  FolderOpen,
  Upload,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Home,
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  subItems?: NavItem[];
}

const studentNavItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/lms/student-portal',
    icon: Home,
  },
  {
    title: 'Fees',
    href: '/lms/student-portal/fees',
    icon: DollarSign,
    subItems: [
      {
        title: 'Fee Balance',
        href: '/lms/student-portal/fees/balance',
        icon: Receipt,
      },
      {
        title: 'Fee Statement',
        href: '/lms/student-portal/fees/statement',
        icon: FileText,
      },
      {
        title: 'Fee Receipts',
        href: '/lms/student-portal/fees/receipts',
        icon: CreditCard,
      },
    ],
  },
  {
    title: 'Academics',
    href: '/lms/student-portal/academics',
    icon: GraduationCap,
    subItems: [
      {
        title: 'Result Slip',
        href: '/lms/student-portal/academics/results',
        icon: ClipboardList,
      },
    ],
  },
  {
    title: 'Portfolio of Evidence',
    href: '/lms/student-portal/poe',
    icon: FolderOpen,
    subItems: [
      {
        title: 'Upload POE',
        href: '/lms/student-portal/poe/upload',
        icon: Upload,
      },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

function StudentSidebar({ open, onOpenChange, collapsed, onCollapsedChange }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const isActive = (href: string) => location.pathname === href;
  const isParentActive = (item: NavItem) => {
    if (isActive(item.href)) return true;
    return item.subItems?.some(sub => isActive(sub.href)) ?? false;
  };

  const toggleExpanded = (title: string) => {
    setExpandedItems(prev =>
      prev.includes(title)
        ? prev.filter(t => t !== title)
        : [...prev, title]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/lms/auth');
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <Link to="/lms/student-portal" className="flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Student Portal</span>
          </Link>
        )}
        {collapsed && (
          <GraduationCap className="mx-auto h-8 w-8 text-primary" />
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCollapsedChange(!collapsed)}
            className="ml-auto"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Separator />

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {studentNavItems.map((item) => (
            <div key={item.title}>
              {item.subItems ? (
                <Collapsible
                  open={expandedItems.includes(item.title) || isParentActive(item)}
                  onOpenChange={() => toggleExpanded(item.title)}
                >
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        'w-full justify-start gap-3',
                        isParentActive(item) && 'bg-muted font-medium'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.title}</span>
                          <ChevronDown className={cn(
                            'h-4 w-4 transition-transform',
                            (expandedItems.includes(item.title) || isParentActive(item)) && 'rotate-180'
                          )} />
                        </>
                      )}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="ml-4 space-y-1 pt-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        to={subItem.href}
                        onClick={() => isMobile && onOpenChange(false)}
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            'w-full justify-start gap-3',
                            isActive(subItem.href) && 'bg-primary text-primary-foreground'
                          )}
                        >
                          <subItem.icon className="h-4 w-4" />
                          {!collapsed && <span>{subItem.title}</span>}
                        </Button>
                      </Link>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ) : (
                <Link
                  to={item.href}
                  onClick={() => isMobile && onOpenChange(false)}
                >
                  <Button
                    variant="ghost"
                    className={cn(
                      'w-full justify-start gap-3',
                      isActive(item.href) && 'bg-primary text-primary-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {!collapsed && <span>{item.title}</span>}
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>

      <Separator />

      {/* User section */}
      <div className="p-4">
        <div className={cn(
          'flex items-center gap-3',
          collapsed && 'justify-center'
        )}>
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback>
              {profile?.full_name?.charAt(0) || 'S'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{profile?.full_name || 'Student'}</p>
              <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          className={cn(
            'mt-3 w-full justify-start gap-3 text-destructive hover:bg-destructive/10',
            collapsed && 'justify-center'
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign Out</span>}
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-72 p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden border-r bg-card transition-all duration-300 md:block',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {sidebarContent}
    </aside>
  );
}

function StudentMobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-14 items-center border-b bg-card px-4 md:hidden">
      <Button variant="ghost" size="icon" onClick={onMenuClick}>
        <Menu className="h-6 w-6" />
      </Button>
      <span className="ml-3 text-lg font-semibold">Student Portal</span>
    </header>
  );
}

export function StudentPortalLayout() {
  const { user, loading, isStudent } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('student-sidebar-collapsed');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('student-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col md:flex-row bg-background w-full">
      <StudentMobileHeader onMenuClick={() => setSidebarOpen(true)} />
      <StudentSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
