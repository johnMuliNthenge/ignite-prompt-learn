import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Save, TestTube, Eye, EyeOff } from 'lucide-react';
import { ProtectedPage } from '@/components/auth/ProtectedPage';

interface SmtpSettings {
  id: string;
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  encryption: 'tls' | 'ssl' | 'none';
  is_active: boolean;
}

const SmtpSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);

  const [formData, setFormData] = useState<Omit<SmtpSettings, 'id'>>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: '',
    encryption: 'tls',
    is_active: true,
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['smtp-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data as SmtpSettings | null;
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        host: settings.host,
        port: settings.port,
        username: settings.username,
        password: settings.password,
        from_email: settings.from_email,
        from_name: settings.from_name,
        encryption: settings.encryption as 'tls' | 'ssl' | 'none',
        is_active: settings.is_active,
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<SmtpSettings, 'id'>) => {
      if (settings?.id) {
        const { error } = await supabase
          .from('smtp_settings')
          .update(data)
          .eq('id', settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('smtp_settings')
          .insert({ ...data, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smtp-settings'] });
      toast({
        title: 'Settings Saved',
        description: 'SMTP settings have been saved successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast({
        title: 'Error',
        description: 'Please enter a test email address.',
        variant: 'destructive',
      });
      return;
    }

    setIsTesting(true);
    try {
      const { error } = await supabase.functions.invoke('send-test-email', {
        body: { to: testEmail },
      });

      if (error) throw error;

      toast({
        title: 'Test Email Sent',
        description: `A test email has been sent to ${testEmail}.`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to send test email.',
        variant: 'destructive',
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <ProtectedPage moduleCode="admin.smtp">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMTP Settings</h1>
          <p className="text-muted-foreground">
            Configure email server settings for sending system emails.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Server Configuration
              </CardTitle>
              <CardDescription>
                Enter your SMTP server details to enable email sending from the system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="host">SMTP Host *</Label>
                  <Input
                    id="host"
                    placeholder="smtp.example.com"
                    value={formData.host}
                    onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="port">SMTP Port *</Label>
                  <Input
                    id="port"
                    type="number"
                    placeholder="587"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 587 })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    placeholder="your-email@example.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from_email">From Email *</Label>
                  <Input
                    id="from_email"
                    type="email"
                    placeholder="noreply@example.com"
                    value={formData.from_email}
                    onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from_name">From Name *</Label>
                  <Input
                    id="from_name"
                    placeholder="System Notifications"
                    value={formData.from_name}
                    onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="encryption">Encryption</Label>
                  <Select
                    value={formData.encryption}
                    onValueChange={(value: 'tls' | 'ssl' | 'none') => 
                      setFormData({ ...formData, encryption: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select encryption" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tls">TLS</SelectItem>
                      <SelectItem value="ssl">SSL</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Enable SMTP</Label>
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Test Email Configuration
            </CardTitle>
            <CardDescription>
              Send a test email to verify your SMTP settings are working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="max-w-sm"
              />
              <Button 
                onClick={handleTestEmail} 
                disabled={isTesting || !settings}
                variant="outline"
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="mr-2 h-4 w-4" />
                )}
                Send Test Email
              </Button>
            </div>
            {!settings && (
              <p className="text-sm text-muted-foreground mt-2">
                Save your SMTP settings first before testing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedPage>
  );
};

export default SmtpSettings;
