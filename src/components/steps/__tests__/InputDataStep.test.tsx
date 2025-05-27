import { render, screen, fireEvent } from '@testing-library/react';
import InputDataStep from '@/components/steps/InputDataStep';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import Providers from '@/components/Providers';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import { groups, users } from '@/mocks/handlers/figshareHandlers';
import { useEffect } from 'react';
import { FigshareGroup } from '@/lib/types/figshare-api';
import { useGroup } from '@/lib/GroupContext';

function MockProviderData({ group, children, timeout }: { group: FigshareGroup | null; children: React.ReactNode, timeout?: number }) {
  const { setGroup } = useGroup();
  useEffect(() => {
    if (timeout) {
      setTimeout(() => {
        setGroup(group);
      }, timeout);
    } else
      setGroup(group);
  }, [group, setGroup, timeout]);
  return <div>{children}</div>;
}

describe('InputDataStep', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/me', () =>
        HttpResponse.json({
          token: 'mock-token',
          user: users[0],
        })
      )
    );
  });

  it('renders with group context and default message', async () => {
    render(
      <Providers>
        <MockProviderData group={groups[0]}>
          <InputDataStep openByDefault />
        </MockProviderData>
      </Providers>
    );

    expect(await screen.findByText(/upload an excel file/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check file/i })).toBeDisabled();
  });

  it('shows advanced options when toggled', async () => {
    render(
      <Providers>
        <MockProviderData group={groups[0]}>
          <InputDataStep openByDefault />
        </MockProviderData>
      </Providers>
    );

    const toggleButton = screen.getByRole('button', { name: /advanced options/i });
    fireEvent.click(toggleButton);

    expect(await screen.findByText(/validation will halt/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/max warnings/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/keywords max/i)).toBeInTheDocument();
  });

  it('shows checks list when toggled', async () => {
    render(
      <Providers>
        <MockProviderData group={groups[0]}>
          <InputDataStep openByDefault />
        </MockProviderData>
      </Providers>
    );

    const toggleButton = screen.getByRole('button', { name: /checks list/i });
    fireEvent.click(toggleButton);

    expect(await screen.findByText(/checks will be run/i)).toBeInTheDocument();
    expect(screen.getByText(/spreadsheet structure/i)).toBeInTheDocument();
    expect(screen.getByText(/file references/i)).toBeInTheDocument();
  });

});
