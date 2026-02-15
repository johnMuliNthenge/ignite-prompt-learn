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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2, Plus, Building2, Pencil, Eye, Search, Users, Calendar, CreditCard, KeyRound,
} from 'lucide-react';
import { format } from 'date-fns';

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

const PLAN_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'enterprise', label: 'Enterprise' },
];

export default function TenantManagement() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { switchTenant } = useInstitution();
  const { toast } = useToast();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    institution_name: '',
    email: '',
    phone: '',
    city: '',
    country: '',
    primary_color: '217 91% 60%',
    secondary_color: '210 40% 96.1%',
    subscription_plan: 'basic',
    max_users: 50,
    subscription_start: '',
    subscription_end: '',
    is_active: true,
  });

  useEffect(() => {
    if (!isAdmin) navigate('/lms/dashboard');
  }, [isAdmin, navigate]);

  const fetchTenants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('institution_settings')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setTenants(data as Tenant[]);
    if (error) toast({ title: 'Error loading tenants', description: error.message, variant: 'destructive' });
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

  const filtered = tenants.filter(t =>
    t.institution_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase()) ||
    t.city?.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setSelectedTenant(null);
    setForm({
      institution_name: '', email: '', phone: '', city: '', country: '',
      primary_color: '217 91% 60%', secondary_color: '210 40% 96.1%',
      subscription_plan: 'basic', max_users: 50,
      subscription_start: '', subscription_end: '', is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (t: Tenant) => {
    setSelectedTenant(t);
    setForm({
      institution_name: t.institution_name,
      email: t.email || '',
      phone: t.phone || '',
      city: t.city || '',
      country: t.country || '',
      primary_color: t.primary_color,
      secondary_color: t.secondary_color,
      subscription_plan: t.subscription_plan || 'basic',
      max_users: t.max_users || 50,
      subscription_start: t.subscription_start || '',
      subscription_end: t.subscription_end || '',
      is_active: t.is_active,
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
        institution_name: form.institution_name,
        email: form.email || null,
        phone: form.phone || null,
        city: form.city || null,
        country: form.country || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        subscription_plan: form.subscription_plan,
        max_users: form.max_users,
        subscription_start: form.subscription_start || null,
        subscription_end: form.subscription_end || null,
        is_active: form.is_active,
      };

      if (selectedTenant) {
        const { error } = await supabase
          .from('institution_settings')
          .update(payload)
          .eq('id', selectedTenant.id);
        if (error) throw error;
        toast({ title: 'Tenant updated successfully' });
      } else {
        const { error } = await supabase
          .from('institution_settings')
          .insert(payload);
        if (error) throw error;
        toast({ title: 'Tenant created successfully' });
      }
      setDialogOpen(false);
      fetchTenants();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (tenant: Tenant) => {
    const { error } = await supabase
      .from('institution_settings')
      .update({ is_active: !tenant.is_active })
      .eq('id', tenant.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: `Tenant ${tenant.is_active ? 'deactivated' : 'activated'}` });
      fetchTenants();
    }
  };

  const hslToStyle = (hsl: string) => ({ backgroundColor: `hsl(${hsl})` });

  const stats = {
    total: tenants.length,
    active: tenants.filter(t => t.is_active).length,
    inactive: tenants.filter(t => !t.is_active).length,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="mt-1 text-muted-foreground">
            Manage institution accounts across the platform
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add Tenant
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Building2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="mx-auto h-12 w-12 mb-3 opacity-30" />
              <p>No tenants found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Institution</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Colors</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {tenant.logo_url ? (
                            <img src={tenant.logo_url} alt="" className="h-8 w-8 rounded object-contain" />
                          ) : (
                            <div className="h-8 w-8 rounded flex items-center justify-center text-xs font-bold text-primary-foreground" style={hslToStyle(tenant.primary_color)}>
                              {tenant.institution_name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <p className="font-medium">{tenant.institution_name}</p>
                            {tenant.email && <p className="text-xs text-muted-foreground">{tenant.email}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {[tenant.city, tenant.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {tenant.subscription_plan || 'basic'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <div className="h-5 w-5 rounded-full border" style={hslToStyle(tenant.primary_color)} title="Primary" />
                          <div className="h-5 w-5 rounded-full border" style={hslToStyle(tenant.secondary_color)} title="Secondary" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tenant.is_active ? 'default' : 'destructive'}>
                          {tenant.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(tenant.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedTenant(tenant); setDetailOpen(true); }}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tenant)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Login as this tenant"
                            onClick={async () => {
                              await switchTenant(tenant.id);
                              toast({ title: `Switched to ${tenant.institution_name}` });
                              navigate('/lms/dashboard');
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedTenant ? 'Edit Tenant' : 'Add New Tenant'}</DialogTitle>
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
                <Label>Primary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={hslToHexHelper(form.primary_color)}
                    onChange={e => setForm({ ...form, primary_color: hexToHslHelper(e.target.value) })}
                    className="h-9 w-12 rounded cursor-pointer border-0"
                  />
                  <div className="h-9 flex-1 rounded-md border" style={hslToStyle(form.primary_color)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Secondary Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={hslToHexHelper(form.secondary_color)}
                    onChange={e => setForm({ ...form, secondary_color: hexToHslHelper(e.target.value) })}
                    className="h-9 w-12 rounded cursor-pointer border-0"
                  />
                  <div className="h-9 flex-1 rounded-md border" style={hslToStyle(form.secondary_color)} />
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subscription Plan</Label>
                <Select value={form.subscription_plan} onValueChange={v => setForm({ ...form, subscription_plan: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Max Users</Label>
                <Input type="number" value={form.max_users} onChange={e => setForm({ ...form, max_users: parseInt(e.target.value) || 0 })} />
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

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">Enable or disable this tenant</p>
              </div>
              <Switch checked={form.is_active} onCheckedChange={v => setForm({ ...form, is_active: v })} />
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

      {/* Detail View Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tenant Details</DialogTitle>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {selectedTenant.logo_url ? (
                  <img src={selectedTenant.logo_url} alt="" className="h-14 w-14 rounded-lg object-contain border" />
                ) : (
                  <div className="h-14 w-14 rounded-lg flex items-center justify-center text-lg font-bold text-primary-foreground" style={hslToStyle(selectedTenant.primary_color)}>
                    {selectedTenant.institution_name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">{selectedTenant.institution_name}</h3>
                  <Badge variant={selectedTenant.is_active ? 'default' : 'destructive'}>
                    {selectedTenant.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedTenant.email || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium">{selectedTenant.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">{[selectedTenant.city, selectedTenant.country].filter(Boolean).join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Plan</p>
                  <Badge variant="secondary" className="capitalize">{selectedTenant.subscription_plan || 'basic'}</Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Max Users</p>
                  <p className="font-medium">{selectedTenant.max_users || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{format(new Date(selectedTenant.created_at), 'MMM d, yyyy')}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Brand Colors</p>
                <div className="flex gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full border" style={hslToStyle(selectedTenant.primary_color)} />
                    <span className="text-sm">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full border" style={hslToStyle(selectedTenant.secondary_color)} />
                    <span className="text-sm">Secondary</span>
                  </div>
                </div>
              </div>

              {(selectedTenant.subscription_start || selectedTenant.subscription_end) && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Subscription Period</p>
                  <p className="text-sm font-medium">
                    {selectedTenant.subscription_start ? format(new Date(selectedTenant.subscription_start), 'MMM d, yyyy') : '—'}
                    {' → '}
                    {selectedTenant.subscription_end ? format(new Date(selectedTenant.subscription_end), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => toggleActive(selectedTenant)}>
                  {selectedTenant.is_active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button onClick={() => { setDetailOpen(false); openEdit(selectedTenant); }}>
                  <Pencil className="mr-2 h-4 w-4" /> Edit
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Color conversion helpers
function hslToHexHelper(hsl: string): string {
  const parts = hsl.split(' ').map(p => parseFloat(p));
  if (parts.length < 3) return '#3b82f6';
  const h = parts[0], s = parts[1] / 100, l = parts[2] / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHslHelper(hex: string): string {
  let r = 0, g = 0, b = 0;
  if (hex.length === 7) {
    r = parseInt(hex.slice(1, 3), 16) / 255;
    g = parseInt(hex.slice(3, 5), 16) / 255;
    b = parseInt(hex.slice(5, 7), 16) / 255;
  }
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
