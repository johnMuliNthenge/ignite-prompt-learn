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

  // Apply dynamic theme colors
  useEffect(() => {
    if (settings) {
      const root = document.documentElement;
      root.style.setProperty('--primary', settings.primary_color);
      root.style.setProperty('--sidebar-ring', settings.primary_color);
      root.style.setProperty('--secondary', settings.secondary_color);
    }
  }, [settings]);

  return (
    <InstitutionContext.Provider value={{ settings, loading, refetch: fetchSettings }}>
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
