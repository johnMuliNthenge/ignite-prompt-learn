import React from 'react';
import { usePermissions, PermissionAction } from '@/hooks/usePermissions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX, Loader2 } from 'lucide-react';

interface PermissionGateProps {
  moduleCode: string;
  action: PermissionAction;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

export function PermissionGate({
  moduleCode,
  action,
  children,
  fallback,
  showAccessDenied = false,
}: PermissionGateProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hasPermission(moduleCode, action)) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showAccessDenied) {
      return (
        <Alert variant="destructive" className="max-w-md mx-auto mt-8">
          <ShieldX className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have permission to {action} this resource. 
            Please contact your administrator if you believe this is an error.
          </AlertDescription>
        </Alert>
      );
    }

    return null;
  }

  return <>{children}</>;
}

// Button wrapper that disables/hides based on permission
interface PermissionButtonProps {
  moduleCode: string;
  action: PermissionAction;
  children: React.ReactNode;
  hideWhenDenied?: boolean;
}

export function PermissionButton({
  moduleCode,
  action,
  children,
  hideWhenDenied = false,
}: PermissionButtonProps) {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return null;
  }

  const hasAccess = hasPermission(moduleCode, action);

  if (!hasAccess && hideWhenDenied) {
    return null;
  }

  // Clone children and disable if no permission
  if (!hasAccess && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      disabled: true,
      title: `You don't have permission to ${action}`,
    });
  }

  return <>{children}</>;
}
