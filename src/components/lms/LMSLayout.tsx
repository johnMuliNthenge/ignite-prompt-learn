import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, MobileHeader } from './Sidebar';
import { Loader2 } from 'lucide-react';

export function LMSLayout() {
  const { user, loading, isStudent, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    // Initialize from localStorage
    const saved = localStorage.getItem('lms-sidebar-collapsed');
    return saved === 'true';
  });

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem('lms-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/lms/auth');
    }
  }, [user, loading, navigate]);

  // Redirect students to student portal
  useEffect(() => {
    if (!loading && user && isStudent && !isAdmin && !isTeacher) {
      // Only redirect if they're trying to access non-student portal LMS routes
      if (!location.pathname.startsWith('/lms/student-portal')) {
        navigate('/lms/student-portal');
      }
    }
  }, [user, loading, isStudent, isAdmin, isTeacher, location.pathname, navigate]);

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

  // Redirect students - don't render the admin layout for them
  if (isStudent && !isAdmin && !isTeacher) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col md:flex-row bg-background w-full">
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar - handles its own mobile/desktop rendering */}
      <Sidebar 
        open={sidebarOpen} 
        onOpenChange={setSidebarOpen}
        collapsed={sidebarCollapsed}
        onCollapsedChange={setSidebarCollapsed}
      />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
