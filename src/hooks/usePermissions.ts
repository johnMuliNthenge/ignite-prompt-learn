import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'change_status';

interface Permission {
  module_code: string;
  action: PermissionAction;
}

interface UsePermissionsReturn {
  permissions: Permission[];
  loading: boolean;
  hasPermission: (moduleCode: string, action: PermissionAction) => boolean;
  canView: (moduleCode: string) => boolean;
  canAdd: (moduleCode: string) => boolean;
  canEdit: (moduleCode: string) => boolean;
  canDelete: (moduleCode: string) => boolean;
  canChangeStatus: (moduleCode: string) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const { user, isAdmin } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    // Admins have all permissions
    if (isAdmin) {
      // Fetch all modules and grant all permissions
      const { data: modules } = await supabase
        .from('app_modules')
        .select('code')
        .eq('is_active', true);

      if (modules) {
        const allPermissions: Permission[] = [];
        const actions: PermissionAction[] = ['view', 'add', 'edit', 'delete', 'change_status'];
        modules.forEach(module => {
          actions.forEach(action => {
            allPermissions.push({ module_code: module.code, action });
          });
        });
        setPermissions(allPermissions);
      }
      setLoading(false);
      return;
    }

    try {
      // Fetch user's permissions from their assigned role
      const { data, error } = await supabase.rpc('get_user_permissions', {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } else {
        setPermissions((data || []) as Permission[]);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback((moduleCode: string, action: PermissionAction): boolean => {
    if (isAdmin) return true;
    
    // Check exact match
    const exactMatch = permissions.some(
      p => p.module_code === moduleCode && p.action === action
    );
    if (exactMatch) return true;

    // Check parent module permission (e.g., 'hr' grants access to 'hr.employees')
    const parts = moduleCode.split('.');
    if (parts.length > 1) {
      const parentCode = parts[0];
      return permissions.some(
        p => p.module_code === parentCode && p.action === action
      );
    }

    return false;
  }, [permissions, isAdmin]);

  const canView = useCallback((moduleCode: string) => hasPermission(moduleCode, 'view'), [hasPermission]);
  const canAdd = useCallback((moduleCode: string) => hasPermission(moduleCode, 'add'), [hasPermission]);
  const canEdit = useCallback((moduleCode: string) => hasPermission(moduleCode, 'edit'), [hasPermission]);
  const canDelete = useCallback((moduleCode: string) => hasPermission(moduleCode, 'delete'), [hasPermission]);
  const canChangeStatus = useCallback((moduleCode: string) => hasPermission(moduleCode, 'change_status'), [hasPermission]);

  return {
    permissions,
    loading,
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canChangeStatus,
    refetch: fetchPermissions,
  };
}
