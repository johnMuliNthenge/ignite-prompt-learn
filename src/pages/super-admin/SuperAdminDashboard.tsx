import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Building2, Pencil, Search, Users, LogIn, Settings2,
  Shield, LogOut, Calendar, AlertTriangle,
} from 'lucide-react';
import { format, differenceInDays, isPast, isBefore, addDays } from 'date-fns';

interface Tenant {
  id: string;
  institution_name: string;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  primary_color: string;
  secondary_color: string;
  is_active: boolean;
  subscription_plan: string | null;
  max_users: number | null;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string;
}

interface TenantModule {
  id: string;
  tenant_id: string;
  module_code: string;
  module_name: string;
  is_enabled: boolean;
}

const ALL_MODULES = [
  { code: 'academics', name: 'Academics', description: 'Exams, marks, subjects, curriculum' },
  { code: 'courses', name: 'Online Courses', description: 'LMS courses, catalog, enrollment' },
  { code: 'finance', name: 'Finance', description: 'Fees, invoicing, accounting, reports' },
  { code: 'hr', name: 'Human Resources', description: 'Employees, leave, attendance, performance' },
  { code: 'payroll', name: 'Payroll', description: 'Salary processing, statutory deductions, payslips' },
  { code: 'poe', name: 'Portfolio of Evidence', description: 'Student POE uploads and reviews' },
  { code: 'students', name: 'Student Management', description: 'Student records, classes, registration' },
  { code: 'administration', name: 'Administration', description: 'Users, roles, site settings' },
];

