import { render, screen, fireEvent } from '@testing-library/react';
import DirectoryPicker from '@/lib/DirectoryPicker';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('DirectoryPicker', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // @ts-expect-error mocking window API
    delete (window as never).showDirectoryPicker;
  });

  it('renders the default button label', () => {
    render(<DirectoryPicker onSelect={() => {}} />);
    expect(screen.getByText(/Select Root Directory/)).toBeInTheDocument();
  });

  it('calls onSelect and updates label when a directory is picked', async () => {
    const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle;
    const onSelect = vi.fn();
    // @ts-expect-error mocking window API
    (window as never).showDirectoryPicker = vi.fn().mockResolvedValue(mockHandle);

    render(<DirectoryPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Root Directory/ }));

    await screen.findByText(/Selected: my-folder/);
    expect(onSelect).toHaveBeenCalledWith(mockHandle);
  });

  it('shows an error if the API is not supported', async () => {
    render(<DirectoryPicker onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Root Directory/ }));
    expect(await screen.findByText(/not supported/)).toBeInTheDocument();
  });

  it('handles user cancel (AbortError) silently', async () => {
    // @ts-expect-error mocking window
    (window as never).showDirectoryPicker = vi.fn().mockRejectedValue(
      new DOMException('User canceled', 'AbortError')
    );
    const onSelect = vi.fn();
    render(<DirectoryPicker onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Root Directory/ }));
    expect(await screen.findByRole('button', { name: /Select Root Directory/ })).toBeInTheDocument();
    expect(screen.queryByText(/Could not open/)).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('handles other directory picker errors', async () => {
    // @ts-expect-error mocking window
    (window as never).showDirectoryPicker = vi.fn().mockRejectedValue(new Error('Disk I/O error'));
    render(<DirectoryPicker onSelect={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Root Directory/ }));
    expect(await screen.findByText(/Could not open directory picker/)).toBeInTheDocument();
  });
});
