// tests/LoginStep.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import LoginStep from '@/components/steps/LoginStep';
import { vi, describe, expect, it, beforeEach } from 'vitest';
import { toast } from 'sonner';
import Providers from "@/components/Providers";
import {server} from "@/mocks/server";
import {http, HttpResponse} from "msw";
import {users} from "@/mocks/handlers/figshareHandlers";
import { loginWithFigShare } from '@/lib/auth';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock('@/lib/auth', () => ({
  loginWithFigShare: vi.fn(() =>
    Promise.resolve({token: 'mock-token', user: users[0]})
  ),
}));

describe('LoginStep', () => {
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    let firstCall = true;

    server.use(
      http.get('/api/me', () => {
        if (firstCall) {
          firstCall = false;
          return HttpResponse.json({ success: false, error: 'Not logged in' });
        }
        return HttpResponse.json({token: 'mock-token', user: users[0]});
      }),
    );
  });

  it('Logs in and out via AuthProvider', async () => {

    render(
      <Providers>
        <LoginStep onSuccessAction={mockOnSuccess} openByDefault />
      </Providers>
    );

    // Initial state: show login
    await waitFor(() => {
      expect(screen.getByText('Login with FigShare')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Login with FigShare'));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Logged in!');
      expect(mockOnSuccess).toHaveBeenCalled();
    });

    expect(screen.getAllByText(/Logged in as Mock User/)).toHaveLength(2);
    fireEvent.click(screen.getByText('Logout'));

    await waitFor(() => {
      expect(screen.getByText('Login with FigShare')).toBeInTheDocument();
    });
  });

  it('Handles login error', async () => {
    (loginWithFigShare as vi.Mock).mockRejectedValueOnce(new Error('Boom'));

    render(
      <Providers>
        <LoginStep onSuccessAction={mockOnSuccess} openByDefault />
      </Providers>
    );

    fireEvent.click(screen.getByText('Login with FigShare'));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Boom');
    });
  });
});