const PLAN_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function SuperAdminDashboard() {
  const { user, isAdmin, signOut } = useAuth();
  const { switchTenant } = useInstitution();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [modulesDialogOpen, setModulesDialogOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantModules, setTenantModules] = useState<TenantModule[]>([]);
  const [savingModules, setSavingModules] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    institution_name: '', email: '', phone: '', city: '', country: '',
    primary_color: '217 91% 60%', secondary_color: '210 40% 96.1%',
    subscription_plan: 'basic', max_users: 50,
    subscription_start: '', subscription_end: '', is_active: true,
  });

  useEffect(() => {
    if (!loading && user && !isAdmin) {
      navigate('/super-admin/login');
    }
  }, [user, isAdmin, loading]);

  const fetchTenants = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('institution_settings')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTenants(data as Tenant[]);
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const filtered = tenants.filter(t =>
    t.institution_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getExpiryStatus = (endDate: string | null) => {
    if (!endDate) return { label: 'No expiry', variant: 'secondary' as const, daysLeft: null };
    const end = new Date(endDate);
    if (isPast(end)) return { label: 'Expired', variant: 'destructive' as const, daysLeft: 0 };
    const days = differenceInDays(end, new Date());
    if (days <= 30) return { label: `${days}d left`, variant: 'destructive' as const, daysLeft: days };
    if (days <= 90) return { label: `${days}d left`, variant: 'secondary' as const, daysLeft: days };
    return { label: `${days}d left`, variant: 'default' as const, daysLeft: days };
  };

  const openAdd = () => {
    setSelectedTenant(null);
    setForm({
      institution_name: '', email: '', phone: '', city: '', country: '',
      primary_color: '217 91% 60%', secondary_color: '210 40% 96.1%',
      subscription_plan: 'basic', max_users: 50,
      subscription_start: format(new Date(), 'yyyy-MM-dd'),
      subscription_end: format(addDays(new Date(), 365), 'yyyy-MM-dd'),
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setSelectedTenant(t);
    setForm({
      institution_name: t.institution_name, email: t.email || '', phone: t.phone || '',
      city: t.city || '', country: t.country || '',
      primary_color: t.primary_color, secondary_color: t.secondary_color,
      subscription_plan: t.subscription_plan || 'basic', max_users: t.max_users || 50,
      subscription_start: t.subscription_start || '',
      subscription_end: t.subscription_end || '', is_active: t.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.institution_name.trim()) {
      toast({ title: 'Institution name is required', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        institution_name: form.institution_name, email: form.email || null,
        phone: form.phone || null, city: form.city || null, country: form.country || null,
        primary_color: form.primary_color, secondary_color: form.secondary_color,
        subscription_plan: form.subscription_plan, max_users: form.max_users,
        subscription_start: form.subscription_start || null,
        subscription_end: form.subscription_end || null, is_active: form.is_active,
      };

      if (selectedTenant) {
        const { error } = await supabase.from('institution_settings').update(payload).eq('id', selectedTenant.id);
        if (error) throw error;
        toast({ title: 'Tenant updated' });
      } else {
        const { data, error } = await supabase.from('institution_settings').insert(payload).select().single();
        if (error) throw error;
        // Seed default modules for new tenant
        if (data) {
          const moduleInserts = ALL_MODULES.map(m => ({
            tenant_id: data.id,
            module_code: m.code,
            module_name: m.name,
            is_enabled: m.code === 'administration', // Admin always enabled
          }));
          await supabase.from('tenant_modules').insert(moduleInserts);
        }
        toast({ title: 'Tenant created with default modules' });
      }
      setDialogOpen(false);
      fetchTenants();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openModules = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    const { data } = await supabase
      .from('tenant_modules')
      .select('*')
      .eq('tenant_id', tenant.id);

    if (data && data.length > 0) {
      setTenantModules(data as TenantModule[]);
    } else {
      // Seed modules if none exist
      const moduleInserts = ALL_MODULES.map(m => ({
        tenant_id: tenant.id,
        module_code: m.code,
        module_name: m.name,
        is_enabled: m.code === 'administration',
      }));
      const { data: seeded } = await supabase.from('tenant_modules').insert(moduleInserts).select();
      setTenantModules((seeded || []) as TenantModule[]);
    }
    setModulesDialogOpen(true);
  };

  const toggleModule = (moduleCode: string) => {
    setTenantModules(prev => prev.map(m =>
      m.module_code === moduleCode ? { ...m, is_enabled: !m.is_enabled } : m
    ));
  };

  const saveModules = async () => {
    setSavingModules(true);
    try {
      for (const mod of tenantModules) {
        await supabase.from('tenant_modules')
          .update({ is_enabled: mod.is_enabled })
          .eq('id', mod.id);
      }
      toast({ title: 'Module access updated' });
      setModulesDialogOpen(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSavingModules(false);
    }
  };

  const handleAutoLogin = async (tenant: Tenant) => {
    await switchTenant(tenant.id);
    toast({ title: `Logged into ${tenant.institution_name}` });
    navigate('/lms/dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/super-admin/login');
  };

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    expired: tenants.filter(t => t.subscription_end && isPast(new Date(t.subscription_end))).length,
    expiringSoon: tenants.filter(t => {
      if (!t.subscription_end) return false;
      const end = new Date(t.subscription_end);
      return !isPast(end) && differenceInDays(end, new Date()) <= 30;
    }).length,
  };

  const hslToStyle = (hsl: string) => ({ backgroundColor: `hsl(${hsl})` });

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Platform Admin</h1>
        </div>
        <Button variant="ghost" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />Sign Out
        </Button>
      </header>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <div><p className="text-2xl font-bold">{stats.total}</p><p className="text-sm text-muted-foreground">Total Accounts</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-emerald-600" />
                <div><p className="text-2xl font-bold">{stats.active}</p><p className="text-sm text-muted-foreground">Active</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <div><p className="text-2xl font-bold">{stats.expiringSoon}</p><p className="text-sm text-muted-foreground">Expiring Soon</p></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-destructive" />
                <div><p className="text-2xl font-bold">{stats.expired}</p><p className="text-sm text-muted-foreground">Expired</p></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tenant List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Tenant Accounts</CardTitle>
              <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Account</Button>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search accounts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="mx-auto h-12 w-12 mb-3 opacity-30" />
                <p>No accounts found</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institution</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead>Max Users</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((tenant) => {
                      const expiry = getExpiryStatus(tenant.subscription_end);
                      return (
                        <TableRow key={tenant.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-white" style={hslToStyle(tenant.primary_color)}>
                                {tenant.institution_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{tenant.institution_name}</p>
                                <p className="text-xs text-muted-foreground">{tenant.email || '—'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="capitalize">{tenant.subscription_plan || 'basic'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tenant.is_active ? 'default' : 'destructive'}>
                              {tenant.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {tenant.subscription_end ? (
                                <div className="space-y-1">
                                  <p className="text-muted-foreground">
                                    {format(new Date(tenant.subscription_start || tenant.created_at), 'MMM d, yyyy')} — {format(new Date(tenant.subscription_end), 'MMM d, yyyy')}
                                  </p>
                                  <Badge variant={expiry.variant}>{expiry.label}</Badge>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No expiry set</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{tenant.max_users || '—'}</TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" title="Edit account" onClick={() => openEdit(tenant)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Manage modules" onClick={() => openModules(tenant)}>
                                <Settings2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" title="Auto-login to account" onClick={() => handleAutoLogin(tenant)}>
                                <LogIn className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Tenant Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTenant ? 'Edit Account' : 'Add New Account'}</DialogTitle>
            <DialogDescription>
              {selectedTenant ? 'Update institution details and subscription.' : 'Register a new institution on the platform.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Institution Name *</Label>
              <Input value={form.institution_name} onChange={e => setForm({ ...form, institution_name: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select value={form.subscription_plan} onValueChange={v => setForm({ ...form, subscription_plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Users</Label>
                <Input type="number" value={form.max_users} onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) || 50 })} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Start</Label>
                <Input type="date" value={form.subscription_start} onChange={e => setForm({ ...form, subscription_start: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Subscription End</Label>
                <Input type="date" value={form.subscription_end} onChange={e => setForm({ ...form, subscription_end: e.target.value })} />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {selectedTenant ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modules Dialog */}
      <Dialog open={modulesDialogOpen} onOpenChange={setModulesDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Module Access: {selectedTenant?.institution_name}</DialogTitle>
            <DialogDescription>Enable or disable modules for this tenant account.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {ALL_MODULES.map(mod => {
              const tm = tenantModules.find(m => m.module_code === mod.code);
              const isEnabled = tm?.is_enabled ?? false;
              const isAdmin = mod.code === 'administration';
              return (
                <div key={mod.code} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium text-sm">{mod.name}</p>
                    <p className="text-xs text-muted-foreground">{mod.description}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={() => toggleModule(mod.code)}
                    disabled={isAdmin}
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModulesDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveModules} disabled={savingModules}>
              {savingModules && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
