import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { Shield, Plus, Edit, Trash2, Loader2, Users, Key, Settings } from 'lucide-react';

type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'change_status';

interface AppRole {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
}

interface AppModule {
  id: string;
  code: string;
  name: string;
  parent_code: string | null;
  description: string | null;
  sort_order: number;
}

interface RolePermission {
  id: string;
  role_id: string;
  module_code: string;
  action: PermissionAction;
  is_allowed: boolean;
}

const ACTIONS: { value: PermissionAction; label: string }[] = [
  { value: 'view', label: 'View' },
  { value: 'add', label: 'Add' },
  { value: 'edit', label: 'Edit' },
  { value: 'delete', label: 'Delete' },
  { value: 'change_status', label: 'Status' },
];

export default function RoleManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [roles, setRoles] = useState<AppRole[]>([]);
  const [modules, setModules] = useState<AppModule[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [selectedRole, setSelectedRole] = useState<AppRole | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/lms/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      const [rolesRes, modulesRes] = await Promise.all([
        supabase.from('app_roles').select('*').order('name'),
        supabase.from('app_modules').select('*').order('sort_order'),
      ]);

      if (rolesRes.error) throw rolesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setRoles(rolesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load roles', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    const { data, error } = await supabase
      .from('role_permissions')
      .select('*')
      .eq('role_id', roleId);

    if (error) {
      console.error('Error fetching permissions:', error);
      return;
    }

    setPermissions(data || []);
  };

  const handleCreateRole = async () => {
    if (!roleForm.name.trim()) {
      toast({ title: 'Error', description: 'Role name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      if (selectedRole) {
        // Update
        const { error } = await supabase
          .from('app_roles')
          .update({ name: roleForm.name, description: roleForm.description })
          .eq('id', selectedRole.id);

        if (error) throw error;
        toast({ title: 'Role updated successfully' });
      } else {
        // Create
        const { error } = await supabase
          .from('app_roles')
          .insert({ name: roleForm.name, description: roleForm.description });

        if (error) throw error;
        toast({ title: 'Role created successfully' });
      }

      setShowRoleDialog(false);
      setRoleForm({ name: '', description: '' });
      setSelectedRole(null);
      fetchData();
    } catch (error: any) {
      console.error('Error saving role:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to save role', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('app_roles')
        .delete()
        .eq('id', selectedRole.id);

      if (error) throw error;

      toast({ title: 'Role deleted successfully' });
      setShowDeleteDialog(false);
      setSelectedRole(null);
      fetchData();
    } catch (error: any) {
      console.error('Error deleting role:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Failed to delete role', 
        variant: 'destructive' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleRoleStatus = async (role: AppRole) => {
    try {
      const { error } = await supabase
        .from('app_roles')
        .update({ is_active: !role.is_active })
        .eq('id', role.id);

      if (error) throw error;
      toast({ title: role.is_active ? 'Role deactivated' : 'Role activated' });
      fetchData();
    } catch (error) {
      console.error('Error toggling role status:', error);
      toast({ title: 'Error', description: 'Failed to update role', variant: 'destructive' });
    }
  };

  const handlePermissionChange = async (
    roleId: string,
    moduleCode: string,
    action: PermissionAction,
    isAllowed: boolean
  ) => {
    try {
      const existingPerm = permissions.find(
        p => p.role_id === roleId && p.module_code === moduleCode && p.action === action
      );

      if (existingPerm) {
        if (isAllowed) {
          // Update
          await supabase
            .from('role_permissions')
            .update({ is_allowed: true })
            .eq('id', existingPerm.id);
        } else {
          // Delete
          await supabase
            .from('role_permissions')
            .delete()
            .eq('id', existingPerm.id);
        }
      } else if (isAllowed) {
        // Insert
        await supabase
          .from('role_permissions')
          .insert({ role_id: roleId, module_code: moduleCode, action, is_allowed: true });
      }

      fetchRolePermissions(roleId);
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({ title: 'Error', description: 'Failed to update permission', variant: 'destructive' });
    }
  };

  const handleGrantAllPermissions = async (roleId: string, moduleCode: string) => {
    try {
      const promises = ACTIONS.map(action =>
        supabase.from('role_permissions').upsert(
          { role_id: roleId, module_code: moduleCode, action: action.value, is_allowed: true },
          { onConflict: 'role_id,module_code,action' }
        )
      );

      await Promise.all(promises);
      fetchRolePermissions(roleId);
      toast({ title: 'All permissions granted' });
    } catch (error) {
      console.error('Error granting permissions:', error);
      toast({ title: 'Error', description: 'Failed to grant permissions', variant: 'destructive' });
    }
  };

  const handleRevokeAllPermissions = async (roleId: string, moduleCode: string) => {
    try {
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)
        .eq('module_code', moduleCode);

      fetchRolePermissions(roleId);
      toast({ title: 'All permissions revoked' });
    } catch (error) {
      console.error('Error revoking permissions:', error);
      toast({ title: 'Error', description: 'Failed to revoke permissions', variant: 'destructive' });
    }
  };

  const hasPermission = (roleId: string, moduleCode: string, action: PermissionAction) => {
    return permissions.some(
      p => p.role_id === roleId && p.module_code === moduleCode && p.action === action && p.is_allowed
    );
  };

  // Group modules by parent
  const groupedModules = modules.reduce((acc, module) => {
    if (!module.parent_code) {
      if (!acc[module.code]) {
        acc[module.code] = { parent: module, children: [] };
      } else {
        acc[module.code].parent = module;
      }
    } else {
      if (!acc[module.parent_code]) {
        acc[module.parent_code] = { parent: null as any, children: [] };
      }
      acc[module.parent_code].children.push(module);
    }
    return acc;
  }, {} as Record<string, { parent: AppModule; children: AppModule[] }>);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Roles & Permissions</h1>
          <p className="mt-1 text-muted-foreground">
            Manage user roles and their access permissions
          </p>
        </div>
        <Button onClick={() => {
          setSelectedRole(null);
          setRoleForm({ name: '', description: '' });
          setShowRoleDialog(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          Create Role
        </Button>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="roles" className="gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="permissions" className="gap-2">
            <Key className="h-4 w-4" />
            Permissions Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles">
          <Card>
            <CardHeader>
              <CardTitle>System Roles</CardTitle>
              <CardDescription>
                {roles.length} role{roles.length !== 1 ? 's' : ''} configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-primary" />
                          <span className="font-medium">{role.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {role.description || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={role.is_system ? 'secondary' : 'outline'}>
                          {role.is_system ? 'System' : 'Custom'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={role.is_active}
                          onCheckedChange={() => handleToggleRoleStatus(role)}
                          disabled={role.is_system && role.name === 'Super Admin'}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedRole(role);
                              fetchRolePermissions(role.id);
                            }}
                          >
                            <Settings className="mr-1 h-4 w-4" />
                            Permissions
                          </Button>
                          {!role.is_system && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedRole(role);
                                  setRoleForm({ name: role.name, description: role.description || '' });
                                  setShowRoleDialog(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setSelectedRole(role);
                                  setShowDeleteDialog(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Permissions Panel for Selected Role */}
          {selectedRole && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Permissions for: {selectedRole.name}
                </CardTitle>
                <CardDescription>
                  Configure what this role can access and modify
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {Object.entries(groupedModules).map(([code, { parent, children }]) => (
                    <AccordionItem key={code} value={code}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <span className="font-medium">{parent?.name || code}</span>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGrantAllPermissions(selectedRole.id, code);
                                children.forEach(child => 
                                  handleGrantAllPermissions(selectedRole.id, child.code)
                                );
                              }}
                            >
                              Grant All
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRevokeAllPermissions(selectedRole.id, code);
                                children.forEach(child =>
                                  handleRevokeAllPermissions(selectedRole.id, child.code)
                                );
                              }}
                            >
                              Revoke All
                            </Button>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          {/* Parent module permissions */}
                          {parent && (
                            <div className="flex items-center justify-between border-b pb-4">
                              <span className="text-sm font-medium">{parent.name}</span>
                              <div className="flex gap-4">
                                {ACTIONS.map(action => (
                                  <label key={action.value} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={hasPermission(selectedRole.id, parent.code, action.value)}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          selectedRole.id,
                                          parent.code,
                                          action.value,
                                          !!checked
                                        )
                                      }
                                    />
                                    <span className="text-sm">{action.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Child modules */}
                          {children.map(child => (
                            <div key={child.id} className="flex items-center justify-between pl-4">
                              <span className="text-sm">{child.name}</span>
                              <div className="flex gap-4">
                                {ACTIONS.map(action => (
                                  <label key={action.value} className="flex items-center gap-2">
                                    <Checkbox
                                      checked={hasPermission(selectedRole.id, child.code, action.value)}
                                      onCheckedChange={(checked) =>
                                        handlePermissionChange(
                                          selectedRole.id,
                                          child.code,
                                          action.value,
                                          !!checked
                                        )
                                      }
                                    />
                                    <span className="text-sm">{action.label}</span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>
                Overview of all role permissions across modules
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Module</TableHead>
                      {roles.filter(r => r.is_active).map(role => (
                        <TableHead key={role.id} className="text-center min-w-[120px]">
                          {role.name}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {modules.map(module => (
                      <TableRow key={module.id}>
                        <TableCell className={module.parent_code ? 'pl-8' : 'font-medium'}>
                          {module.name}
                        </TableCell>
                        {roles.filter(r => r.is_active).map(role => {
                          // Count permissions for this role/module
                          const permCount = permissions.filter(
                            p => p.role_id === role.id && p.module_code === module.code && p.is_allowed
                          ).length;

                          return (
                            <TableCell key={role.id} className="text-center">
                              {permCount > 0 ? (
                                <Badge variant="default" className="text-xs">
                                  {permCount}/{ACTIONS.length}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  None
                                </Badge>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedRole ? 'Edit Role' : 'Create New Role'}</DialogTitle>
            <DialogDescription>
              {selectedRole ? 'Update the role details' : 'Define a new role for your organization'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="roleName">Role Name *</Label>
              <Input
                id="roleName"
                value={roleForm.name}
                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                placeholder="e.g., Finance Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={roleForm.description}
                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                placeholder="Brief description of this role's responsibilities"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRole} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedRole ? 'Update' : 'Create'} Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedRole?.name}"? This action cannot be undone.
              Users assigned to this role will lose their permissions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRole} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
