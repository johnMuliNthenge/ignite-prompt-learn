import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

interface InstitutionSettings {
  id: string;
  institution_name: string;
  logo_url: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  primary_color: string;
  secondary_color: string;
}

interface InstitutionContextType {
  settings: InstitutionSettings | null;
  loading: boolean;
  refetch: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
}

const InstitutionContext = createContext<InstitutionContextType | undefined>(undefined);

export function InstitutionProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('institution_settings')
      .select('*')
      .limit(1)
      .single();

    if (data) {
      setSettings(data as InstitutionSettings);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchSettings();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Helper: darken/lighten an HSL string
  const adjustLightness = (hsl: string, amount: number): string => {
    const parts = hsl.match(/([\d.]+)\s+([\d.]+)%\s+([\d.]+)%/);
    if (!parts) return hsl;
    const h = parts[1], s = parts[2];
    const l = Math.max(0, Math.min(100, parseFloat(parts[3]) + amount));
    return `${h} ${s}% ${l}%`;
  };

  // Apply dynamic theme colors
  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      // Primary
      root.style.setProperty('--primary', settings.primary_color);
      root.style.setProperty('--ring', settings.primary_color);

      // Secondary
      root.style.setProperty('--secondary', settings.secondary_color);
      root.style.setProperty('--accent', settings.secondary_color);

      // Sidebar — use primary as sidebar background with white text
      root.style.setProperty('--sidebar-background', adjustLightness(settings.primary_color, -5));
      root.style.setProperty('--sidebar-foreground', '0 0% 98%');
      root.style.setProperty('--sidebar-primary', '0 0% 100%');
      root.style.setProperty('--sidebar-primary-foreground', settings.primary_color);
      root.style.setProperty('--sidebar-accent', adjustLightness(settings.primary_color, 5));
      root.style.setProperty('--sidebar-accent-foreground', '0 0% 98%');
      root.style.setProperty('--sidebar-border', adjustLightness(settings.primary_color, 10));
      root.style.setProperty('--sidebar-ring', settings.primary_color);
    }
  }, [settings]);

  const switchTenant = async (tenantId: string) => {
    const { data } = await supabase
      .from('institution_settings')
      .select('*')
      .eq('id', tenantId)
      .single();
    if (data) {
      setSettings(data as InstitutionSettings);
    }
  };

  return (
    <InstitutionContext.Provider value={{ settings, loading, refetch: fetchSettings, switchTenant }}>
      {children}
    </InstitutionContext.Provider>
  );
}

export function useInstitution() {
  const context = useContext(InstitutionContext);
  if (context === undefined) {
    throw new Error('useInstitution must be used within an InstitutionProvider');
  }
  return context;
}
