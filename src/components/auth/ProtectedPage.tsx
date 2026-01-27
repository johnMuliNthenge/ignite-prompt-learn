import React from 'react';
import { usePermissions, PermissionAction } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ShieldX, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProtectedPageProps {
  moduleCode: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}

/**
 * ProtectedPage - Wraps entire pages to enforce RBAC
 * Use this on EVERY page to ensure only users with 'view' permission can see the content.
 * 
 * Usage:
 * <ProtectedPage moduleCode="finance.journal" title="Journal Entries">
 *   <YourPageContent />
 * </ProtectedPage>
 */
export function ProtectedPage({
  moduleCode,
  children,
  title,
  description,
}: ProtectedPageProps) {
  const { canView, loading } = usePermissions();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!canView(moduleCode)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Alert variant="destructive" className="max-w-lg">
          <ShieldX className="h-5 w-5" />
          <AlertTitle className="text-lg">Access Denied</AlertTitle>
          <AlertDescription className="mt-2 space-y-4">
            <p>
              You don't have permission to access {title || 'this page'}. 
              {description && ` ${description}`}
            </p>
            <p className="text-sm opacity-80">
              Please contact your administrator if you believe this is an error or 
              if you need access to this module.
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/lms/dashboard')}
              className="mt-2"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Return to Dashboard
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}

interface ActionButtonProps {
  moduleCode: string;
  action: PermissionAction;
  children: React.ReactNode;
  hideWhenDenied?: boolean;
}

/**
 * ActionButton - Conditionally renders or disables buttons based on permission
 * 
 * Usage:
 * <ActionButton moduleCode="finance.journal" action="add" hideWhenDenied>
 *   <Button>Add Entry</Button>
 * </ActionButton>
 */
export function ActionButton({
  moduleCode,
  action,
  children,
  hideWhenDenied = true,
}: ActionButtonProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;

  const hasAccess = hasPermission(moduleCode, action);

  if (!hasAccess && hideWhenDenied) {
    return null;
  }

  // Clone and disable if no permission but not hiding
  if (!hasAccess && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: `You don't have permission to ${action}`,
      className: `${(children.props as any).className || ''} opacity-50 cursor-not-allowed`,
    });
  }

  return <>{children}</>;
}

interface ActionGateProps {
  moduleCode: string;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ActionGate - Conditionally renders content based on permission
 * Similar to ActionButton but for any content, not just buttons
 * 
 * Usage:
 * <ActionGate moduleCode="finance.journal" action="edit">
 *   <EditForm />
 * </ActionGate>
 */
export function ActionGate({
  moduleCode,
  action,
  children,
  fallback,
}: ActionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) return null;

  if (!hasPermission(moduleCode, action)) {
    return fallback ? <>{fallback}</> : null;
  }

  return <>{children}</>;
}

/**
 * Custom hook to get all permission checks for a module
 * 
 * Usage:
 * const { canAdd, canEdit, canDelete } = useModulePermissions('finance.journal');
 */
export function useModulePermissions(moduleCode: string) {
  const { hasPermission, loading } = usePermissions();

  return {
    loading,
    canView: hasPermission(moduleCode, 'view'),
    canAdd: hasPermission(moduleCode, 'add'),
    canEdit: hasPermission(moduleCode, 'edit'),
    canDelete: hasPermission(moduleCode, 'delete'),
    canChangeStatus: hasPermission(moduleCode, 'change_status'),
  };
}
