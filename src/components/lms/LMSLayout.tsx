import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sidebar, MobileHeader } from './Sidebar';
import { Loader2 } from 'lucide-react';

export function LMSLayout() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      {/* Mobile Header */}
      <MobileHeader onMenuClick={() => setSidebarOpen(true)} />
      
      {/* Sidebar - handles its own mobile/desktop rendering */}
      <Sidebar open={sidebarOpen} onOpenChange={setSidebarOpen} />
      
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
