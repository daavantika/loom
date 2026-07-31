import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhotoUpload from './PhotoUpload';
import * as uploadLib from '../lib/upload';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function makeFile(name = 'kitchen.jpg', type = 'image/jpeg') {
  return new File(['fake-bytes'], name, { type });
}

describe('PhotoUpload', () => {
  it('uploads the selected file and reports the resulting URL', async () => {
    const uploadSpy = vi.spyOn(uploadLib, 'uploadFile').mockResolvedValue('https://api.loom.test/uploads/abc.jpg');
    const onUploaded = vi.fn();
    const user = userEvent.setup();

    render(<PhotoUpload label="+ Add kitchen photo" onUploaded={onUploaded} />);

    const input = screen.getByLabelText('+ Add kitchen photo', { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, makeFile());

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith('https://api.loom.test/uploads/abc.jpg'));
    expect(uploadSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+ Add kitchen photo')).toBeInTheDocument();
  });

  it('shows an uploading state while in flight, then clears it', async () => {
    let resolveUpload!: (url: string) => void;
    vi.spyOn(uploadLib, 'uploadFile').mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUpload = resolve;
      }),
    );
    const user = userEvent.setup();

    render(<PhotoUpload label="+ Add kitchen photo" onUploaded={vi.fn()} />);

    const input = screen.getByLabelText('+ Add kitchen photo', { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, makeFile());

    await waitFor(() => expect(screen.getByText('Uploading…')).toBeInTheDocument());
    resolveUpload('https://api.loom.test/uploads/abc.jpg');
    await waitFor(() => expect(screen.getByText('+ Add kitchen photo')).toBeInTheDocument());
  });

  it('shows an error message and does not call onUploaded when the upload fails', async () => {
    vi.spyOn(uploadLib, 'uploadFile').mockRejectedValue(new Error('File too large'));
    const onUploaded = vi.fn();
    const user = userEvent.setup();

    render(<PhotoUpload label="+ Add kitchen photo" onUploaded={onUploaded} />);

    const input = screen.getByLabelText('+ Add kitchen photo', { selector: 'input' }) as HTMLInputElement;
    await user.upload(input, makeFile());

    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('File too large'));
    expect(onUploaded).not.toHaveBeenCalled();
  });
});
