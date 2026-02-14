import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useInstitution } from '@/contexts/InstitutionContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Building2, Palette, MapPin, Upload } from 'lucide-react';

export default function AccountSetup() {
  const { isAdmin } = useAuth();
  const { settings, refetch } = useInstitution();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    institution_name: '',
    logo_url: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    phone: '',
    email: '',
    website: '',
    primary_color: '217 91% 60%',
    secondary_color: '210 40% 96.1%',
  });

  useEffect(() => {
    if (!isAdmin) {
      navigate('/lms/dashboard');
    }
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (settings) {
      setForm({
        institution_name: settings.institution_name || '',
        logo_url: settings.logo_url || '',
        address_line1: settings.address_line1 || '',
        address_line2: settings.address_line2 || '',
        city: settings.city || '',
        state: settings.state || '',
        country: settings.country || '',
        postal_code: settings.postal_code || '',
        phone: settings.phone || '',
        email: settings.email || '',
        website: settings.website || '',
        primary_color: settings.primary_color || '217 91% 60%',
        secondary_color: settings.secondary_color || '210 40% 96.1%',
      });
    }
  }, [settings]);

  const hslToHex = (hsl: string): string => {
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
  };

  const hexToHsl = (hex: string): string => {
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
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `institution-logo-${Date.now()}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('poe-files')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('poe-files')
        .getPublicUrl(filePath);

      setForm(prev => ({ ...prev, logo_url: publicUrl }));
      toast({ title: 'Logo uploaded successfully' });
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (settings?.id) {
        const { error } = await supabase
          .from('institution_settings')
          .update(form)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('institution_settings')
          .insert(form);
        if (error) throw error;
      }
      await refetch();
      toast({ title: 'Institution settings saved successfully' });
    } catch (error: any) {
      toast({ title: 'Error saving settings', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Account Setup</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your institution's identity and branding
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        {/* Institution Identity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>Institution Identity</CardTitle>
            </div>
            <CardDescription>Set your institution name and logo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="institution_name">Institution Name</Label>
              <Input
                id="institution_name"
                value={form.institution_name}
                onChange={(e) => setForm({ ...form, institution_name: e.target.value })}
                placeholder="e.g. Sunrise Academy"
              />
            </div>
            <div className="space-y-2">
              <Label>Institution Logo</Label>
              <div className="flex items-center gap-4">
                {form.logo_url && (
                  <img
                    src={form.logo_url}
                    alt="Institution logo"
                    className="h-16 w-16 rounded-lg object-contain border"
                  />
                )}
                <div>
                  <label htmlFor="logo-upload">
                    <Button variant="outline" asChild disabled={uploading}>
                      <span>
                        {uploading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="mr-2 h-4 w-4" />
                        )}
                        {uploading ? 'Uploading...' : 'Upload Logo'}
                      </span>
                    </Button>
                  </label>
                  <input
                    id="logo-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">PNG, JPG up to 2MB</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://"
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle>Address</CardTitle>
            </div>
            <CardDescription>Institution physical address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="address_line1">Address Line 1</Label>
              <Input
                id="address_line1"
                value={form.address_line1}
                onChange={(e) => setForm({ ...form, address_line1: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_line2">Address Line 2</Label>
              <Input
                id="address_line2"
                value={form.address_line2}
                onChange={(e) => setForm({ ...form, address_line2: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State/Province</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  value={form.postal_code}
                  onChange={(e) => setForm({ ...form, postal_code: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Branding Colors */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Branding Colors</CardTitle>
            </div>
            <CardDescription>
              Set your institution's primary and secondary colors. These will be applied across the entire system.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label>Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(form.primary_color)}
                    onChange={(e) =>
                      setForm({ ...form, primary_color: hexToHsl(e.target.value) })
                    }
                    className="h-10 w-14 cursor-pointer rounded border-0"
                  />
                  <div
                    className="h-10 flex-1 rounded-md border"
                    style={{ backgroundColor: `hsl(${form.primary_color})` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for buttons, links, navbar, and active elements
                </p>
              </div>
              <div className="space-y-3">
                <Label>Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={hslToHex(form.secondary_color)}
                    onChange={(e) =>
                      setForm({ ...form, secondary_color: hexToHsl(e.target.value) })
                    }
                    className="h-10 w-14 cursor-pointer rounded border-0"
                  />
                  <div
                    className="h-10 flex-1 rounded-md border"
                    style={{ backgroundColor: `hsl(${form.secondary_color})` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for backgrounds, hover states, and accents
                </p>
              </div>
            </div>

            <Separator />

            {/* Preview */}
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-lg border p-4 space-y-3">
                <div
                  className="h-10 rounded-md flex items-center px-4 text-sm font-medium"
                  style={{
                    backgroundColor: `hsl(${form.primary_color})`,
                    color: 'white',
                  }}
                >
                  {form.institution_name || 'Institution Name'} — Navigation Bar
                </div>
                <div className="flex gap-3">
                  <button
                    className="px-4 py-2 rounded-md text-sm font-medium text-white"
                    style={{ backgroundColor: `hsl(${form.primary_color})` }}
                  >
                    Primary Button
                  </button>
                  <button
                    className="px-4 py-2 rounded-md text-sm font-medium border"
                    style={{
                      backgroundColor: `hsl(${form.secondary_color})`,
                      borderColor: `hsl(${form.primary_color})`,
                      color: `hsl(${form.primary_color})`,
                    }}
                  >
                    Secondary Button
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Institution Settings
        </Button>
      </div>
    </div>
  );
}
