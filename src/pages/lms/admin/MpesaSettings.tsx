import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Save, Phone, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

interface MpesaSettings {
  id: string;
  consumer_key: string;
  consumer_secret: string;
  business_short_code: string;
  passkey: string;
  callback_url: string | null;
  environment: 'sandbox' | 'production';
  is_active: boolean;
}

export default function MpesaSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MpesaSettings | null>(null);
  const [formData, setFormData] = useState({
    consumer_key: '',
    consumer_secret: '',
    business_short_code: '',
    passkey: '',
    callback_url: '',
    environment: 'sandbox' as 'sandbox' | 'production',
    is_active: false,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('mpesa_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching M-Pesa settings:', error);
      }

      if (data) {
        setSettings(data as MpesaSettings);
        setFormData({
          consumer_key: data.consumer_key || '',
          consumer_secret: data.consumer_secret || '',
          business_short_code: data.business_short_code || '',
          passkey: data.passkey || '',
          callback_url: data.callback_url || '',
          environment: (data.environment as 'sandbox' | 'production') || 'sandbox',
          is_active: data.is_active || false,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.consumer_key || !formData.consumer_secret || !formData.business_short_code || !formData.passkey) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      if (settings?.id) {
        // Update existing settings
        const { error } = await supabase
          .from('mpesa_settings')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) throw error;
        toast.success('M-Pesa settings updated successfully');
      } else {
        // Create new settings
        const { error } = await supabase
          .from('mpesa_settings')
          .insert({
            ...formData,
            created_by: user?.id,
          });

        if (error) throw error;
        toast.success('M-Pesa settings saved successfully');
      }

      fetchSettings();
    } catch (error: any) {
      console.error('Error saving M-Pesa settings:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.consumer_key || !formData.consumer_secret) {
      toast.error('Please enter Consumer Key and Consumer Secret first');
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke('mpesa-stk-push', {
        body: {
          action: 'test_connection',
          consumer_key: formData.consumer_key,
          consumer_secret: formData.consumer_secret,
          environment: formData.environment,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast.success('Connection successful! M-Pesa API is accessible.');
      } else {
        toast.error(data?.error || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Connection test failed:', error);
      toast.error(error.message || 'Failed to test connection');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedPage moduleCode="admin.mpesa">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">M-Pesa Integration</h1>
          <p className="text-muted-foreground">
            Configure M-Pesa Daraja API for mobile payments
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5" />
                      API Credentials
                    </CardTitle>
                    <CardDescription>
                      Enter your Safaricom Daraja API credentials
                    </CardDescription>
                  </div>
                  <Badge variant={formData.is_active ? 'default' : 'secondary'}>
                    {formData.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="consumer_key">Consumer Key *</Label>
                    <Input
                      id="consumer_key"
                      type="password"
                      value={formData.consumer_key}
                      onChange={(e) => setFormData({ ...formData, consumer_key: e.target.value })}
                      placeholder="Enter Consumer Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="consumer_secret">Consumer Secret *</Label>
                    <Input
                      id="consumer_secret"
                      type="password"
                      value={formData.consumer_secret}
                      onChange={(e) => setFormData({ ...formData, consumer_secret: e.target.value })}
                      placeholder="Enter Consumer Secret"
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="business_short_code">Business Short Code (Paybill) *</Label>
                    <Input
                      id="business_short_code"
                      value={formData.business_short_code}
                      onChange={(e) => setFormData({ ...formData, business_short_code: e.target.value })}
                      placeholder="e.g., 174379"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="passkey">Passkey *</Label>
                    <Input
                      id="passkey"
                      type="password"
                      value={formData.passkey}
                      onChange={(e) => setFormData({ ...formData, passkey: e.target.value })}
                      placeholder="Enter Passkey"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="callback_url">Callback URL (Optional)</Label>
                  <Input
                    id="callback_url"
                    value={formData.callback_url}
                    onChange={(e) => setFormData({ ...formData, callback_url: e.target.value })}
                    placeholder="https://your-domain.com/api/mpesa/callback"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL where M-Pesa will send payment confirmation. Leave blank to use default.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="environment">Environment</Label>
                    <Select
                      value={formData.environment}
                      onValueChange={(value: 'sandbox' | 'production') =>
                        setFormData({ ...formData, environment: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                        <SelectItem value="production">Production (Live)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Enable M-Pesa Payments</Label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Settings
                  </Button>
                  <Button variant="outline" onClick={handleTestConnection} disabled={saving}>
                    Test Connection
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Setup Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2">
                  <h4 className="font-medium">1. Register on Daraja</h4>
                  <p className="text-muted-foreground">
                    Visit{' '}
                    <a
                      href="https://developer.safaricom.co.ke"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      developer.safaricom.co.ke
                    </a>{' '}
                    and create an account.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">2. Create an App</h4>
                  <p className="text-muted-foreground">
                    Create a new app and select Lipa Na M-Pesa Online (STK Push) API.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">3. Get Credentials</h4>
                  <p className="text-muted-foreground">
                    Copy your Consumer Key and Consumer Secret from the app dashboard.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">4. Go Live</h4>
                  <p className="text-muted-foreground">
                    After testing, apply for production credentials and switch to Production environment.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  {settings?.consumer_key ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">API Credentials</span>
                </div>
                <div className="flex items-center gap-2">
                  {settings?.business_short_code ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Business Short Code</span>
                </div>
                <div className="flex items-center gap-2">
                  {settings?.is_active ? (
                    <CheckCircle className="h-4 w-4 text-primary" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="text-sm">Integration Active</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedPage>
  );
}
