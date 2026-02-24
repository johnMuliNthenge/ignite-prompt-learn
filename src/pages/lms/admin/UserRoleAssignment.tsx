import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Search, Shield, Loader2, Users, UserCog, Pencil } from 'lucide-react';

interface EmployeeRow {
  id: string;
  employee_no: string;
  first_name: string;
  last_name: string;
  email: string;
  user_id: string | null;
  status: string;
  department_name: string | null;
  current_role_id: string | null;
  current_role_name: string | null;
}

interface AppRole {
  id: string;
  name: string;
  description: string | null;
}

export default function UserRoleAssignment() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Edit dialog state
  const [editEmployee, setEditEmployee] = useState<EmployeeRow | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/lms/dashboard');
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch employees with department
      const { data: emps, error: empErr } = await supabase
        .from('hr_employees')
        .select('id, employee_no, first_name, last_name, email, user_id, status, hr_departments!hr_employees_department_id_fkey(name)')
        .eq('status', 'active')
        .order('first_name');

      if (empErr) throw empErr;

      // Fetch all active app roles
      const { data: appRoles, error: rolesErr } = await supabase
        .from('app_roles')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (rolesErr) throw rolesErr;

      // Fetch user_roles with app_role mapping for employees that have user_id
      const userIds = (emps || []).filter(e => e.user_id).map(e => e.user_id);
      let userRolesMap: Record<string, { app_role_id: string | null; app_role_name: string | null }> = {};

      if (userIds.length > 0) {
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('user_id, app_role_id, app_roles:app_role_id(name)')
          .in('user_id', userIds);

        (userRoles || []).forEach((ur: any) => {
          userRolesMap[ur.user_id] = {
            app_role_id: ur.app_role_id,
            app_role_name: ur.app_roles?.name || null,
          };
        });
      }

      const mapped: EmployeeRow[] = (emps || []).map((e: any) => ({
        id: e.id,
        employee_no: e.employee_no,
        first_name: e.first_name,
        last_name: e.last_name,
        email: e.email,
        user_id: e.user_id,
        status: e.status,
        department_name: e.hr_departments?.name || null,
        current_role_id: e.user_id ? (userRolesMap[e.user_id]?.app_role_id || null) : null,
        current_role_name: e.user_id ? (userRolesMap[e.user_id]?.app_role_name || null) : null,
      }));

      setEmployees(mapped);
      setRoles(appRoles || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: error.message || 'Failed to load data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (emp: EmployeeRow) => {
    setEditEmployee(emp);
    setSelectedRoleId(emp.current_role_id || '');
  };

  const handleSaveRole = async () => {
    if (!editEmployee) return;

    if (!editEmployee.user_id) {
      toast({
        title: 'No user account',
        description: 'This employee does not have a login account yet. Please set up their account first from HR module.',
        variant: 'destructive',
      });
      return;
    }

    if (!selectedRoleId) {
      toast({ title: 'Please select a role', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ app_role_id: selectedRoleId })
        .eq('user_id', editEmployee.user_id);

      if (error) throw error;

      toast({ title: 'Role assigned successfully' });
      setEditEmployee(null);
      setSelectedRoleId('');
      fetchData();
    } catch (error: any) {
      console.error('Error assigning role:', error);
      toast({ title: 'Error', description: error.message || 'Failed to assign role', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const filteredEmployees = employees.filter((emp) => {
    const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.employee_no.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'unassigned' && !emp.current_role_id) ||
      emp.current_role_id === roleFilter;
    return matchesSearch && matchesRole;
  });

  const assignedCount = employees.filter(e => e.current_role_id).length;
  const unassignedCount = employees.filter(e => !e.current_role_id).length;

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
        <h1 className="text-3xl font-bold">Role Assignment</h1>
        <p className="mt-1 text-muted-foreground">
          Assign roles to staff members to control their system access and permissions
        </p>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{employees.length}</p>
              <p className="text-sm text-muted-foreground">Total Staff</p>
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
              placeholder="Search by name, email or employee no..."
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
              <SelectItem value="all">All Staff</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Staff Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Members</CardTitle>
          <CardDescription>
            {filteredEmployees.length} staff member{filteredEmployees.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee No</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Assigned Role</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No staff members found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-mono text-sm">{emp.employee_no}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {emp.first_name.charAt(0)}{emp.last_name.charAt(0)}
                          </span>
                        </div>
                        <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{emp.email}</TableCell>
                    <TableCell>{emp.department_name || '—'}</TableCell>
                    <TableCell>
                      {emp.current_role_name ? (
                        <Badge variant="default" className="gap-1">
                          <Shield className="h-3 w-3" />
                          {emp.current_role_name}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-orange-600">Unassigned</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(emp)}>
                        <Pencil className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Role Dialog */}
      <Dialog open={!!editEmployee} onOpenChange={(open) => { if (!open) { setEditEmployee(null); setSelectedRoleId(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Review employee details and assign a role
            </DialogDescription>
          </DialogHeader>
          {editEmployee && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <p className="font-medium">{editEmployee.first_name} {editEmployee.last_name}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Employee No</Label>
                  <p className="font-medium font-mono">{editEmployee.employee_no}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-medium text-sm">{editEmployee.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <p className="font-medium">{editEmployee.department_name || '—'}</p>
                </div>
              </div>

              {!editEmployee.user_id && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  This employee does not have a login account. Set up their account first from the HR module before assigning a role.
                </div>
              )}

              <div>
                <Label className="mb-2 block">Role</Label>
                <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={!editEmployee.user_id}>
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
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditEmployee(null); setSelectedRoleId(''); }}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole} disabled={saving || !selectedRoleId || !editEmployee?.user_id}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
