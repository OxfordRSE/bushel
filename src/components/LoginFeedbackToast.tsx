'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { toast } from 'sonner';

export default function LoginFeedbackToast() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'oauth') {
      toast.error('OAuth login failed. Please try again.');
    }
  }, [searchParams]);

  return null;
}
