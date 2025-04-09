'use client';

import { useEffect, useState } from 'react';
import { initMocks } from '@/mocks/init-mocks';
import { AuthProvider } from '@/lib/AuthContext';
import { GroupProvider } from '@/lib/GroupContext';
import {InputDataProvider} from "@/lib/InputDataContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== 'development');

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    const start = async () => {
      try {
        await initMocks();
        console.log('[MSW] worker started');
      } catch (err) {
        console.error('[MSW] failed to start', err);
      } finally {
        setReady(true);
      }
    };

    start();
  }, []);

  if (!ready) return null; // ⏳ block render until MSW is ready
  return (
      <AuthProvider>
        <GroupProvider>
          <InputDataProvider>{children}</InputDataProvider>
        </GroupProvider>
      </AuthProvider>
  );
}
