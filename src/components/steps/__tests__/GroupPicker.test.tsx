// tests/GroupPicker.test.tsx
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import GroupPicker from '@/components/steps/GroupPicker';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import Providers from '@/components/Providers';
import { server } from '@/mocks/server';
import { http, HttpResponse } from 'msw';
import {groups, users} from '@/mocks/handlers/figshareHandlers';
import {act} from "react";

const group = groups[0];

describe('GroupPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    server.use(
      http.get('/api/me', () => HttpResponse.json({
        token: 'mock-token',
        user: users[0],
      }))
    );
  });

  it('lists groups and calls onSelect when a group is clicked', async () => {
    const onSelect = vi.fn();
    render(
      <Providers>
        <GroupPicker openByDefault onSelect={onSelect} />
      </Providers>
    );

    const groupButton = await screen.findByRole('button', { name: new RegExp(`ID: ${group.id}`) });
    fireEvent.click(groupButton);

    await waitFor(() => {
      expect(onSelect).toHaveBeenCalled();
    });

    expect(screen.getByText(`Selected group: ${group.name}`)).toBeInTheDocument();
    expect(screen.getAllByText(`ID: ${group.id}`).length).toBe(2);
    expect(screen.getByText(`Group: ${group.name}`)).toBeInTheDocument();
  });

  it('filters groups by search', async () => {
    render(
      <Providers>
        <GroupPicker openByDefault />
      </Providers>
    );

    await waitFor(() => {
      expect(screen.findByText(`ID: ${group.id}`));
      expect(screen.queryByText(`ID: ${groups[100].id}`)).not.toBeInTheDocument();
    });

    await screen.findByText(`ID: ${group.id}`);
    fireEvent.change(screen.getByPlaceholderText(/archaeology/i), {
      target: { value: groups[100].name },
    });

    await waitFor(() => {
      expect(screen.getByText(`ID: ${groups[100].id}`)).toBeInTheDocument();
      expect(screen.queryByText(`ID: ${group.id}`)).not.toBeInTheDocument();
    });
  });

it('paginates groups correctly', async () => {
  render(
    <Providers>
      <GroupPicker openByDefault />
    </Providers>
  );

  // Verify initial state
  expect(await screen.findByText(`ID: ${groups[0].id}`)).toBeInTheDocument();
  expect(screen.queryByText(`ID: ${groups[21].id}`)).not.toBeInTheDocument();
  expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();

  // Click "Next" and wait for page 2 to appear
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
  });

  expect(await screen.findByText(`ID: ${groups[21].id}`)).toBeInTheDocument();
  expect(screen.queryByText(`ID: ${groups[0].id}`)).not.toBeInTheDocument();
  expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
});
});