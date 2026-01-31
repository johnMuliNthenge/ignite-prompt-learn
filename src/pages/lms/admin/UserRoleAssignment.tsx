import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, Loader2, Users, UserCog } from 'lucide-react';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  created_at: string;
  legacy_role: string;
  app_role_id: string | null;
  app_role_name: string | null;
}

interface AppRole {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export default function UserRoleAssignment() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/lms/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    try {
      // Fetch HR employees (only show employees, not students)
      const { data: employees, error: employeesError } = await supabase
        .from('hr_employees')
        .select('id, first_name, last_name, email, user_id')
        .order('created_at', { ascending: false });

      if (employeesError) throw employeesError;

      // Only get profiles for users who are HR employees
      const employeeUserIds = (employees || [])
        .filter(emp => emp.user_id)
        .map(emp => emp.user_id);

      // Fetch profiles only for employees with user accounts
      const { data: profiles, error: profilesError } = await supabase
        .from('lms_profiles')
        .select('*')
        .in('user_id', employeeUserIds.length > 0 ? employeeUserIds : ['00000000-0000-0000-0000-000000000000']);

      if (profilesError) throw profilesError;

      // Fetch user_roles with app_role join
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select(`
          *,
          app_roles:app_role_id (
            id,
            name
          )
        `)
        .in('user_id', employeeUserIds.length > 0 ? employeeUserIds : ['00000000-0000-0000-0000-000000000000']);

      if (rolesError) throw rolesError;

      // Fetch all app roles
      const { data: appRoles, error: appRolesError } = await supabase
        .from('app_roles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (appRolesError) throw appRolesError;

      // Combine data - only include profiles that belong to HR employees
      const usersWithRoles: UserWithRole[] = (profiles || []).map((profile) => {
        const userRole = userRoles?.find((r) => r.user_id === profile.user_id);
        const employee = employees?.find(emp => emp.user_id === profile.user_id);
        return {
          ...profile,
          full_name: profile.full_name || (employee ? `${employee.first_name} ${employee.last_name}` : null),
          legacy_role: userRole?.role || 'student',
          app_role_id: userRole?.app_role_id || null,
          app_role_name: (userRole?.app_roles as any)?.name || null,
        };
      });

      setUsers(usersWithRoles);
      setRoles(appRoles || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRoleId) return;

    setSaving(true);
    try {
      // Update user_roles with the app_role_id
      const { error } = await supabase
        .from('user_roles')
        .update({ app_role_id: selectedRoleId })
        .eq('user_id', selectedUser.user_id);

      if (error) throw error;

      toast({ title: 'Role assigned successfully' });
      setShowAssignDialog(false);
      setSelectedUser(null);
      setSelectedRoleId('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign role',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRole = async (user: UserWithRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ app_role_id: null })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({ title: 'Role removed successfully' });
      fetchData();
    } catch (error) {
      console.error('Error removing role:', error);
      toast({ title: 'Error', description: 'Failed to remove role', variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'unassigned' && !user.app_role_id) ||
      user.app_role_id === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Stats
  const assignedCount = users.filter(u => u.app_role_id).length;
  const unassignedCount = users.filter(u => !u.app_role_id).length;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">User Role Assignment</h1>
        <p className="mt-1 text-muted-foreground">
          Assign roles to users to control their access permissions
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{users.length}</p>
              <p className="text-sm text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <UserCog className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{assignedCount}</p>
              <p className="text-sm text-muted-foreground">With Roles</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Shield className="h-8 w-8 text-orange-500" />
            <div>
              <p className="text-2xl font-bold">{unassignedCount}</p>
              <p className="text-sm text-muted-foreground">Unassigned</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="flex gap-4 p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Legacy Role</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-sm font-medium text-primary">
                          {user.full_name?.charAt(0) || user.email.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{user.legacy_role}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.app_role_name ? (
                      <Badge variant="default" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {user.app_role_name}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-orange-600">
                        Unassigned
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? 'outline' : 'secondary'}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedRoleId(user.app_role_id || '');
                          setShowAssignDialog(true);
                        }}
                      >
                        {user.app_role_id ? 'Change Role' : 'Assign Role'}
                      </Button>
                      {user.app_role_id && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveRole(user)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Role Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Select a role for {selectedUser?.full_name || selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    <div className="flex flex-col">
                      <span>{role.name}</span>
                      {role.description && (
                        <span className="text-xs text-muted-foreground">{role.description}</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignRole} disabled={saving || !selectedRoleId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
