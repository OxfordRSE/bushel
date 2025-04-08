'use client';

import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import StepPanel from '@/components/steps/StepPanel';

export default function LoginStep({
  onSuccessAction,
  openByDefault = true,
}: {
  onSuccessAction: () => void;
  openByDefault?: boolean;
}) {
  const { isLoggedIn, user, login, logout } = useAuth();

  const handleLogin = async () => {
    try {
      await login();
      toast.success('Logged in!');
      onSuccessAction();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    }
  };

  const summary = isLoggedIn ? (
    <span className="text-muted-foreground">
      Logged in as {user?.first_name} {user?.last_name}
    </span>
  ) : (
    <span>Login via FigShare</span>
  );

  return (
    <StepPanel
      title={summary}
      status={isLoggedIn ? 'complete' : 'default'}
      openByDefault={openByDefault}
    >
      {isLoggedIn ? (
        <div className="space-y-4 text-left">
          <p className="text-sm text-gray-700">
            Logged in as {user?.first_name} {user?.last_name}
          </p>
          <Button variant="destructive" onClick={logout}>
            Logout
          </Button>
        </div>
      ) : (
        <Button variant="outline" onClick={handleLogin}>
          Login with FigShare
        </Button>
      )}
    </StepPanel>
  );
}
