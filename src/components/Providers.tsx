'use client';

import { useEffect, useState } from 'react';
import { initMocks } from '@/mocks/init-mocks';
import { AuthProvider } from '@/lib/AuthContext';
import { GroupProvider } from '@/lib/GroupContext';
import {InputDataProvider} from "@/lib/InputDataContext";
import { UploadDataProvider } from '@/lib/UploadDataContext';
import {QueryClient} from "@tanstack/query-core";
import {QueryClientProvider} from "@tanstack/react-query";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== 'development');
  const queryClient = new QueryClient()

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
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <GroupProvider>
            <InputDataProvider>
              <UploadDataProvider>{children}</UploadDataProvider>
            </InputDataProvider>
          </GroupProvider>
        </AuthProvider>
      </QueryClientProvider>
  );
}
