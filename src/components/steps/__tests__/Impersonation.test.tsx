// tests/Impersonation.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Impersonation from '@/components/steps/Impersonation';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import Providers from '@/components/Providers';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { users } from '@/mocks/handlers/figshareHandlers';

describe('Impersonation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/me', () => HttpResponse.json({
        token: 'mock-token',
        user: users[0],
      }))
    );
  });

  it('renders and lets you impersonate someone', async () => {
    render(
      <Providers>
        <Impersonation openByDefault />
      </Providers>
    );

    // Wait for users to load
    await waitFor(() => {
      expect(screen.getByText(`${users[0].first_name} ${users[0].last_name}`)).toBeInTheDocument();
    });

    // Click a user
    fireEvent.click(screen.getByText(`${users[1].first_name} ${users[1].last_name}`));

    // Confirm impersonation message
    await waitFor(() => {
      expect(screen.getByText(`Stop impersonating ${users[1].first_name} ${users[1].last_name}`)).toBeInTheDocument();
    });

    // Click to stop impersonating
    fireEvent.click(screen.getByText(/Stop impersonating/));

    // Expect summary to return to normal
    await waitFor(() => {
      expect(screen.getByText(/Acting as myself/)).toBeInTheDocument();
    });
  });

  it('filters users by email', async () => {
    render(
      <Providers>
        <Impersonation openByDefault />
      </Providers>
    );

    fireEvent.change(screen.getByPlaceholderText(/user@example.com/), {
      target: { value: users[1].email }
    });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(users[1].first_name))).toBeInTheDocument();
    });
  });
});
