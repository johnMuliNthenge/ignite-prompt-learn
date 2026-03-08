import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

export default function LibrarySettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchSettings(); }, []);

  const fetchSettings = async () => {
    const { data } = await supabase.from('library_settings').select('*').order('setting_key');
    setSettings((data as any[]) || []);
    setLoading(false);
  };

  const updateSetting = async (id: string, value: string) => {
    const { error } = await supabase.from('library_settings').update({ setting_value: value }).eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Setting updated');
  };

  return (
    <ProtectedPage moduleCode="library.settings" title="Library Settings">
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Library Settings</h1>
        <p className="text-muted-foreground">Configure library fine rates and policies</p>

        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Setting</TableHead><TableHead>Description</TableHead><TableHead>Value</TableHead><TableHead>Action</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {settings.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.setting_key}</TableCell>
                  <TableCell>{s.description || '-'}</TableCell>
                  <TableCell>
                    <Input className="w-32" defaultValue={s.setting_value}
                      onBlur={e => { if (e.target.value !== s.setting_value) updateSetting(s.id, e.target.value); }} />
                  </TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => {
                    const input = document.querySelector(`input[value="${s.setting_value}"]`) as HTMLInputElement;
                    if (input) updateSetting(s.id, input.value);
                  }}>Save</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </div>
    </ProtectedPage>
  );
}
